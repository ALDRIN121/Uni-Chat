from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.schemas import ChatSessionCreate, ChatSessionResponse, ChatMessageCreate
from app.crud import create_chat_session, create_chat_message, get_session_messages, get_chat_session, get_llm_config_by_id
from app.services.langchain_service import process_query_stream
from app.utils.timer import timed
from pydantic import BaseModel
import asyncio

router = APIRouter()

class ChatRequest(BaseModel):
    query: str

@router.post("/chat/sessions", response_model=ChatSessionResponse)
def create_session(
    session: ChatSessionCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_chat_session(db, session, current_user.id)

@router.get("/chat/sessions/{session_id}/messages")
def get_session_messages_endpoint(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify session belongs to user
    session = get_chat_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = get_session_messages(db, session_id)
    return messages

@router.websocket("/ws/chat/{session_id}")
async def chat_websocket(session_id: int, websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            message_data = data.get("message")
            
            if not message_data:
                await websocket.send_json({"error": "No message provided"})
                continue
            
            # Verify session exists and get user's LLM config
            session = get_chat_session(db, session_id)
            if not session:
                await websocket.send_json({"error": "Session not found"})
                break
            
            # Get the user's LLM configuration
            llm_config_record = get_llm_config_by_id(db, session.llm_config_id)
            if not llm_config_record:
                await websocket.send_json({"error": "LLM configuration not found"})
                break
            
            # Prepare LLM config for the service
            llm_config = {
                'api_key': llm_config_record.api_key_encrypted,  # TODO: Decrypt this
                'model_name': llm_config_record.model_name,
                'temperature': llm_config_record.config_params.get('temperature', 0),
                'max_tokens': llm_config_record.config_params.get('max_tokens'),
            }
            
            # Save user message
            user_message = ChatMessageCreate(role="user", content=message_data)
            create_chat_message(db, user_message, session_id)
            
            # Get chat history
            messages = get_session_messages(db, session_id)
            formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
            
            # Stream response with user's LLM config
            assistant_response = ""
            async for chunk in process_query_stream(formatted_messages, llm_config):
                assistant_response += chunk
                await websocket.send_json({"token": chunk})
            
            # Save assistant message
            assistant_message = ChatMessageCreate(role="assistant", content=assistant_response)
            create_chat_message(db, assistant_message, session_id)
            
            await websocket.send_json({"end": True})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"error": str(e)})

# Keep the original endpoint for backward compatibility
@router.post("/chat")
@timed
async def chat_endpoint(request: ChatRequest):
    try:
        return {"response": "Please use the new WebSocket endpoint with sessions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Keep the original WebSocket for backward compatibility
@router.websocket("/ws/chat")
async def chat_websocket_legacy(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            messages = data.get("messages")
            if not messages or not isinstance(messages, list):
                await websocket.send_json({"error": "No messages provided or invalid format."})
                continue
            async for chunk in process_query_stream(messages):
                await websocket.send_json({"token": chunk})
            await websocket.send_json({"end": True})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        await websocket.close()
