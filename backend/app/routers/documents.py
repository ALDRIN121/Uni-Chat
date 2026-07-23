import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models import User, Document
from app.schemas import DocumentResponse
from app.services.rag_service import index_document, delete_document_vectors

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        user_id=current_user.id,
        session_id=session_id,
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(
        index_document, doc.id, file_path, doc.content_type, current_user.id, session_id, db
    )

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
