from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, auth, users, compare, documents
from app.database import init_db
from app.core.config import settings

app = FastAPI(title="Uni Chat API")

@app.on_event("startup")
def startup_event():
    # Guard: refuse to boot with insecure default key
    from app.core.config import settings
    if settings.SECRET_KEY == "dev-only-insecure-change-me":
        raise RuntimeError(
            "SECRET_KEY is set to the insecure default. "
            "Set a strong random key via the SECRET_KEY environment variable."
        )
    init_db()

# Add CORS middleware for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(chat.router, tags=["chat"])
app.include_router(compare.router, tags=["compare"])
app.include_router(documents.router, tags=["documents"])

@app.get("/")
def read_root():
    return {"message": "Uni Chat API is running"}
