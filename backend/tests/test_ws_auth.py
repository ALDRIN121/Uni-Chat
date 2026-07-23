import pytest
from starlette.websockets import WebSocketDisconnect

from app.models import LLMProvider


async def _fake_process_query_stream(*args, **kwargs):
    """Stand-in for app.routers.chat.process_query_stream: yields one canned
    token so WS tests never hit a real LLM provider."""
    yield "Hello"


def _fake_validate_api_key(*args, **kwargs):
    """Fake that always returns valid so config creation doesn't hit a real LLM."""
    return {"valid": True, "model_tested": args[1] if len(args) > 1 else "test", "message": "ok"}


async def _async_fake_validate(*args, **kwargs):
    return _fake_validate_api_key(*args, **kwargs)


def test_ws_rejects_without_token(client):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws/chat/1") as ws:
            ws.receive_json()
    assert exc_info.value.code == 1008


def test_ws_rejects_session_owned_by_another_user(auth_client, db, monkeypatch):
    monkeypatch.setattr(
        "app.routers.users.validate_api_key", _async_fake_validate,
    )
    # auth_client (test_user) owns the session.
    provider = db.query(LLMProvider).filter_by(name="groq").first()
    config_id = auth_client.post(
        "/users/me/llm-configs",
        json={
            "provider_id": provider.id,
            "model_name": "llama3-8b-8192",
            "api_key": "sk-owner-key",
        },
    ).json()["id"]
    session_id = auth_client.post(
        "/chat/sessions",
        json={"llm_config_id": config_id, "title": "owner's session"},
    ).json()["id"]

    # A second, unrelated user with a valid token of their own.
    auth_client.post(
        "/auth/register",
        json={"username": "intruder", "email": "intruder@x.com", "password": "pw123456"},
    )
    intruder_token = auth_client.post(
        "/auth/login", json={"username": "intruder", "password": "pw123456"}
    ).json()["access_token"]

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with auth_client.websocket_connect(
            f"/ws/chat/{session_id}?token={intruder_token}"
        ) as ws:
            ws.receive_json()
    assert exc_info.value.code == 1008


def test_ws_happy_path_streams_tokens_then_ends(auth_client, db, monkeypatch):
    # Never call a real LLM: replace the streaming function the router uses
    # AND the validation function so config creation succeeds.
    monkeypatch.setattr(
        "app.routers.chat.process_query_stream", _fake_process_query_stream
    )
    monkeypatch.setattr(
        "app.routers.users.validate_api_key", _async_fake_validate,
    )

    provider = db.query(LLMProvider).filter_by(name="groq").first()
    config_id = auth_client.post(
        "/users/me/llm-configs",
        json={
            "provider_id": provider.id,
            "model_name": "llama3-8b-8192",
            "api_key": "sk-test-dummy",
        },
    ).json()["id"]
    session_id = auth_client.post(
        "/chat/sessions", json={"llm_config_id": config_id, "title": "t"}
    ).json()["id"]

    with auth_client.websocket_connect(
        f"/ws/chat/{session_id}?token={auth_client.token}"
    ) as ws:
        ws.send_json({"message": "hi"})
        assert ws.receive_json() == {"token": "Hello"}
        assert ws.receive_json() == {"end": True}
