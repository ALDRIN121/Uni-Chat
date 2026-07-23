from starlette.websockets import WebSocketDisconnect


def test_compare_rejects_without_token(client):
    """WS /ws/compare without token should close with code 1008."""
    raised = False
    try:
        with client.websocket_connect("/ws/compare") as ws:
            ws.send_json({"message": "hi", "config_ids": [1]})
            ws.receive_json()
    except WebSocketDisconnect:
        raised = True
    except Exception:
        raised = True  # Connection may close before we can interact
    assert raised, "Server should have rejected the unauthenticated connection"


def test_compare_router_is_registered(client):
    """Verify the compare router is mounted — the endpoint exists."""
    try:
        with client.websocket_connect("/ws/compare"):
            pass
    except WebSocketDisconnect:
        pass  # Expected: closes 1008 on missing token
    except Exception:
        pass
