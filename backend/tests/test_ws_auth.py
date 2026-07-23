import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_ws_rejects_without_token():
    client = TestClient(app)
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/chat/1") as ws:
            ws.send_json({"message": "hi"})
            ws.receive_json()


# TODO(task-1.5): happy-path WS test once auth fixtures exist
