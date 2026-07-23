import os
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.auth import get_current_user
from app.models import User, Document
from app.crud import get_chat_session
from app.schemas import DocumentResponse
from app.services.rag_service import index_document, delete_document_vectors

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    session_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Verify session ownership
    session = get_chat_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    # Read with size limit
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large (max {MAX_FILE_SIZE // (1024 * 1024)}MB)")

    # Sanitize filename
    safe_filename = os.path.basename(file.filename)
    safe_name = f"{uuid.uuid4().hex}_{safe_filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        user_id=current_user.id,
        session_id=session_id,
        filename=safe_filename,
        content_type=file.content_type or "application/octet-stream",
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Index synchronously using a fresh session so the request-scoped one
    # isn't accessed from a background thread after it is closed.
    fresh_db = SessionLocal()
    try:
        chunk_count = index_document(doc.id, file_path, doc.content_type, current_user.id, session_id, fresh_db)
        doc.status = "ready"
        doc.chunk_count = chunk_count
        fresh_db.commit()
    except Exception:
        logger.exception("Document indexing failed for doc %s", doc.id)
        doc.status = "error"
        fresh_db.rollback()
    finally:
        fresh_db.close()

    return doc


@router.get("")
def list_documents(
    session_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Document).filter(Document.user_id == current_user.id)
    if session_id is not None:
        q = q.filter(Document.session_id == session_id)
    return q.order_by(Document.created_at.desc()).all()


@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    delete_document_vectors(doc.id, current_user.id)
    db.delete(doc)
    db.commit()
    return {"ok": True}
