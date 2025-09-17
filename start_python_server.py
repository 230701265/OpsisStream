#!/usr/bin/env python3
"""
Startup script for the Python FastAPI server
This replaces the Node.js/Express server
"""
import sys
import os

# Add python_server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python_server'))

# Import and run the FastAPI application
if __name__ == "__main__":
    from python_server.main import app
    import uvicorn
    
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5000))  # Use port 5000 to match existing setup
    
    # Run the server
    uvicorn.run(
        "python_server.main:app",
        host=host,
        port=port,
        reload=True,
        reload_dirs=["python_server"],
        log_level="info"
    )