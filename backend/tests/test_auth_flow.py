def test_register_creates_user(client, test_user):
    resp = client.post("/auth/register", json=test_user)
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == test_user["username"]
    assert body["email"] == test_user["email"]
    assert "password" not in body
    assert "password_hash" not in body


def test_register_duplicate_username_rejected(client, test_user):
    first = client.post("/auth/register", json=test_user)
    assert first.status_code == 200

    duplicate = client.post("/auth/register", json=test_user)
    assert duplicate.status_code == 400


def test_login_success_returns_bearer_token(client, test_user):
    client.post("/auth/register", json=test_user)

    resp = client.post(
        "/auth/login",
        json={"username": test_user["username"], "password": test_user["password"]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_rejected(client, test_user):
    client.post("/auth/register", json=test_user)

    resp = client.post(
        "/auth/login",
        json={"username": test_user["username"], "password": "not-the-password"},
    )
    assert resp.status_code == 401


def test_authorized_has_llm_config(auth_client):
    resp = auth_client.get("/users/me/has-llm-config")
    assert resp.status_code == 200
    assert resp.json() == {"has_config": False, "default_config": None}
