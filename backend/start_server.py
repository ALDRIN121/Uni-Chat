#!/usr/bin/env python3
"""
Uni Chat Backend Server
Starts the FastAPI server with configurable host and port from environment variables.
"""

import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
