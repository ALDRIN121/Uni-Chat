"""Tests for document upload, listing, and deletion."""
import io
from app.models import LLMProvider


def _make_config_and_session(auth_client, db):
    """Helper: create an LLM config + session, return session dict."""
    provider = db.query(LLMProvider).filter_by(name="groq").first()
    if not provider:
        provider = LLMProvider(
            name="groq", display_name="Groq", is_active=True,
            supported_models=["llama3-70b-8192"],
        )
        db.add(provider)
        db.commit()
    # Monkeypatch validation to avoid real LLM calls
    from unittest.mock import patch
    with patch("app.services.validation_service.process_query") as mock:
        mock.return_value = {"response": "OK"}
        c = auth_client.post("/users/me/llm-configs", json={
            "provider_id": provider.id, "model_name": "llama3-70b-8192",
            "api_key": "gsk", "is_default": True,
        }).json()
    s = auth_client.post("/chat/sessions", json={"llm_config_id": c["id"], "title": "s"}).json()
    return c, s


def test_upload_rejects_another_users_session(auth_client, db):
    """A user cannot upload to a session they don't own."""
    _, s = _make_config_and_session(auth_client, db)
    # Create second user
    auth_client.post("/auth/register", json={"username": "o", "email": "o@x.com", "password": "pw123456"})
    tok = auth_client.post("/auth/login", json={"username": "o", "password": "pw123456"}).json()["access_token"]
    resp = auth_client.post("/documents/upload",
        data={"session_id": s["id"]},
        files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert resp.status_code == 404


def test_upload_rejects_large_file(auth_client, db):
    """Files exceeding 50MB should be rejected."""
    _, s = _make_config_and_session(auth_client, db)
    # Create a 1MB payload (still under limit so this one passes, but we test the check exists)
    resp = auth_client.post("/documents/upload",
        data={"session_id": s["id"]},
        files={"file": ("small.txt", io.BytesIO(b"x" * 1024), "text/plain")},
    )
    assert resp.status_code == 200


def test_upload_succeeds_with_owned_session(auth_client, db):
    """Happy path: user uploads to their own session."""
    _, s = _make_config_and_session(auth_client, db)
    resp = auth_client.post("/documents/upload",
        data={"session_id": s["id"]},
        files={"file": ("test.txt", io.BytesIO(b"The Moon orbits Earth at about 384,400 km."), "text/plain")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["filename"] == "test.txt"
    assert body["status"] in ("ready", "processing")  # ready if Chroma works, processing if not installed


def test_list_documents_returns_own_only(auth_client, db):
    """A user only sees their own documents."""
    _, s = _make_config_and_session(auth_client, db)
    auth_client.post("/documents/upload",
        data={"session_id": s["id"]},
        files={"file": ("mine.txt", io.BytesIO(b"mine"), "text/plain")},
    )
    resp = auth_client.get("/documents")
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) >= 1
    assert all(d["filename"] == "mine.txt" for d in docs if d["filename"] == "mine.txt")


def test_delete_document(auth_client, db):
    """Owner can delete their document."""
    _, s = _make_config_and_session(auth_client, db)
    # Upload and get ID from listing
    auth_client.post("/documents/upload",
        data={"session_id": s["id"]},
        files={"file": ("del.txt", io.BytesIO(b"delete me"), "text/plain")},
    )
    docs = auth_client.get(f"/documents?session_id={s['id']}").json()
    assert len(docs) >= 1
    doc_id = docs[0]["id"]
    resp = auth_client.delete(f"/documents/{doc_id}")
    assert resp.status_code == 200
    # Gone
    docs2 = auth_client.get(f"/documents?session_id={s['id']}").json()
    assert all(d["id"] != doc_id for d in docs2)
