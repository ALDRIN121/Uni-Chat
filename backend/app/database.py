from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from app.models import Base, LLMProvider
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_providers(db):
    """Seed default LLM providers. Idempotent per-provider: new providers
    are inserted if missing; existing providers have their model lists
    refreshed. Schema is managed by Alembic migrations.
    """
    provider_defs = [
        LLMProvider(
            name="groq",
            display_name="Groq",
            is_active=True,
            supported_models=[
                "llama2-70b-4096",
                "llama3-8b-8192",
                "llama3-70b-8192",
                "mixtral-8x7b-32768",
                "gemma-7b-it",
                "deepseek-r1-distill-llama-70b",
            ],
        ),
        LLMProvider(
            name="openai",
            display_name="OpenAI",
            is_active=True,
            supported_models=[
                "gpt-3.5-turbo",
                "gpt-4",
                "gpt-4-turbo",
                "gpt-4o",
                "gpt-4o-mini",
            ],
        ),
        LLMProvider(
            name="anthropic",
            display_name="Anthropic",
            is_active=True,
            supported_models=[
                "claude-sonnet-4",
                "claude-opus-4",
                "claude-haiku-4.5",
            ],
        ),
    ]

    try:
        for pdef in provider_defs:
            existing = db.query(LLMProvider).filter(LLMProvider.name == pdef.name).first()
            if existing:
                existing.supported_models = pdef.supported_models
            else:
                db.add(pdef)
        db.commit()
    except Exception as e:
        print(f"Error seeding LLM providers: {e}")
        db.rollback()

def init_db():
    """Initialize database on app startup.

    Schema is managed by Alembic migrations (`alembic upgrade head`), which
    is the canonical path and should be run before first start. The
    create_all() call below is kept as a dev-convenience fallback so the app
    is still bootable out-of-the-box (e.g. fresh clone, no migrations run
    yet); it is idempotent and a no-op against a DB alembic already manages.
    """
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_providers(db)
    finally:
        db.close()
