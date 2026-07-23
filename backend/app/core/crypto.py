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
