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
