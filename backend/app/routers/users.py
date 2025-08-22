from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.schemas import LLMConfigCreate, LLMConfigResponse, ChatSessionResponse, GroqSetupRequest
from app.crud import create_llm_config, get_user_llm_configs, get_llm_providers, get_user_chat_sessions
from app.models import User
from app.services.validation_service import validate_groq_api_key
from typing import List

router = APIRouter()

@router.get("/me/llm-configs", response_model=List[LLMConfigResponse])
def get_my_llm_configs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_llm_configs(db, current_user.id)

@router.post("/me/llm-configs", response_model=LLMConfigResponse)
def create_my_llm_config(config: LLMConfigCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return create_llm_config(db, config, current_user.id)

@router.get("/llm-providers")
def get_providers(db: Session = Depends(get_db)):
    return get_llm_providers(db)

@router.get("/me/chat-sessions", response_model=List[ChatSessionResponse])
def get_my_chat_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_chat_sessions(db, current_user.id)

@router.post("/me/setup-default-groq")
async def setup_default_groq_config(
    request: GroqSetupRequest,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Setup default GROQ configuration for new users with API key validation"""
    # Check if user already has a GROQ config
    existing_configs = get_user_llm_configs(db, current_user.id)
    groq_configs = [c for c in existing_configs if c.provider_id == 1]  # Assuming GROQ is provider_id 1
    
    if groq_configs:
        raise HTTPException(status_code=400, detail="User already has a GROQ configuration")
    
    # Validate the API key before saving
    model_name = "deepseek-r1-distill-llama-70b"
    validation_result = await validate_groq_api_key(request.api_key, model_name)
    
    if not validation_result["valid"]:
        raise HTTPException(
            status_code=400, 
            detail={
                "message": validation_result["message"],
                "error_type": validation_result.get("error_type", "validation_failed")
            }
        )
    
    # Create default GROQ config only after successful validation
    config = LLMConfigCreate(
        provider_id=1,  # GROQ provider ID
        model_name=model_name,
        api_key=request.api_key,
        config_params={
            "temperature": 0,
            "max_tokens": None
        },
        is_default=True
    )
    
    created_config = create_llm_config(db, config, current_user.id)
    
    # Return success response with validation details
    return {
        **created_config.__dict__,
        "validation_success": True,
        "validation_message": validation_result["message"],
        "test_response": validation_result.get("test_response", "")
    }

@router.get("/me/has-llm-config")
def check_user_has_llm_config(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check if user has any LLM configurations"""
    configs = get_user_llm_configs(db, current_user.id)
    return {
        "has_config": len(configs) > 0,
        "default_config": next((c for c in configs if c.is_default), None) if configs else None
    }
