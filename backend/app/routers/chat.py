from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from app.services.langchain_service import process_query, process_query_stream
from app.utils.timer import timed
import asyncio

router = APIRouter()

class ChatRequest(BaseModel):
    query: str

@router.post("/chat")
@timed
async def chat_endpoint(request: ChatRequest):
    try:
        return process_query(request.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            query = data.get("query")
            if not query:
                await websocket.send_json({"error": "No query provided."})
                continue
            async for chunk in process_query_stream(query):
                await websocket.send_json({"token": chunk})
            await websocket.send_json({"end": True})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        await websocket.close()
