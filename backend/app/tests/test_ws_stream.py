import asyncio
import websockets
import json

async def test_ws_stream():
    uri = "ws://localhost:8000/ws/chat"
    async with websockets.connect(uri) as websocket:
        await websocket.send(json.dumps({"query": "What is the capital of France?"}))
        async for message in websocket:
            data = json.loads(message)
            print(data)
            if data.get("end"):
                break

if __name__ == "__main__":
    asyncio.run(test_ws_stream())
