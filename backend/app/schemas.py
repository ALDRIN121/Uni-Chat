from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# LLM Config schemas
class LLMConfigBase(BaseModel):
    provider_id: int
    model_name: str
    config_params: Optional[Dict[str, Any]] = {}
    is_default: bool = False

class LLMConfigCreate(LLMConfigBase):
    api_key: Optional[str] = None

class LLMConfigResponse(LLMConfigBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Chat schemas
class ChatSessionCreate(BaseModel):
    llm_config_id: int
    title: Optional[str] = None

class ChatSessionResponse(BaseModel):
    id: int
    title: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    role: str
    content: str

class ChatMessageResponse(ChatMessageCreate):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class GroqSetupRequest(BaseModel):
    api_key: str
