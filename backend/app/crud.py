from sqlalchemy.orm import Session
from app.models import User, UserLLMConfig, ChatSession, ChatMessage, LLMProvider
from app.schemas import UserCreate, LLMConfigCreate, ChatSessionCreate, ChatMessageCreate
from app.auth import get_password_hash
from typing import Optional

# User CRUD
def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

# LLM Config CRUD
def create_llm_config(db: Session, config: LLMConfigCreate, user_id: int):
    db_config = UserLLMConfig(
        user_id=user_id,
        provider_id=config.provider_id,
        model_name=config.model_name,
        api_key_encrypted=config.api_key,  # TODO: Add encryption
        config_params=config.config_params,
        is_default=config.is_default
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

def get_user_llm_configs(db: Session, user_id: int):
    return db.query(UserLLMConfig).filter(UserLLMConfig.user_id == user_id).all()

def get_llm_config_by_id(db: Session, config_id: int):
    return db.query(UserLLMConfig).filter(UserLLMConfig.id == config_id).first()

def get_llm_providers(db: Session):
    return db.query(LLMProvider).filter(LLMProvider.is_active == True).all()

# Chat CRUD
def create_chat_session(db: Session, session: ChatSessionCreate, user_id: int):
    db_session = ChatSession(
        user_id=user_id,
        llm_config_id=session.llm_config_id,
        title=session.title
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_user_chat_sessions(db: Session, user_id: int):
    return db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc()).all()

def get_chat_session(db: Session, session_id: int):
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()

def create_chat_message(db: Session, message: ChatMessageCreate, session_id: int):
    db_message = ChatMessage(
        session_id=session_id,
        role=message.role,
        content=message.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_session_messages(db: Session, session_id: int):
    return db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.timestamp.asc()).all()
