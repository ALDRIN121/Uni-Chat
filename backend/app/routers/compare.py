import asyncio
from fastapi import APIRouter, WebSocket, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_user_from_token
from app.crud import get_llm_config_by_id, get_decrypted_api_key
from app.services.langchain_service import process_query_stream

router = APIRouter()


@router.websocket("/ws/compare")
async def compare_ws(
    websocket: WebSocket,
    token: str | None = None,
    db: Session = Depends(get_db),
):
    user = get_user_from_token(token, db) if token else None
    if user is None:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message")
            config_ids = data.get("config_ids", [])
            if not message or not config_ids:
                await websocket.send_json({"error": "message and config_ids required"})
                continue
            if len(config_ids) > 4:
                await websocket.send_json({"error": "max 4 configs"})
                continue

            queue: asyncio.Queue = asyncio.Queue()

            async def run(cid: int):
                cfg_row = get_llm_config_by_id(db, cid)
                if not cfg_row or cfg_row.user_id != user.id:
                    await queue.put({"config_id": cid, "error": "config not found"})
                    return
                llm_config = {
                    "provider_name": cfg_row.provider.name,
                    "model_name": cfg_row.model_name,
                    "api_key": get_decrypted_api_key(cfg_row),
                    "temperature": cfg_row.config_params.get("temperature", 0),
                    "max_tokens": cfg_row.config_params.get("max_tokens"),
                }
                try:
                    async for tok in process_query_stream(
                        [{"role": "user", "content": message}], llm_config
                    ):
                        await queue.put({"config_id": cid, "token": tok})
                    await queue.put({"config_id": cid, "end": True})
                except Exception as e:
                    await queue.put({"config_id": cid, "error": str(e)})

            tasks = [asyncio.create_task(run(c)) for c in config_ids]
            done_count = 0
            while done_count < len(config_ids):
                frame = await queue.get()
                await websocket.send_json(frame)
                if frame.get("end") or frame.get("error"):
                    done_count += 1
            await asyncio.gather(*tasks)
    except Exception:
        pass
