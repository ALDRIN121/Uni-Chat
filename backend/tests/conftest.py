import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import crypto
from app.core.config import settings
from app.database import get_db, seed_providers
from app.main import app
from app.models import Base

# Shared credentials for the default test user. Exposed via the `test_user`
# fixture so individual tests don't have to re-type them.
TEST_USER = {"username": "u1", "email": "u1@x.com", "password": "pw123456"}


@pytest.fixture(autouse=True)
def _test_encryption_key(monkeypatch):
    """`crypto.encrypt`/`decrypt` raise RuntimeError if settings.ENCRYPTION_KEY
    is unset. Give every test a real Fernet key so anything that creates an
    LLM config with an api_key (which gets encrypted on write) just works,
    without depending on a real .env file being present.
    """
    monkeypatch.setattr(settings, "ENCRYPTION_KEY", crypto.generate_key())


@pytest.fixture(autouse=True)
def _test_rate_limit_bypass(monkeypatch):
    """Disable rate limiting in tests so repeated login calls don't get 429."""
    import app.routers.auth
    monkeypatch.setattr(app.routers.auth, "_check_rate_limit", lambda _ip: True)


@pytest.fixture
def db():
    """Fresh in-memory SQLite DB per test.

    StaticPool keeps a single underlying connection alive for the engine's
    lifetime, so the same in-memory database is visible both to test setup
    code and to the app (including the WebSocket handler), which otherwise
    would each get their own throwaway `:memory:` database.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    seed_providers(session)
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    """TestClient with `get_db` overridden to the shared in-memory session.

    Note this does not use `TestClient` as a context manager, so the app's
    `startup` event (which calls `init_db()` against the *real* configured
    DATABASE_URL) never fires - the real dev DB is never touched by tests.
    """
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user():
    """Credentials for the default test user (not yet registered)."""
    return dict(TEST_USER)


@pytest.fixture
def auth_client(client, test_user):
    """A `client` with `test_user` registered, logged in, and the
    Authorization header set for subsequent requests.

    The raw JWT is also stashed as `.token` since some endpoints (the chat
    WebSocket) take the token as a query param rather than a header.
    """
    client.post("/auth/register", json=test_user)
    resp = client.post(
        "/auth/login",
        json={"username": test_user["username"], "password": test_user["password"]},
    )
    token = resp.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    client.token = token
    return client
