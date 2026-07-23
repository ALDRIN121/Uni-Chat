"""Tests for security hardening: SECRET_KEY guard, error leakage prevention."""
import pytest
from unittest.mock import patch


def test_secret_key_guard_rejects_default():
    """startup_event() should raise if SECRET_KEY is the well-known default."""
    from app.core.config import settings
    from app.main import startup_event, init_db
    old = settings.SECRET_KEY
    try:
        settings.SECRET_KEY = "dev-only-insecure-change-me"
        with pytest.raises(RuntimeError, match="insecure default"):
            startup_event()
    finally:
        settings.SECRET_KEY = old


def test_chat_ws_error_does_not_leak_internals(auth_client, db, monkeypatch):
    """WS errors should return generic message, not internal paths/stack traces."""
    from app.models import LLMProvider
    from starlette.websockets import WebSocketDisconnect

    provider = db.query(LLMProvider).filter_by(name="groq").first()
    if not provider:
        provider = LLMProvider(name="groq", display_name="Groq", is_active=True, supported_models=["m"])
        db.add(provider); db.commit()

    with patch("app.routers.users.validate_api_key", return_value={"valid": True, "model_tested": "m", "message": "ok"}):
        c = auth_client.post("/users/me/llm-configs", json={
            "provider_id": provider.id, "model_name": "m", "api_key": "k", "is_default": True,
        }).json()

    sid = auth_client.post("/chat/sessions", json={"llm_config_id": c["id"]}).json()["id"]

    with patch("app.routers.chat.process_query_stream") as mock:
        mock.side_effect = RuntimeError("file:///secret/path/api_keys.txt")

        try:
            with auth_client.websocket_connect(f"/ws/chat/{sid}?token={auth_client.token}") as ws:
                ws.send_json({"message": "hi"})
                while True:
                    frame = ws.receive_json()
                    if frame.get("error"):
                        # Must be generic — no internal paths leaked
                        err = str(frame["error"])
                        assert "file://" not in err, f"Leaked path: {err}"
                        assert "secret" not in err, f"Leaked secret: {err}"
                        assert err == "An internal error occurred"
                        break
                    if frame.get("end"):
                        break
        except WebSocketDisconnect:
            pass
