"""RAG service: document indexing and retrieval using local embeddings + Chroma."""
import os
import uuid
from typing import List

from app.models import Document as DocumentModel
from sqlalchemy.orm import Session


# Lazy-loaded singletons — instantiated on first use so tests can monkeypatch
_chroma_client = None
_embeddings = None
COLLECTION_PREFIX = "user_"


def _get_chroma():
    global _chroma_client
    if _chroma_client is None:
        import chromadb
        _chroma_client = chromadb.PersistentClient(path=os.path.join(os.getcwd(), "chroma_db"))
    return _chroma_client


def _get_embeddings():
    global _embeddings
    if _embeddings is None:
        from chromadb.utils import embedding_functions
        _embeddings = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
    return _embeddings


def _collection_name(user_id: int) -> str:
    return f"{COLLECTION_PREFIX}{user_id}"


def parse_document(file_path: str, content_type: str) -> str:
    """Extract text from a document file. Supports PDF, plain text, and markdown."""
    if content_type == "application/pdf":
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    # Default: plain text / markdown
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def index_document(doc_id: int, file_path: str, content_type: str, user_id: int, session_id: int, db: Session) -> int:
    """Parse a document, chunk it, embed and store in Chroma. Returns chunk count."""
    try:
        text = parse_document(file_path, content_type)
        if not text.strip():
            raise ValueError("Empty document")

        from langchain_text_splitters import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = splitter.split_text(text)

        chroma = _get_chroma()
        emb = _get_embeddings()
        collection = chroma.get_or_create_collection(
            name=_collection_name(user_id), embedding_function=emb,
        )

        ids = [f"doc{doc_id}_chunk{i}" for i in range(len(chunks))]
        metadatas = [{"document_id": doc_id, "session_id": session_id, "chunk_index": i} for i in range(len(chunks))]
        collection.add(ids=ids, documents=chunks, metadatas=metadatas)

        doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
        if doc:
            doc.status = "ready"
            doc.chunk_count = len(chunks)
            db.commit()

        return len(chunks)
    except Exception:
        doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
        if doc:
            doc.status = "error"
            db.commit()
        raise


def retrieve(query: str, user_id: int, session_id: int, k: int = 4) -> List[dict]:
    """Retrieve top-k chunks for a query, filtered to a session."""
    chroma = _get_chroma()
    emb = _get_embeddings()
    collection = chroma.get_or_create_collection(
        name=_collection_name(user_id), embedding_function=emb,
    )
    results = collection.query(
        query_texts=[query],
        n_results=k,
        where={"session_id": session_id},
    )
    out = []
    if results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            out.append({
                "text": results["documents"][0][i] if results["documents"] else "",
                "document_id": results["metadatas"][0][i].get("document_id") if results["metadatas"] else None,
                "chunk_index": results["metadatas"][0][i].get("chunk_index") if results["metadatas"] else None,
                "score": results["distances"][0][i] if results.get("distances") else None,
            })
    return out


def delete_document_vectors(doc_id: int, user_id: int):
    """Remove a document's vectors from Chroma."""
    chroma = _get_chroma()
    emb = _get_embeddings()
    collection = chroma.get_or_create_collection(
        name=_collection_name(user_id), embedding_function=emb,
    )
    # Delete all chunks for this document
    try:
        results = collection.get(where={"document_id": doc_id})
        if results["ids"]:
            collection.delete(ids=results["ids"])
    except Exception:
        pass  # Collection might not exist yet
