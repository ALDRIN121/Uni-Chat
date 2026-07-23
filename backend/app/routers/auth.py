from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from collections import defaultdict
import time
from app.database import get_db
from app.schemas import UserCreate, UserResponse, LoginRequest, Token
from app.auth import create_access_token, verify_password
from app.crud import create_user, get_user_by_username, get_user_by_email
from app.core.config import settings

router = APIRouter()

# Simple in-memory rate limiter (per-IP, resets on restart)
_rate_limits: dict[str, list[float]] = defaultdict(list)
_RATE_WINDOW = 60  # seconds
_RATE_MAX = 10     # requests per window


def _check_rate_limit(ip: str) -> bool:
    now = time.time()
    _rate_limits[ip] = [t for t in _rate_limits[ip] if now - t < _RATE_WINDOW]
    _rate_limits[ip].append(now)
    return len(_rate_limits[ip]) <= _RATE_MAX


@router.post("/login", response_model=Token)
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(ip):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")

    user = get_user_by_username(db, login_data.username)
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = create_user(db, user)
    return db_user
