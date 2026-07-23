from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, get_user_from_token
from app.models import User
from app.schemas import ChatSessionCreate, ChatSessionResponse, ChatMessageCreate
from app.crud import create_chat_session, create_chat_message, get_session_messages, get_chat_session, get_llm_config_by_id, get_decrypted_api_key, update_chat_session, delete_chat_session, delete_last_assistant_message
from app.services.langchain_service import process_query_stream, process_query
from app.models import Document
from app.services.rag_service import retrieve

router = APIRouter()

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


@router.patch("/chat/sessions/{session_id}")
def update_session(
    session_id: int,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = get_chat_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    title = body.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    return update_chat_session(db, session_id, title)


@router.delete("/chat/sessions/{session_id}")
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = get_chat_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    delete_chat_session(db, session_id)
    return {"ok": True}


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
    try:
        while True:
            data = await websocket.receive_json()
            message_data = data.get("message")

            if not message_data:
                await websocket.send_json({"error": "No message provided"})
                continue

            # Get the user's LLM configuration
            llm_config_record = get_llm_config_by_id(db, session.llm_config_id)
            if not llm_config_record:
                await websocket.send_json({"error": "LLM configuration not found"})
                break
            
            # Prepare LLM config for the service
            llm_config = {
                'api_key': get_decrypted_api_key(llm_config_record),
                'provider_name': llm_config_record.provider.name,
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

            # RAG: if session has documents, retrieve relevant chunks and inject as system prompt
            has_docs = db.query(Document).filter(
                Document.session_id == session_id,
                Document.status == "ready",
            ).first()
            if has_docs:
                try:
                    chunks = retrieve(message_data, user.id, session_id)
                    if chunks:
                        ctx = "Use the following context. Cite sources as [doc:N].\n\n" + \
                              "\n\n".join(f"[doc:{c['document_id']}] {c['text']}" for c in chunks)
                        llm_config["system_prompt"] = llm_config.get("system_prompt", "You are a helpful assistant.") + "\n\n" + ctx
                except Exception:
                    pass  # RAG is a nice-to-have; don't break chat on failure

            # Stream response with user's LLM config
            assistant_response = ""
            async for chunk in process_query_stream(formatted_messages, llm_config):
                assistant_response += chunk
                await websocket.send_json({"token": chunk})
            
            # Save assistant message
            assistant_message = ChatMessageCreate(role="assistant", content=assistant_response)
            create_chat_message(db, assistant_message, session_id)

            # Auto-title: on first exchange, generate a title from the user's message
            if not session.title:
                try:
                    title_prompt = f"Summarize this in 3-5 words: {message_data}"
                    title_cfg = {
                        "provider_name": llm_config_record.provider.name,
                        "model_name": llm_config_record.model_name,
                        "api_key": llm_config["api_key"],
                        "temperature": 0,
                        "max_tokens": 20,
                    }
                    title_result = process_query(title_prompt, title_cfg)
                    session.title = title_result["response"].strip().strip('"').strip("'")
                    db.commit()
                    await websocket.send_json({"title": session.title})
                except Exception:
                    pass  # Title is a nice-to-have; don't break chat on failure

            await websocket.send_json({"end": True})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"error": str(e)})
