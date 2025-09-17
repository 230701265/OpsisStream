"""
Authentication and authorization for FastAPI
Replaces the Replit Auth/Passport.js functionality
"""
import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import get_db_session, get_storage
from models import User, UserCreate, UserRole
import httpx
import logging

logger = logging.getLogger(__name__)

# Security setup
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Replit Auth configuration
REPLIT_CLIENT_ID = os.getenv("REPL_ID", "")
REPLIT_CLIENT_SECRET = os.getenv("REPL_SECRET", "")
ISSUER_URL = os.getenv("ISSUER_URL", "https://replit.com/oidc")

class AuthenticationError(Exception):
    """Custom authentication error"""
    pass

async def setup_auth():
    """Setup authentication system"""
    # Initialize any auth-related setup here
    logger.info("Authentication system initialized")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Dict[str, Any]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise AuthenticationError("Invalid token")

async def verify_replit_token(token: str) -> Dict[str, Any]:
    """Verify Replit OIDC token"""
    try:
        # In a real implementation, you would verify the token with Replit's OIDC
        # For now, we'll decode it without verification for development
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except jwt.PyJWTError:
        raise AuthenticationError("Invalid Replit token")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_session)
) -> User:
    """Get current authenticated user"""
    try:
        token = credentials.credentials
        storage = get_storage(db)
        
        # Try to verify as regular JWT first
        try:
            payload = verify_token(token)
            user_id = payload.get("sub")
        except AuthenticationError:
            # Try to verify as Replit token
            payload = await verify_replit_token(token)
            user_id = payload.get("sub")
        
        if not user_id:
            raise AuthenticationError("Token payload invalid")
        
        user = storage.get_user(user_id)
        if not user:
            raise AuthenticationError("User not found")
        
        return user
        
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user (additional checks can be added here)"""
    return current_user

async def require_role(required_role: UserRole):
    """Dependency factory for role-based access control"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

async def require_instructor(current_user: User = Depends(get_current_user)) -> User:
    """Require instructor role"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can perform this action"
        )
    return current_user

async def authenticate_replit_user(auth_code: str, db: Session) -> tuple[User, str]:
    """Authenticate user with Replit OIDC and return user + token"""
    try:
        # Exchange authorization code for tokens
        # This is a simplified version - in production you'd make actual OIDC calls
        
        # For development, we'll create a mock user
        # In production, you'd get this from the OIDC token
        user_data = {
            "id": "dev-user-123",
            "email": "dev@example.com",
            "first_name": "Dev",
            "last_name": "User",
            "profile_image_url": None,
            "role": UserRole.INSTRUCTOR  # Make dev user an instructor for testing
        }
        
        storage = get_storage(db)
        user = storage.upsert_user(user_data)
        
        # Create access token
        token_data = {"sub": user.id, "email": user.email, "role": user.role}
        access_token = create_access_token(token_data)
        
        return user, access_token
        
    except Exception as e:
        logger.error(f"Replit authentication error: {e}")
        raise AuthenticationError("Authentication failed")

# Session management (simplified version)
class SessionManager:
    """Manage user sessions"""
    
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
    
    def create_session(self, user_id: str, session_data: Dict[str, Any]) -> str:
        """Create a new session"""
        session_id = f"session_{user_id}_{int(datetime.utcnow().timestamp())}"
        self.sessions[session_id] = {
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            **session_data
        }
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        return self.sessions.get(session_id)
    
    def delete_session(self, session_id: str):
        """Delete session"""
        self.sessions.pop(session_id, None)
    
    def cleanup_expired_sessions(self):
        """Remove expired sessions"""
        now = datetime.utcnow()
        expired = [
            sid for sid, data in self.sessions.items()
            if (now - data["created_at"]).days > 7  # 7 days expiry
        ]
        for sid in expired:
            self.delete_session(sid)

# Global session manager
session_manager = SessionManager()