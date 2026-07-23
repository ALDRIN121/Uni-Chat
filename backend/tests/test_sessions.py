from unittest.mock import patch
from app.models import LLMProvider


def _make_session(auth_client, db, title="Test Session"):
    """Helper: create an LLM config + session and return the session dict."""
    provider = db.query(LLMProvider).filter_by(name="groq").first()
    if not provider:
        provider = LLMProvider(
            name="groq", display_name="Groq", is_active=True,
            supported_models=["llama3-70b-8192"],
        )
        db.add(provider)
        db.commit()

    with patch("app.services.validation_service.process_query") as mock:
        mock.return_value = {"response": "OK"}
        c = auth_client.post("/users/me/llm-configs", json={
            "provider_id": provider.id,
            "model_name": "llama3-70b-8192",
            "api_key": "gsk_test",
        }).json()
    s = auth_client.post("/chat/sessions", json={"llm_config_id": c["id"], "title": title}).json()
    return s


def test_rename_session_owner(auth_client, db):
    s = _make_session(auth_client, db, "original")
    resp = auth_client.patch(f"/chat/sessions/{s['id']}", json={"title": "renamed"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "renamed"


def test_rename_session_wrong_user(auth_client, db):
    s = _make_session(auth_client, db)
    auth_client.post("/auth/register", json={"username": "other", "email": "o@x.com", "password": "pw123456"})
    tok = auth_client.post("/auth/login", json={"username": "other", "password": "pw123456"}).json()["access_token"]
    resp = auth_client.patch(f"/chat/sessions/{s['id']}", json={"title": "stolen"}, headers={"Authorization": f"Bearer {tok}"})
    assert resp.status_code == 404


def test_delete_session_owner(auth_client, db):
    s = _make_session(auth_client, db)
    resp = auth_client.delete(f"/chat/sessions/{s['id']}")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}
    # Verify gone
    resp2 = auth_client.get(f"/chat/sessions/{s['id']}/messages")
    assert resp2.status_code == 404


def test_delete_session_wrong_user(auth_client, db):
    s = _make_session(auth_client, db)
    auth_client.post("/auth/register", json={"username": "other2", "email": "o2@x.com", "password": "pw123456"})
    tok = auth_client.post("/auth/login", json={"username": "other2", "password": "pw123456"}).json()["access_token"]
    resp = auth_client.delete(f"/chat/sessions/{s['id']}", headers={"Authorization": f"Bearer {tok}"})
    assert resp.status_code == 404
