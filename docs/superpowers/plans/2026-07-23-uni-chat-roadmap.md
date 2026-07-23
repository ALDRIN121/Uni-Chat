# Uni-Chat Roadmap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the MVP Groq-only chat app into a hardened, multi-provider "unified chat" platform with deep chat UX, side-by-side multi-model compare, and RAG over uploaded documents.

**Architecture:** Keep the two-package split (FastAPI `backend/`, Next.js `frontend/`). Backend gains a provider-factory layer so one code path drives Groq/OpenAI/Anthropic, real Fernet encryption for stored API keys, env-driven secrets via `pydantic-settings`, Alembic migrations, WebSocket auth, and a RAG pipeline (local sentence-transformers embeddings + persistent Chroma). Frontend is restructured from one inlined `page.tsx` into real routes (`/login`, `/chat/[id]`, `/settings`) with extracted components, then grows compare and document-chat UI.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, `pydantic-settings`, `cryptography` (Fernet), LangChain (`langchain-groq`, `langchain-openai`, `langchain-anthropic`, `langchain-text-splitters`), ChromaDB, `sentence-transformers`, `pypdf`, pytest + httpx; Next.js 15 App Router, React 18, shadcn/ui, Tailwind, `react-markdown` + `react-syntax-highlighter`.

## Global Constraints

- **Python** 3.10+ (README) — but `pyproject.toml`/ruff target py312. Write code that runs on 3.10+ (no 3.11-only syntax like `except*`).
- **`requirements.txt` is the source of truth** for backend deps, not `pyproject.toml`/Poetry (they have drifted). Every new dep goes in `requirements.txt`. `requirements-dev.txt` does `-r requirements.txt` + dev tools.
- **No secrets in code.** JWT `SECRET_KEY`, `ENCRYPTION_KEY`, and all provider keys come from env. Never commit real keys. `.env.example` documents every variable.
- **Frontend URLs must be env-driven** via `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_WS_BASE_URL` — no hardcoded `http://localhost:8000`.
- **Ports:** frontend 9002, backend 8000. Keep these.
- **TDD:** every backend task writes a failing pytest first. `next.config.ts` has `ignoreBuildErrors`/`ignoreDuringBuilds` on — do NOT rely on `next build` to catch type/lint errors; run `npm run typecheck` and `npm run lint` explicitly.
- **Commit frequently** — one commit per task minimum, message prefix `feat:`/`fix:`/`chore:`/`test:`.
- **Branch/PR workflow:** feature branches → PR into `development`. Run the `verify` project skill before each PR.
- **Only Groq is currently wired.** OpenAI/Anthropic are seed rows only — treat any code referencing them as new work, not existing behavior.

---

## Phase Overview

| Phase | Theme | Why first |
|-------|-------|-----------|
| 1 | Hardening & foundation | Small, high-leverage security/infra fixes everything else builds on (encryption, env secrets, WS auth, migrations, test harness, dead-code removal). |
| 2 | True multi-provider | Makes "Uni" Chat real: one factory drives Groq/OpenAI/Anthropic. Unblocks compare. |
| 3 | FE restructure + chat UX depth | Routes + extracted components create the surface later features live in; rename/delete/search/regenerate/copy/highlighting land here. |
| 4 | Multi-model compare | Flagship differentiator; depends on Phase 2 factory. |
| 5 | RAG / document chat | Biggest lift; depends on the hardened, componentized base. |

Each phase produces working, shippable software on its own. Recommended: one PR per phase into `development`.

---

# PHASE 1 — Hardening & Foundation

**Deliverable:** Same features as today, but: API keys encrypted at rest, all secrets env-driven, WebSocket chat authenticated + ownership-checked, Alembic managing schema, a real pytest harness with passing tests, and dead scaffolding removed. This phase changes almost no user-visible behavior — it makes the rest safe to build.

### Task 1.1: Env-driven settings via `pydantic-settings`

Replace the plain `Settings` class and the hardcoded `auth.py` constants with one typed settings object sourced from env.

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/auth.py:11-14` (remove hardcoded constants; import from settings)
- Modify: `backend/requirements.txt` (add `pydantic-settings`)
- Modify: `backend/.env.example`
- Test: `backend/tests/test_config.py` (create)

**Interfaces:**
- Produces: `settings` singleton with `.GROQ_API_KEY`, `.OPENAI_API_KEY` (optional, for compare/embeddings later), `.ANTHROPIC_API_KEY` (optional), `.SECRET_KEY`, `.ALGORITHM`, `.ACCESS_TOKEN_EXPIRE_MINUTES: int`, `.ENCRYPTION_KEY`, `.DATABASE_URL`, `.CORS_ORIGINS: list[str]`, `.HOST`, `.PORT: int`.

- [ ] **Step 1: Add dep.** Append `pydantic-settings` to `backend/requirements.txt`, then `pip install -r requirements.txt`.

- [ ] **Step 2: Write the failing test** — `backend/tests/test_config.py`:

```python
import os
import importlib

def test_settings_reads_env(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "45")
    import app.core.config as config
    importlib.reload(config)
    assert config.settings.SECRET_KEY == "test-secret"
    assert config.settings.ACCESS_TOKEN_EXPIRE_MINUTES == 45
    assert isinstance(config.settings.CORS_ORIGINS, list)
```

- [ ] **Step 3: Run test to verify it fails.** `cd backend && pytest tests/test_config.py -v` → FAIL (no `SECRET_KEY` attr / not reloadable).

- [ ] **Step 4: Rewrite `config.py`:**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Provider keys (server-level fallbacks / embeddings). Per-user keys live in the DB.
    GROQ_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None

    # Auth
    SECRET_KEY: str = "dev-only-insecure-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Encryption for stored provider API keys (Fernet urlsafe base64 key)
    ENCRYPTION_KEY: str | None = None

    # Infra
    DATABASE_URL: str = "sqlite:///./uni_chat.db"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:9002", "http://127.0.0.1:9002"]


settings = Settings()
```

- [ ] **Step 5: Point `auth.py` at settings.** Replace lines 11–14 constants and their uses:

```python
from app.core.config import settings
# remove SECRET_KEY/ALGORITHM/ACCESS_TOKEN_EXPIRE_MINUTES module constants
```
In `create_access_token`, `get_current_user`, and everywhere the constants were used, reference `settings.SECRET_KEY`, `settings.ALGORITHM`. Update `auth.router` import in `backend/app/routers/auth.py:7` (`ACCESS_TOKEN_EXPIRE_MINUTES`) to `from app.core.config import settings` and use `settings.ACCESS_TOKEN_EXPIRE_MINUTES`.

- [ ] **Step 6: Fix CORS in `main.py`.** Replace the `allow_origins=[..., "*"]` list with `settings.CORS_ORIGINS` (drop the `"*"` — it is invalid with `allow_credentials=True`):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 7: Update `.env.example`** to list `SECRET_KEY`, `ENCRYPTION_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS` (with a note that it is a JSON list, e.g. `CORS_ORIGINS=["http://localhost:9002"]`) alongside the existing `GROQ_API_KEY`, `PORT`, `HOST`, `DATABASE_URL`.

- [ ] **Step 8: Run test to verify it passes.** `pytest tests/test_config.py -v` → PASS. Then start the server (`python start_server.py`) and confirm it boots.

- [ ] **Step 9: Commit.** `git add -A && git commit -m "feat: env-driven settings via pydantic-settings; remove hardcoded JWT secret and CORS wildcard"`

---

### Task 1.2: Fernet encryption for stored provider API keys

Implement real encryption behind the mis-named `api_key_encrypted` column. Encrypt on write, decrypt on read. Resolves the three TODO markers (`crud.py:32`, `routers/chat.py:66`, `models.py:40`).

**Files:**
- Create: `backend/app/core/crypto.py`
- Modify: `backend/app/crud.py:27-39` (`create_llm_config`)
- Create: helper `get_decrypted_api_key(config)` — put in `backend/app/crud.py`
- Modify: `backend/app/routers/chat.py:64-70` (use decrypt helper)
- Test: `backend/tests/test_crypto.py` (create)

**Interfaces:**
- Produces: `crypto.encrypt(plaintext: str) -> str`, `crypto.decrypt(token: str) -> str`, `crypto.generate_key() -> str`.
- Produces: `crud.get_decrypted_api_key(config: UserLLMConfig) -> str | None`.
- Consumes: `settings.ENCRYPTION_KEY` (Task 1.1).

- [ ] **Step 1: Write the failing test** — `backend/tests/test_crypto.py`:

```python
from app.core import crypto

def test_roundtrip(monkeypatch):
    key = crypto.generate_key()
    monkeypatch.setattr(crypto, "_get_key", lambda: key)
    token = crypto.encrypt("sk-secret-123")
    assert token != "sk-secret-123"
    assert crypto.decrypt(token) == "sk-secret-123"

def test_empty_is_none():
    assert crypto.encrypt(None) is None
    assert crypto.decrypt(None) is None
```

- [ ] **Step 2: Run test to verify it fails.** `pytest tests/test_crypto.py -v` → FAIL (module missing).

- [ ] **Step 3: Implement `backend/app/core/crypto.py`:**

```python
from cryptography.fernet import Fernet
from app.core.config import settings


def generate_key() -> str:
    """Generate a new Fernet key (urlsafe base64). Use once, store in ENCRYPTION_KEY."""
    return Fernet.generate_key().decode()


def _get_key() -> str:
    if not settings.ENCRYPTION_KEY:
        raise RuntimeError(
            "ENCRYPTION_KEY is not set. Generate one with "
            "`python -c 'from app.core.crypto import generate_key; print(generate_key())'`"
        )
    return settings.ENCRYPTION_KEY


def encrypt(plaintext: str | None) -> str | None:
    if not plaintext:
        return None
    return Fernet(_get_key().encode()).encrypt(plaintext.encode()).decode()


def decrypt(token: str | None) -> str | None:
    if not token:
        return None
    return Fernet(_get_key().encode()).decrypt(token.encode()).decode()
```

(`cryptography` is already available transitively via `python-jose[cryptography]`; add an explicit `cryptography` line to `requirements.txt` so it is a direct dep.)

- [ ] **Step 4: Encrypt on write.** In `crud.create_llm_config`, change `api_key_encrypted=config.api_key` to `api_key_encrypted=crypto.encrypt(config.api_key)` and add `from app.core import crypto`. Add the read helper:

```python
def get_decrypted_api_key(config) -> str | None:
    from app.core import crypto
    return crypto.decrypt(config.api_key_encrypted)
```

- [ ] **Step 5: Decrypt on read.** In `routers/chat.py`, replace `'api_key': llm_config_record.api_key_encrypted,  # TODO: Decrypt this` with `'api_key': get_decrypted_api_key(llm_config_record),` and import `get_decrypted_api_key`.

- [ ] **Step 6: Run test to verify it passes.** `pytest tests/test_crypto.py -v` → PASS.

- [ ] **Step 7: Generate a real key** for local dev and put it in `backend/.env` (not committed): `python -c "from app.core.crypto import generate_key; print(generate_key())"`. Note in `.env.example`: existing plaintext rows from before this change won't decrypt — reset `uni_chat.db` OR re-save configs. Since this is early-stage dev data, deleting `uni_chat.db` (auto-reseeds) is acceptable; call this out in the PR.

- [ ] **Step 8: Commit.** `git add -A && git commit -m "feat: encrypt stored provider API keys with Fernet"`

---

### Task 1.3: WebSocket authentication + session ownership

Both WS endpoints currently accept any connection to any `session_id`. Require a valid JWT (passed as `?token=`) and verify the caller owns the session.

**Files:**
- Modify: `backend/app/auth.py` (add token-string decode helper)
- Modify: `backend/app/routers/chat.py:40-94` (`chat_websocket`)
- Modify: `backend/app/routers/chat.py:105-123` (remove or gate the legacy WS)
- Test: `backend/tests/test_ws_auth.py` (create)

**Interfaces:**
- Produces: `auth.get_user_from_token(token: str, db: Session) -> User | None` (returns None on any failure; no HTTP exception — WS needs manual close).

- [ ] **Step 1: Add `get_user_from_token` to `auth.py`:**

```python
def get_user_from_token(token: str, db: Session) -> Optional[User]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if not username:
            return None
    except JWTError:
        return None
    return db.query(User).filter(User.username == username).first()
```
(Refactor `get_current_user` to call this to avoid duplication.)

- [ ] **Step 2: Write the failing test** — `backend/tests/test_ws_auth.py` using FastAPI `TestClient` websocket support:

```python
from fastapi.testclient import TestClient
from app.main import app

def test_ws_rejects_without_token():
    client = TestClient(app)
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/chat/1") as ws:
            ws.send_json({"message": "hi"})
            ws.receive_json()
```
(Full happy-path test needs a seeded user+session; add it once the auth-fixtures from Task 1.5 exist — reference them here.)

- [ ] **Step 3: Run test to verify it fails.** `pytest tests/test_ws_auth.py -v` → FAIL (connection currently accepted).

- [ ] **Step 4: Gate the socket.** Rewrite the head of `chat_websocket`:

```python
@router.websocket("/ws/chat/{session_id}")
async def chat_websocket(session_id: int, websocket: WebSocket, token: str | None = None, db: Session = Depends(get_db)):
    user = get_user_from_token(token, db) if token else None
    if user is None:
        await websocket.close(code=1008)  # policy violation
        return
    session = get_chat_session(db, session_id)
    if not session or session.user_id != user.id:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    ...
```
Move the per-message `get_chat_session` lookup out (already validated). Keep the rest of the streaming loop.

- [ ] **Step 5: Remove the legacy endpoints.** Delete `chat_websocket_legacy` (`/ws/chat`) and the dead `chat_endpoint` (`POST /chat`) — both are unauthenticated dead code. Remove now-unused imports (`timed`, `asyncio`, `ChatRequest`).

- [ ] **Step 6: Frontend sends the token.** In `frontend/src/lib/api.ts:164-168`, change `createChatWebSocket` to append the token:

```typescript
createChatWebSocket(sessionId: string | number): WebSocket {
  const token = localStorage.getItem('access_token');
  const base = process.env.NEXT_PUBLIC_WS_BASE_URL ?? 'ws://localhost:8000';
  return new WebSocket(`${base}/ws/chat/${sessionId}?token=${encodeURIComponent(token ?? '')}`);
}
```

- [ ] **Step 7: Run test to verify it passes.** `pytest tests/test_ws_auth.py -v` → PASS.

- [ ] **Step 8: Commit.** `git add -A && git commit -m "feat: authenticate chat WebSocket and enforce session ownership; drop legacy endpoints"`

---

### Task 1.4: Alembic migrations baseline

Alembic is a declared dep but entirely unused (no `alembic.ini`, no `migrations/`). Wire it so schema changes in Phases 2–5 (new columns/tables) are managed, not hand-applied.

**Files:**
- Create: `backend/alembic.ini`, `backend/migrations/env.py`, `backend/migrations/versions/*_initial.py`
- Modify: `backend/app/database.py:20-74` (`init_db` → seed-only; drop `create_all` reliance)

- [ ] **Step 1: Init alembic.** `cd backend && alembic init migrations`.

- [ ] **Step 2: Point env at settings + metadata.** In `migrations/env.py`: `from app.core.config import settings`, set `config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)`; `from app.models import Base`; `target_metadata = Base.metadata`.

- [ ] **Step 3: Autogenerate the baseline.** With an empty/fresh DB URL, `alembic revision --autogenerate -m "initial schema"`. Verify the generated `versions/*.py` contains all five tables (`users`, `llm_providers`, `user_llm_configs`, `chat_sessions`, `chat_messages`).

- [ ] **Step 4: Apply it.** `alembic upgrade head`. Confirm tables exist.

- [ ] **Step 5: Make `init_db` seed-only.** Keep the provider-seeding block, but remove reliance on `Base.metadata.create_all` for prod correctness. For dev convenience you may keep `create_all` guarded, but the canonical path is `alembic upgrade head`. Extract seeding into `seed_providers(db)` and have `init_db()` call `alembic`-applied schema assumption + `seed_providers`. Document in README: run `alembic upgrade head` before first start.

- [ ] **Step 6: Verify.** Delete `uni_chat.db`, run `alembic upgrade head`, start server, confirm providers seed and login/chat still work.

- [ ] **Step 7: Commit.** `git add -A && git commit -m "chore: add alembic migrations with initial-schema baseline"`

---

### Task 1.5: Real pytest harness + fixtures

Replace placeholder tests with a real harness: in-memory SQLite, `TestClient`, and reusable auth fixtures used by all later tasks.

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/pytest.ini` (or `[tool.pytest.ini_options]` — put in `pytest.ini` to avoid the pyproject drift)
- Delete: `backend/tests/test_chat.py` placeholder body → replace with real smoke test
- Delete: `backend/app/tests/test_ws_stream.py` (manual script, not a test)
- Modify: `backend/requirements-dev.txt` (add `pytest`, `httpx`)

**Interfaces:**
- Produces fixtures: `db` (fresh session per test on in-memory SQLite), `client` (TestClient with `get_db` overridden), `auth_client` (client + a registered/logged-in user, Authorization header set), `test_user`.

- [ ] **Step 1: Add dev deps.** `pytest`, `httpx` → `requirements-dev.txt`; `pip install -r requirements-dev.txt`.

- [ ] **Step 2: `pytest.ini`:**

```ini
[pytest]
pythonpath = .
testpaths = tests
```

- [ ] **Step 3: `conftest.py`** with in-memory DB + dependency override:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.models import Base
from app.database import get_db
from app.main import app

@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def auth_client(client, db):
    client.post("/auth/register", json={"username": "u1", "email": "u1@x.com", "password": "pw123456"})
    tok = client.post("/auth/login", json={"username": "u1", "password": "pw123456"}).json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {tok}"})
    return client
```

- [ ] **Step 4: Real tests** in `backend/tests/test_auth_flow.py`: register → duplicate-register 400 → login → login-wrong-password 401 → authorized `GET /users/me/has-llm-config` 200. Delete the `assert True` placeholder and the `app/tests/test_ws_stream.py` script.

- [ ] **Step 5: Run the suite.** `pytest -v` → all PASS (config, crypto, ws_auth, auth_flow). Wire the earlier Task 1.3 happy-path WS test now that `auth_client` exists.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "test: real pytest harness with auth fixtures; remove placeholder tests"`

---

### Task 1.6: Frontend hardening — real `/users/me`, env URLs, dead-code removal

Fix the fabricated mock user, move URLs to env, strip debug UI, and delete the Genkit/Firebase scaffolding so the codebase stops advertising capabilities it doesn't have.

**Files:**
- Create: `backend/app/routers/users.py` — add `GET /users/me` (returns current user)
- Modify: `frontend/src/lib/api.ts` (env URLs + `getCurrentUser`)
- Modify: `frontend/src/contexts/AuthContext.tsx` (fetch real user, drop fabricated object + console.logs)
- Modify: `frontend/src/components/LLMSetupPage.tsx` (remove yellow "Debug:" banner + console.logs)
- Delete: `frontend/src/ai/` (whole dir), `frontend/src/components/config-dialog.tsx`
- Modify: `frontend/src/app/page.tsx` (remove dead `generateAiResponse` import)
- Modify: `frontend/package.json` (drop `@genkit-ai/*`, `genkit`, `genkit-cli`, `firebase`, and `genkit:*` scripts)
- Create: `frontend/.env.local` + `frontend/.env.example`

- [ ] **Step 1: Backend `/users/me`.** Add to `users.py`:

```python
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```
Add a backend test in `tests/test_auth_flow.py`: `auth_client.get("/users/me")` returns the registered username (not `"user"`).

- [ ] **Step 2: Env URLs in `api.ts`.** Replace `const API_BASE_URL = 'http://localhost:8000'` with `const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'`. Add `getCurrentUser(): Promise<User>` hitting `/users/me` with auth headers. Create `frontend/.env.local` and `.env.example` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` and `NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000`.

- [ ] **Step 3: Real user in `AuthContext`.** On app-start (valid token) and after login, call `apiService.getCurrentUser()` and store the result instead of the fabricated `{ id: 1, username: 'user', ... }`. On 401, clear token + logout. Remove the `console.log` debug calls.

- [ ] **Step 4: Strip debug UI.** Delete the yellow "Debug:" banner in `LLMSetupPage.tsx` and its `console.log`s. Remove the "Skip - I already have a configuration" button (or keep if intentional — confirm; default: remove, it bypasses required setup).

- [ ] **Step 5: Delete dead scaffolding.** `rm -rf frontend/src/ai frontend/src/components/config-dialog.tsx`. Remove the `generateAiResponse` import in `page.tsx:20`. Remove `@genkit-ai/googleai`, `@genkit-ai/next`, `genkit`, `genkit-cli`, `firebase`, and the `genkit:dev`/`genkit:watch` scripts from `package.json`. `npm install` to refresh the lockfile.

- [ ] **Step 6: Verify.** `cd frontend && npm run typecheck && npm run lint`. Start both servers; register a fresh user; confirm the header shows the real username after refresh (not `"user"`).

- [ ] **Step 7: Commit.** `git add -A && git commit -m "feat: fetch real /users/me, env-driven URLs; remove Genkit/Firebase dead code and debug UI"`

---

# PHASE 2 — True Multi-Provider

**Deliverable:** Selecting OpenAI or Anthropic actually calls that provider (not Groq with a wrong model name). One provider factory dispatches on `LLMProvider.name`. The streaming role-mapping bug is fixed, a system prompt is injected, and users can add per-provider configs through a real UI. Depends on Phase 1 (encryption for the new keys, env settings).

**Key bugs this fixes (found during exploration):**
- `process_query_stream` passes DB roles (`"assistant"`) straight to LangChain, which expects `ai`/`human`/`system` — currently only "works" because Groq is lenient; will break for other providers.
- No system prompt in the streaming path.
- `setup-default-groq` and the FE hardcode `provider_id=1` and `deepseek-r1-distill-llama-70b` (which isn't even in the seeded Groq model list).

### Task 2.1: Provider factory service

Single place that returns a configured LangChain chat model for any provider.

**Files:**
- Create: `backend/app/services/providers.py`
- Modify: `backend/requirements.txt` (add `langchain-openai`, `langchain-anthropic`)
- Test: `backend/tests/test_providers.py` (create)

**Interfaces:**
- Produces: `providers.get_chat_model(provider_name: str, model: str, api_key: str, *, temperature: float = 0, max_tokens: int | None = None, streaming: bool = False) -> BaseChatModel`.
- Produces: `providers.SUPPORTED = {"groq", "openai", "anthropic"}`.
- Produces: `providers.to_lc_messages(messages: list[dict], system_prompt: str) -> list[tuple[str, str]]` — maps DB roles to LangChain roles and prepends the system prompt.

- [ ] **Step 1: Add deps.** `langchain-openai`, `langchain-anthropic` → `requirements.txt`; install.

- [ ] **Step 2: Write the failing test** — `backend/tests/test_providers.py`:

```python
import pytest
from app.services import providers

def test_role_mapping_and_system_prompt():
    msgs = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "yo"}]
    out = providers.to_lc_messages(msgs, "You are helpful.")
    assert out[0] == ("system", "You are helpful.")
    assert out[1] == ("human", "hi")
    assert out[2] == ("ai", "yo")

def test_unknown_provider_raises():
    with pytest.raises(ValueError):
        providers.get_chat_model("cohere", "x", "key")

@pytest.mark.parametrize("name", ["groq", "openai", "anthropic"])
def test_returns_model_for_supported(name):
    model = providers.get_chat_model(name, "some-model", "test-key")
    assert model is not None
```

- [ ] **Step 3: Run test to verify it fails.** `pytest tests/test_providers.py -v` → FAIL (module missing).

- [ ] **Step 4: Implement `providers.py`:**

```python
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

SUPPORTED = {"groq", "openai", "anthropic"}

_ROLE_MAP = {"user": "human", "assistant": "ai", "system": "system"}


def to_lc_messages(messages, system_prompt="You are a helpful assistant."):
    out = [("system", system_prompt)]
    for m in messages:
        out.append((_ROLE_MAP.get(m["role"], "human"), m["content"]))
    return out


def get_chat_model(provider_name, model, api_key, *, temperature=0, max_tokens=None, streaming=False):
    name = provider_name.lower()
    if name == "groq":
        return ChatGroq(model=model, temperature=temperature, max_tokens=max_tokens,
                        api_key=api_key, streaming=streaming, max_retries=2)
    if name == "openai":
        return ChatOpenAI(model=model, temperature=temperature, max_tokens=max_tokens,
                          api_key=api_key, streaming=streaming, max_retries=2)
    if name == "anthropic":
        return ChatAnthropic(model=model, temperature=temperature,
                             max_tokens=max_tokens or 1024, api_key=api_key,
                             streaming=streaming, max_retries=2)
    raise ValueError(f"Unsupported provider: {provider_name}")
```
Note: the old `reasoning_format="parsed"` was Groq-specific and tied to deepseek reasoning models — drop it from the generic path (it breaks non-reasoning models). If you want reasoning-model support later, gate it on model name inside the groq branch.

- [ ] **Step 5: Run test to verify it passes.** `pytest tests/test_providers.py -v` → PASS. (Instantiation tests don't call the network — a fake key is fine.)

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: provider factory for groq/openai/anthropic with correct role mapping"`

---

### Task 2.2: Route chat + validation through the factory

Make the chat stream and the key-validation service provider-aware.

**Files:**
- Modify: `backend/app/services/langchain_service.py` (rewrite to delegate to `providers`)
- Modify: `backend/app/routers/chat.py` (pass `provider_name` into the config dict)
- Modify: `backend/app/services/validation_service.py` (generic `validate_api_key(provider, model, key)`)
- Modify: `backend/app/routers/users.py` (generalize `setup-default-groq` OR add generic path — see Task 2.3)
- Test: extend `backend/tests/test_providers.py` / add `tests/test_chat_stream.py`

**Interfaces:**
- Produces: `langchain_service.process_query_stream(messages, llm_config)` where `llm_config` now includes `provider_name`.
- Produces: `validation_service.validate_api_key(provider_name, model_name, api_key) -> dict` (keep `validate_groq_api_key` as a thin wrapper for back-compat).

- [ ] **Step 1: Rewrite `langchain_service.py`** to use the factory:

```python
from app.services.providers import get_chat_model, to_lc_messages
from app.core.config import settings


async def process_query_stream(messages, llm_config=None):
    cfg = llm_config or {}
    model = get_chat_model(
        cfg.get("provider_name", "groq"),
        cfg.get("model_name", "llama3-70b-8192"),
        cfg.get("api_key") or settings.GROQ_API_KEY,
        temperature=cfg.get("temperature", 0),
        max_tokens=cfg.get("max_tokens"),
        streaming=True,
    )
    async for chunk in model.astream(to_lc_messages(messages, cfg.get("system_prompt", "You are a helpful assistant."))):
        yield chunk.content


def process_query(query, llm_config=None):
    cfg = llm_config or {}
    model = get_chat_model(
        cfg.get("provider_name", "groq"), cfg.get("model_name", "llama3-70b-8192"),
        cfg.get("api_key") or settings.GROQ_API_KEY,
        temperature=cfg.get("temperature", 0), max_tokens=cfg.get("max_tokens", 50),
    )
    ai = model.invoke(to_lc_messages([{"role": "user", "content": query}]))
    return {"response": ai.content}
```

- [ ] **Step 2: Pass `provider_name` in `chat.py`.** When building `llm_config`, look up the provider name from the config's provider relationship: add `'provider_name': llm_config_record.provider.name` to the dict (the `provider` relationship already exists on `UserLLMConfig`).

- [ ] **Step 3: Generalize validation.** In `validation_service.py`, add `validate_api_key(provider_name, model_name, api_key)` that builds `{"provider_name": provider_name, "model_name": model_name, "api_key": api_key, "max_tokens": 50}` and calls `process_query("Hi", cfg)`. Keep the error-classification branches. Make `validate_groq_api_key` call it with `"groq"`.

- [ ] **Step 4: Test.** Add `tests/test_validation.py` that monkeypatches `process_query` to return a canned response and asserts `validate_api_key("openai", "gpt-4o", "k")["valid"] is True`; and a failure path asserting `error_type == "authentication"` when `process_query` raises an auth error.

- [ ] **Step 5: Run.** `pytest -v` → PASS.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: route chat streaming and key validation through provider factory; fix role mapping + system prompt"`

---

### Task 2.3: Generic add-provider config endpoint + fix seed data

Replace the Groq-only `setup-default-groq` special-case with a generic validated create, and correct the seed model lists.

**Files:**
- Modify: `backend/app/routers/users.py` (`create_my_llm_config` validates before save; keep `setup-default-groq` as a convenience alias)
- Modify: `backend/app/database.py` (seed: add current models, ensure deepseek model present in Groq list, add `is_default` provider ordering not relied upon)
- Modify: `backend/app/crud.py` (`create_llm_config`: enforce single default per user)
- Test: `backend/tests/test_llm_configs.py` (create)

- [ ] **Step 1: Validate on create.** In `create_my_llm_config`, before saving: resolve `provider = get_llm_provider(db, config.provider_id)`; call `await validate_api_key(provider.name, config.model_name, config.api_key)`; 400 on invalid. This makes the generic path (already exposed in `api.ts` as `createLLMConfig`, currently unused) safe to use from the UI.

- [ ] **Step 2: Single default.** In `crud.create_llm_config`, if `is_default` is True, first set all the user's other configs `is_default=False`. Add `get_llm_provider(db, provider_id)` helper.

- [ ] **Step 3: Fix seeds.** In `database.py` seed list, add `deepseek-r1-distill-llama-70b` and current models to the Groq `supported_models`; refresh OpenAI (`gpt-4o`, `gpt-4o-mini`) and Anthropic (`claude-sonnet-4`, `claude-opus-4`, `claude-haiku-4.5` — confirm exact IDs at implementation time via the claude-api skill). Make seeding idempotent per-provider (upsert by `name`) rather than "insert all if table empty", so re-seeding updates model lists.

- [ ] **Step 4: Test.** `tests/test_llm_configs.py`: with `validate_api_key` monkeypatched to succeed, `auth_client.post("/users/me/llm-configs", json={...openai...})` → 200; creating a second default flips the first to non-default; invalid key → 400.

- [ ] **Step 5: Run + commit.** `pytest -v` → PASS. `git commit -m "feat: generic validated add-provider endpoint; idempotent provider seeding"`

---

### Task 2.4: Frontend provider + model selection UI

Wire the already-existing-but-unused `getLLMProviders`/`createLLMConfig` API methods into a real provider/model picker. Replace the fake header dropdown (`Orbita GPT`/`GPT-4`/`Gemini Pro` that never reach the backend).

**Files:**
- Create: `frontend/src/components/settings/ProviderConfigForm.tsx` (add a provider key + model)
- Create: `frontend/src/components/chat/ModelPicker.tsx` (choose among the user's saved configs for the active session)
- Modify: `frontend/src/lib/api.ts` (add `deleteLLMConfig`, `setDefaultConfig` if needed; types)
- Modify: chat layout to send the chosen `llm_config_id` when creating a session

**Note:** This depends on the Phase 3 route/component split for where these live. If Phase 3 runs first (recommended ordering below), build these as real components under `settings/` and `chat/`. If Phase 2 ships before Phase 3, drop `ModelPicker` into the existing header inline and move it later.

- [ ] **Step 1:** `ProviderConfigForm` — fetch `getLLMProviders()`, render a provider `<Select>` (shadcn `select` primitive, currently dormant — now used), a dependent model `<Select>` populated from `provider.supported_models`, an API-key `<Input type="password">`, and a "Validate & Save" button calling `createLLMConfig`. Surface backend 400 validation messages inline.

- [ ] **Step 2:** `ModelPicker` — fetch `getLLMConfigs()`, show provider+model per config, highlight default; selecting one sets the config used for the next new session. Persist choice in component state / context.

- [ ] **Step 3:** Session creation uses the picked `llm_config_id` (already the `createChatSession` param) instead of always the default.

- [ ] **Step 4: Verify with Playwright.** `npm run dev`; add an OpenAI config (real key), start a session against it, confirm a streamed response comes back and messages persist. Screenshot.

- [ ] **Step 5: typecheck/lint + commit.** `npm run typecheck && npm run lint`; `git commit -m "feat: provider/model configuration UI wired to multi-provider backend"`

---

# PHASE 3 — Frontend Restructure + Chat UX Depth

**Deliverable:** The single 485-line `page.tsx` state-machine becomes real routes (`/login`, `/chat/[id]`, `/settings`) with extracted, independently-testable components. On that base: session rename/delete, auto-titles, message copy/regenerate/stop, markdown + syntax highlighting, timestamps, and cross-chat search. Recommended to run **before** Phase 2's FE task (2.4) so the new UI lands in the new structure.

**Why restructure:** Compare (Phase 4) and document-chat (Phase 5) need places to live; deep-linkable `/chat/[id]` URLs; and `page.tsx` is already unmanageable. This is the "improve code you're working in" step.

### Task 3.1: Route split + auth guard

**Files:**
- Create: `frontend/src/app/login/page.tsx`, `frontend/src/app/chat/[id]/page.tsx`, `frontend/src/app/chat/page.tsx` (new-chat / empty state), `frontend/src/app/settings/page.tsx`
- Create: `frontend/src/components/AuthGuard.tsx` (redirects unauthenticated → `/login`, missing-config → setup)
- Modify: `frontend/src/app/page.tsx` → thin redirect to `/chat` (or latest session)
- Modify: `frontend/src/app/layout.tsx` (keep `AuthProvider`, `Toaster`)

**Interfaces:**
- Produces: `AuthGuard` wrapping authed routes; uses `useAuth()` + `next/navigation` `useRouter`.

- [ ] **Step 1:** Move login/register into `/login/page.tsx` (render `AuthPage`). Unauthenticated users on any authed route redirect here.
- [ ] **Step 2:** `AuthGuard` — reads `isLoading/isAuthenticated/hasLLMConfig`; spinner while loading, redirect to `/login` if unauthed, redirect to setup (or `/settings?setup=1`) if no config. Wrap `chat` and `settings` layouts.
- [ ] **Step 3:** `/chat/[id]/page.tsx` reads `params.id`, loads that session's messages, renders `<ChatWindow sessionId={id} />` (Task 3.2). `/chat` with no id shows an empty composer that creates a session on first send, then routes to `/chat/[newId]`.
- [ ] **Step 4: Verify** navigation + guards with Playwright (unauthed → `/login`; deep-link to a session loads its history). typecheck/lint.
- [ ] **Step 5: Commit.** `git commit -m "feat: split frontend into /login, /chat/[id], /settings routes with auth guard"`

### Task 3.2: Extract chat components

Pull the inlined sidebar/message-list/composer out of `page.tsx` into focused components.

**Files:**
- Create: `frontend/src/components/chat/ChatWindow.tsx` (orchestrates one session: history + stream + composer)
- Create: `frontend/src/components/chat/MessageList.tsx`, `MessageBubble.tsx`
- Create: `frontend/src/components/chat/Composer.tsx` (textarea + send/stop; attach/mic buttons kept, wired later)
- Create: `frontend/src/components/chat/Sidebar.tsx` (session list + new-chat; icon rail trimmed to functional items)
- Modify: reuse existing `useChatStream` hook as-is

- [ ] **Step 1:** `MessageBubble` renders one message (role avatar, content, actions slot). `MessageList` maps messages + the in-flight streaming message. Each is a pure presentational component taking props — testable in isolation.
- [ ] **Step 2:** `ChatWindow` owns per-session state (messages, streaming) and wires `useChatStream`'s `startStream/stopStream`. Move the `useRef` streaming accumulation out of `page.tsx` into here; delete the leftover `console.log` in `onEnd`.
- [ ] **Step 3:** `Sidebar` lists sessions from `getChatSessions()`; remove the dead icon-rail items with no handlers (`headphones`, `zap`, `puzzle`, `package`, the hardcoded `"New"` badge) — keep chat, settings (routes to `/settings`), and theme toggle. Make the previously-decorative search input functional (Task 3.6) or leave a TODO pointing at Task 3.6.
- [ ] **Step 4: Verify** parity with old UI via Playwright screenshots (send a message, see it stream). typecheck/lint.
- [ ] **Step 5: Commit.** `git commit -m "refactor: extract ChatWindow/MessageList/Composer/Sidebar from page.tsx"`

### Task 3.3: Session rename, delete, auto-title (backend + FE)

**Files:**
- Modify: `backend/app/routers/chat.py` (add `PATCH /chat/sessions/{id}`, `DELETE /chat/sessions/{id}`)
- Modify: `backend/app/crud.py` (`update_session_title`, `delete_session` with cascade of messages)
- Modify: `backend/app/models.py` (add `cascade="all, delete-orphan"` on `ChatSession.messages` and on `User`/`UserLLMConfig` relationships) → new Alembic migration
- Modify: `backend/app/services/langchain_service.py` (add `generate_title(first_message, llm_config) -> str`)
- FE: `Sidebar` rename (inline edit) + delete (with confirm) actions; auto-title on first exchange
- Test: `backend/tests/test_sessions.py`

- [ ] **Step 1 (test-first):** `test_sessions.py`: create session → `PATCH` title → `GET` reflects it; `DELETE` removes session + its messages; deleting another user's session → 404.
- [ ] **Step 2:** CRUD + routes with ownership checks (mirror `get_session_messages_endpoint`'s 404 pattern). Add cascade to relationships; `alembic revision --autogenerate -m "cascade delete sessions/messages"` + `upgrade head`.
- [ ] **Step 3:** Auto-title: after the first assistant response in a session with no title, call `generate_title` (cheap prompt: "Summarize this in 3-5 words: {msg}") using the session's config, `PATCH` the title. Do it server-side at end of first exchange in `chat_websocket`, and push a `{"title": "..."}` WS frame so the FE updates the sidebar live.
- [ ] **Step 4:** FE — sidebar item context menu (rename → inline input; delete → `alert-dialog` primitive, currently dormant). Replace the fake "Clear conversations" (which just calls `handleNewChat`) with real per-session delete.
- [ ] **Step 5: Verify + commit.** `pytest -v`; Playwright rename/delete; `git commit -m "feat: session rename/delete with cascade and LLM auto-titling"`

### Task 3.4: Message actions — copy, regenerate, stop

**Files:**
- Modify: `frontend/src/components/chat/MessageBubble.tsx` (copy button; regenerate on assistant messages)
- Modify: `frontend/src/components/chat/Composer.tsx` (stop button already partially supported via `useChatStream.stopStream`)
- Modify: `backend/app/routers/chat.py` (support regenerate: a WS action that drops the last assistant message and re-streams)
- Modify: `backend/app/crud.py` (`delete_last_assistant_message(session_id)`)

- [ ] **Step 1:** Copy — clipboard button on each message (hover-reveal), toast on success. Pure FE.
- [ ] **Step 2:** Stop — wire Composer's send button to toggle to a stop button while streaming, calling `useChatStream.stopStream()` (already exists). Persist the partial assistant message on stop (backend: on `WebSocketDisconnect`/stop, still save accumulated text — currently it only saves on full completion).
- [ ] **Step 3:** Regenerate — WS accepts `{"action": "regenerate"}`: backend deletes the last assistant message, re-streams from the prior history. FE regenerate button sends that and clears the last bubble.
- [ ] **Step 4:** Backend test `test_regenerate.py`: after an exchange, regenerate leaves exactly one assistant message (the new one).
- [ ] **Step 5: Verify + commit.** `git commit -m "feat: message copy, stop-generation with partial save, and regenerate"`

### Task 3.5: Markdown, syntax highlighting, timestamps

**Files:**
- Modify: `frontend/src/components/chat/MessageBubble.tsx`
- Modify: `frontend/package.json` (add `remark-gfm`, `react-syntax-highlighter` + `@types/react-syntax-highlighter`)

- [ ] **Step 1:** Add `remark-gfm` to the existing `ReactMarkdown` for tables/strikethrough/task-lists. 
- [ ] **Step 2:** Custom `code` renderer using `react-syntax-highlighter` (Prism) with a theme matching the app's dark/light token set; add a per-code-block copy button.
- [ ] **Step 3:** Render `timestamp` (already on the message type, currently unused) as a subtle relative time; use `date-fns` (already installed) `formatDistanceToNow`.
- [ ] **Step 4: Verify** with a code-heavy assistant reply (Playwright screenshot, light + dark). typecheck/lint.
- [ ] **Step 5: Commit.** `git commit -m "feat: GFM markdown, code syntax highlighting, message timestamps"`

### Task 3.6: Cross-chat search

**Files:**
- Modify: `backend/app/routers/chat.py` (`GET /chat/search?q=`)
- Modify: `backend/app/crud.py` (`search_messages(user_id, q)` — SQLite `LIKE` over the user's messages, returns session + snippet)
- Modify: `frontend/src/components/chat/Sidebar.tsx` (wire the decorative search input)
- Test: `backend/tests/test_search.py`

- [ ] **Step 1 (test-first):** search returns only the current user's matching messages, with `session_id`, `title`, and a snippet; empty query → empty list.
- [ ] **Step 2:** CRUD `LIKE '%q%'` scoped by `user_id` via join `ChatMessage → ChatSession`. (Note the ceiling: SQLite `LIKE` is fine at MVP scale; FTS5 is a later upgrade.)
- [ ] **Step 3:** FE — debounced search input in the sidebar; results list links to `/chat/[session_id]`. Highlight the matched snippet.
- [ ] **Step 4: Verify + commit.** `pytest -v`; Playwright search; `git commit -m "feat: cross-chat message search"`

---

# PHASE 4 — Multi-Model Compare

**Deliverable:** Send one prompt to 2–4 of the user's configured models at once and watch them stream side-by-side. This is the flagship "unified chat" differentiator and is only possible because Phase 2 made the provider factory real. Compare runs are **ephemeral** (not persisted as chat sessions) to keep scope contained — call this out in the UI ("Compare is a scratchpad").

**Architecture:** One dedicated WebSocket `/ws/compare`. Client sends `{message, config_ids: [..]}`. Backend spawns one `asyncio` task per config, each streaming from the factory into a shared `asyncio.Queue`; frames are tagged `{"config_id": N, "token": "..."}` / `{"config_id": N, "end": true}` / `{"config_id": N, "error": "..."}`. The FE renders one column per config and routes frames by `config_id`.

### Task 4.1: Compare WebSocket (backend)

**Files:**
- Create: `backend/app/routers/compare.py`
- Modify: `backend/app/main.py` (include the compare router)
- Modify: `backend/app/services/langchain_service.py` (reuse `process_query_stream`; no change expected)
- Test: `backend/tests/test_compare.py`

**Interfaces:**
- Produces: `WS /ws/compare?token=` accepting `{"message": str, "config_ids": list[int]}`; emits `{"config_id", "token"|"end"|"error"}` frames.

- [ ] **Step 1 (test-first):** With `process_query_stream` monkeypatched to yield canned tokens, connect via `TestClient.websocket_connect("/ws/compare?token=<valid>")`, send a message with two config ids, assert you receive tokens tagged with both ids and two `end` frames.

- [ ] **Step 2: Implement the fan-out:**

```python
import asyncio
from fastapi import APIRouter, WebSocket, Depends
from app.database import get_db
from app.auth import get_user_from_token
from app.crud import get_llm_config_by_id, get_decrypted_api_key
from app.services.langchain_service import process_query_stream

router = APIRouter()


@router.websocket("/ws/compare")
async def compare_ws(websocket: WebSocket, token: str | None = None, db=Depends(get_db)):
    user = get_user_from_token(token, db) if token else None
    if user is None:
        await websocket.close(code=1008); return
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message"); config_ids = data.get("config_ids", [])
            if not message or not config_ids:
                await websocket.send_json({"error": "message and config_ids required"}); continue
            queue: asyncio.Queue = asyncio.Queue()

            async def run(cid):
                cfg_row = get_llm_config_by_id(db, cid)
                if not cfg_row or cfg_row.user_id != user.id:
                    await queue.put({"config_id": cid, "error": "config not found"}); return
                llm_config = {
                    "provider_name": cfg_row.provider.name,
                    "model_name": cfg_row.model_name,
                    "api_key": get_decrypted_api_key(cfg_row),
                    "temperature": cfg_row.config_params.get("temperature", 0),
                    "max_tokens": cfg_row.config_params.get("max_tokens"),
                }
                try:
                    async for tok in process_query_stream([{"role": "user", "content": message}], llm_config):
                        await queue.put({"config_id": cid, "token": tok})
                    await queue.put({"config_id": cid, "end": True})
                except Exception as e:
                    await queue.put({"config_id": cid, "error": str(e)})

            tasks = [asyncio.create_task(run(c)) for c in config_ids]
            done_count = 0
            while done_count < len(config_ids):
                frame = await queue.get()
                await websocket.send_json(frame)
                if frame.get("end") or frame.get("error"):
                    done_count += 1
            await asyncio.gather(*tasks)
    except Exception:
        pass
```
(Ownership is enforced per config against `user.id`.)

- [ ] **Step 3:** Include router in `main.py`.
- [ ] **Step 4: Run + commit.** `pytest tests/test_compare.py -v` → PASS. `git commit -m "feat: multi-model compare WebSocket with per-config streaming fan-out"`

### Task 4.2: Compare UI (frontend)

**Files:**
- Create: `frontend/src/app/compare/page.tsx`
- Create: `frontend/src/components/compare/CompareView.tsx`, `CompareColumn.tsx`, `ModelMultiSelect.tsx`
- Create: `frontend/src/hooks/use-compare-stream.ts` (mirrors `use-chat-stream` but demultiplexes by `config_id`)
- Modify: `frontend/src/lib/api.ts` (`createCompareWebSocket()`)
- Modify: sidebar — add a "Compare" entry (reuse the now-functional icon rail)

- [ ] **Step 1:** `ModelMultiSelect` — pick 2–4 of the user's `getLLMConfigs()`. `use-compare-stream` opens the WS, keeps a `Record<config_id, {tokens, done, error}>`, exposes `start(message, ids)`.
- [ ] **Step 2:** `CompareView` — shared prompt composer on top; a responsive grid of `CompareColumn`s (one per selected config, provider+model header), each rendering its streaming markdown independently. Horizontal scroll on narrow screens (2-col → 1-col stack on mobile).
- [ ] **Step 3:** Use `frontend-design` skill for the column layout so it reads intentional, not a raw grid. Empty/error/loading states per column.
- [ ] **Step 4: Verify** with two real providers (e.g., Groq + OpenAI) via Playwright — both columns stream. Screenshot light+dark. typecheck/lint.
- [ ] **Step 5: Commit.** `git commit -m "feat: side-by-side multi-model compare UI"`

---

# PHASE 5 — RAG / Document Chat (local embeddings + Chroma)

**Deliverable:** Upload PDFs/txt/md to a chat, and the assistant answers grounded in them with citations. Local `sentence-transformers` embeddings (no API cost, offline-capable) + persistent Chroma on disk. Biggest lift; depends on the hardened, componentized base. The composer's existing (currently dead) paperclip button becomes the upload entry point.

**Architecture:** New `Document` table tracks uploads (owner, optional session, filename, status). On upload: parse (`pypdf` for PDF, plain read for txt/md) → chunk (`langchain-text-splitters` `RecursiveCharacterTextSplitter`) → embed (all-MiniLM-L6-v2) → store vectors in a Chroma collection scoped per user, with metadata `{document_id, session_id, chunk_index}`. On chat: if the session has documents, embed the query, retrieve top-k chunks filtered to that session's docs, and prepend them to the system prompt with source markers the FE turns into citations.

**Dependency weight (accepted):** `chromadb`, `sentence-transformers` (pulls `torch`, ~500MB), `pypdf`, `langchain-text-splitters`. First embedding call downloads the model (~90MB) — warm it at startup or lazily with a clear log line.

### Task 5.1: Document model + migration + upload endpoint

**Files:**
- Modify: `backend/app/models.py` (add `Document`)
- Create: Alembic migration for `documents`
- Modify: `backend/app/schemas.py` (`DocumentResponse`)
- Create: `backend/app/routers/documents.py` (`POST /documents/upload` multipart, `GET /documents?session_id=`, `DELETE /documents/{id}`)
- Modify: `backend/app/main.py` (include router)
- Modify: `backend/requirements.txt` (`pypdf`)
- Test: `backend/tests/test_documents.py`

**Interfaces:**
- Produces: `Document(id, user_id, session_id nullable, filename, content_type, status: "processing"|"ready"|"error", chunk_count, created_at)`.
- `python-multipart` is already a dep (currently unused) — this is its first real use.

- [ ] **Step 1:** Add the `Document` model + relationships (`User.documents`, `ChatSession.documents`). `alembic revision --autogenerate -m "documents table"` + `upgrade head`.
- [ ] **Step 2 (test-first):** upload a small `.txt` via `auth_client.post("/documents/upload", files=..., data={"session_id": ...})` → 200, row created with `status` progressing to `ready`; listing returns it; another user can't see or delete it (404).
- [ ] **Step 3:** Upload endpoint: save the file to `backend/uploads/{user_id}/{uuid}_{filename}`, create the `Document` row (`status="processing"`), enqueue processing (Task 5.2) via FastAPI `BackgroundTasks`, return the row.
- [ ] **Step 4: Run + commit.** `pytest tests/test_documents.py -v`; `git commit -m "feat: document model, upload endpoint, and migration"`

### Task 5.2: Embedding + Chroma indexing service

**Files:**
- Create: `backend/app/services/rag_service.py`
- Modify: `backend/requirements.txt` (`chromadb`, `sentence-transformers`, `langchain-text-splitters`)
- Modify: `backend/.gitignore` (ignore `chroma_db/`, `uploads/`)
- Test: `backend/tests/test_rag_service.py`

**Interfaces:**
- Produces: `rag_service.index_document(document_id, file_path, content_type, user_id, session_id) -> int` (returns chunk count, updates status).
- Produces: `rag_service.retrieve(query, user_id, session_id, k=4) -> list[dict]` (`{text, document_id, chunk_index, score}`).
- Produces: `rag_service.delete_document_vectors(document_id, user_id)`.

- [ ] **Step 1:** Chroma persistent client at `backend/chroma_db/`; one collection per user (`user_{id}`) using a `sentence-transformers` embedding function (all-MiniLM-L6-v2). Lazy-load the model (module-level singleton) so tests can monkeypatch it.
- [ ] **Step 2:** `_parse(file_path, content_type)` → text (`pypdf.PdfReader` for `application/pdf`, UTF-8 read for text/markdown). Chunk with `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)`.
- [ ] **Step 3:** `index_document` — parse → chunk → `collection.add(ids, documents, metadatas)` with metadata `{document_id, session_id, chunk_index}`; set `Document.status="ready"`, `chunk_count=n`; on error set `status="error"`.
- [ ] **Step 4:** `retrieve` — `collection.query(query_texts=[query], n_results=k, where={"session_id": session_id})`; return normalized dicts.
- [ ] **Step 5 (test-first):** with a stubbed tiny embedding function, index an in-memory doc of two sentences, `retrieve` a query semantically close to one, assert the right chunk ranks first. Deletion removes vectors.
- [ ] **Step 6: Run + commit.** `pytest tests/test_rag_service.py -v`; `git commit -m "feat: local-embedding + Chroma RAG indexing and retrieval service"`

### Task 5.3: Inject retrieved context into chat

**Files:**
- Modify: `backend/app/routers/chat.py` (`chat_websocket`: retrieve + build augmented system prompt)
- Modify: `backend/app/services/langchain_service.py` (accept `system_prompt` — already added in Phase 2)
- Test: `backend/tests/test_rag_chat.py`

- [ ] **Step 1:** In `chat_websocket`, before streaming: if the session has ready documents, `chunks = rag_service.retrieve(message, user.id, session_id)`; build `system_prompt = base + "\n\nUse the following context. Cite sources as [doc:{document_id}].\n" + joined chunks`; pass it via `llm_config["system_prompt"]`.
- [ ] **Step 2:** Emit a `{"sources": [{document_id, chunk_index, snippet}]}` WS frame before/after the answer so the FE can render citations.
- [ ] **Step 3 (test-first):** monkeypatch `retrieve` to return a known chunk and `process_query_stream` to echo the system prompt; assert the chunk text reaches the model and a `sources` frame is sent.
- [ ] **Step 4: Run + commit.** `pytest tests/test_rag_chat.py -v`; `git commit -m "feat: inject retrieved document context into chat with source frames"`

### Task 5.4: Upload + citations UI

**Files:**
- Modify: `frontend/src/components/chat/Composer.tsx` (wire the existing paperclip → file input → `uploadDocument`)
- Create: `frontend/src/components/chat/AttachedDocs.tsx` (chips with processing/ready/error status)
- Create: `frontend/src/components/chat/Citations.tsx` (render the `sources` frame under an answer)
- Modify: `frontend/src/lib/api.ts` (`uploadDocument`, `getDocuments`, `deleteDocument`; extend `use-chat-stream` to surface `sources`)

- [ ] **Step 1:** Paperclip opens a file picker (accept `.pdf,.txt,.md`); upload with progress; show the doc as a chip polling status until `ready`.
- [ ] **Step 2:** `use-chat-stream` handles the `{"sources": [...]}` frame; `Citations` renders numbered source pills linking to the originating document; `[doc:N]` markers in the answer become clickable.
- [ ] **Step 3: Verify** end-to-end with a real PDF via Playwright: upload → ask a question answerable only from the doc → answer cites it. Screenshot.
- [ ] **Step 4: typecheck/lint + commit.** `git commit -m "feat: document upload and citations UI for RAG chat"`

---

## Verification (per phase, end-to-end)

Run the `verify` project skill before each PR into `development`. Manual E2E per phase:

- **Backend:** `cd backend && pytest -v` — all green. `alembic upgrade head` on a fresh DB boots cleanly and seeds providers.
- **Frontend:** `cd frontend && npm run typecheck && npm run lint` — both clean (remember `next build` won't catch these; run them explicitly).
- **Run both:** backend `python start_server.py` (8000), frontend `npm run dev` (9002). Use the `playwright` plugin / `run` skill to click through, not just eyeball code.
- **Phase 1:** register a fresh user; confirm real username after refresh; confirm a WS chat rejects a missing/invalid token (DevTools: connection closes 1008); confirm a saved API key is ciphertext in `uni_chat.db` (`sqlite3 uni_chat.db "select api_key_encrypted from user_llm_configs"`).
- **Phase 2:** add an OpenAI and an Anthropic config with real keys; start a session against each; confirm streamed responses from the actual provider.
- **Phase 3:** deep-link `/chat/[id]`; rename + delete a session; regenerate a reply; render a code block with highlighting (light + dark); search finds a past message.
- **Phase 4:** compare one prompt across Groq + OpenAI; both columns stream concurrently.
- **Phase 5:** upload a PDF; ask a doc-only question; answer is grounded and cites the source; delete the doc and confirm its vectors are gone.

## Cross-cutting notes

- **Ordering:** Phase 1 → 2 → 3 is the strict dependency chain for correctness (encryption before storing more keys; factory before compare). Phase 3's component split ideally precedes Phase 2.4's UI task — if you run Phase 2 first, build 2.4 inline and relocate during Phase 3. Phases 4 and 5 are independent of each other; either can follow Phase 3.
- **`pyproject.toml` drift:** Do not "fix" it by adding deps there — `requirements.txt` is authoritative per CLAUDE.md. Optionally add a one-line note in `pyproject.toml` pointing to `requirements.txt`.
- **Reasoning models:** dropping `reasoning_format="parsed"` from the generic factory means `deepseek-r1-distill-llama-70b` returns raw `<think>` tags. If you keep that as the default Groq model, either strip think-tags in the FE or re-add `reasoning_format` only inside the groq branch when the model id contains `r1`/`reasoning`. Recommended default Groq model: `llama3-70b-8192` (no reasoning wrapper).
- **Provider deps are heavy for RAG:** `sentence-transformers` pulls `torch`. If backend cold-start/image size matters later, the Phase-5 alternative (provider embeddings) is a drop-in swap of the embedding function in `rag_service.py` only.




