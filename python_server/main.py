#!/usr/bin/env python3
"""
OPSIS - FastAPI Backend
Main application entry point
"""
import os
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn
from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
import logging

from database import create_tables, get_db_session
from auth import setup_auth, get_current_user
from routes import auth_router, exam_router, question_router, attempt_router, nlp_router
from models import User
from websocket_manager import manager

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting OPSIS FastAPI server...")
    
    # Create database tables
    await create_tables()
    
    # Setup NLTK data
    try:
        import nltk
        nltk.download('punkt', quiet=True)
        nltk.download('vader_lexicon', quiet=True)
        nltk.download('stopwords', quiet=True)
        logger.info("NLTK data downloaded successfully")
    except Exception as e:
        logger.warning(f"Could not download NLTK data: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down OPSIS FastAPI server...")

# Create FastAPI application
app = FastAPI(
    title="OPSIS - Accessible Exam Platform API",
    description="FastAPI backend for OPSIS with NLP capabilities",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # Vite dev server
        "https://*.replit.dev",   # Replit domains
        "https://*.repl.co",      # Legacy Replit domains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # In production, specify exact hosts
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(exam_router, prefix="/api", tags=["exams"])
app.include_router(question_router, prefix="/api", tags=["questions"])
app.include_router(attempt_router, prefix="/api", tags=["attempts"])
app.include_router(nlp_router, prefix="/api/nlp", tags=["nlp"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "OPSIS FastAPI Backend", "version": "2.0.0"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "OPSIS API"}

# WebSocket endpoint for real-time features
@app.websocket("/ws")
async def websocket_endpoint(websocket, current_user: User = Depends(get_current_user)):
    await manager.connect(websocket, current_user.id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.handle_message(websocket, data)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket, current_user.id)

if __name__ == "__main__":
    # Run the server
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        reload_dirs=["python_server"],
        log_level="info"
    )