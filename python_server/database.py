"""
Database configuration and session management
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from models import Base
import logging

logger = logging.getLogger(__name__)

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# Convert postgresql:// to postgresql+psycopg2:// for sync connections
if DATABASE_URL.startswith("postgresql://"):
    SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    SYNC_DATABASE_URL = DATABASE_URL

# For now, let's use sync connections only to simplify setup
# Convert to asyncpg for async connections when needed
# ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create sync engine
engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,  # Set to True for SQL logging
    pool_pre_ping=True,
    pool_recycle=300
)

# For now, we'll use sync operations only
# async_engine = create_async_engine(
#     ASYNC_DATABASE_URL,
#     echo=False,
#     pool_pre_ping=True,
#     pool_recycle=300
# )

# Create session makers
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# AsyncSessionLocal = async_sessionmaker(
#     bind=async_engine,
#     class_=AsyncSession,
#     expire_on_commit=False
# )

async def create_tables():
    """Create database tables"""
    try:
        # Use sync engine for table creation
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

def get_db_session():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# async def get_async_db_session():
#     """Dependency to get async database session"""
#     async with AsyncSessionLocal() as session:
#         try:
#             yield session
#         finally:
#             await session.close()

# Storage interface similar to the TypeScript version
class DatabaseStorage:
    """Database storage operations"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    # User operations
    def get_user(self, user_id: str):
        from models import User
        return self.db.query(User).filter(User.id == user_id).first()
    
    def upsert_user(self, user_data: dict):
        from models import User
        user = self.get_user(user_data.get("id"))
        
        if user:
            # Update existing user
            for key, value in user_data.items():
                if hasattr(user, key):
                    setattr(user, key, value)
        else:
            # Create new user
            user = User(**user_data)
            self.db.add(user)
        
        self.db.commit()
        self.db.refresh(user)
        return user
    
    # Exam operations
    def create_exam(self, exam_data: dict):
        from models import Exam
        exam = Exam(**exam_data)
        self.db.add(exam)
        self.db.commit()
        self.db.refresh(exam)
        return exam
    
    def get_exam(self, exam_id: str):
        from models import Exam
        return self.db.query(Exam).filter(Exam.id == exam_id).first()
    
    def get_exams_by_instructor(self, instructor_id: str):
        from models import Exam
        return self.db.query(Exam).filter(Exam.instructor_id == instructor_id).all()
    
    def get_active_exams_for_student(self, user_id: str):
        from models import Exam
        return self.db.query(Exam).filter(Exam.published == True).all()
    
    def update_exam(self, exam_id: str, updates: dict):
        from models import Exam
        exam = self.get_exam(exam_id)
        if exam:
            for key, value in updates.items():
                if hasattr(exam, key):
                    setattr(exam, key, value)
            self.db.commit()
            self.db.refresh(exam)
        return exam
    
    # Question operations
    def create_question(self, question_data: dict):
        from models import Question
        question = Question(**question_data)
        self.db.add(question)
        self.db.commit()
        self.db.refresh(question)
        return question
    
    def get_questions_by_exam(self, exam_id: str):
        from models import Question
        return self.db.query(Question).filter(
            Question.exam_id == exam_id
        ).order_by(Question.order).all()
    
    def update_question(self, question_id: str, updates: dict):
        from models import Question
        question = self.db.query(Question).filter(Question.id == question_id).first()
        if question:
            for key, value in updates.items():
                if hasattr(question, key):
                    setattr(question, key, value)
            self.db.commit()
            self.db.refresh(question)
        return question
    
    # Attempt operations
    def create_attempt(self, attempt_data: dict):
        from models import Attempt
        attempt = Attempt(**attempt_data)
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)
        return attempt
    
    def get_attempt(self, attempt_id: str):
        from models import Attempt
        return self.db.query(Attempt).filter(Attempt.id == attempt_id).first()
    
    def get_attempts_by_user(self, user_id: str):
        from models import Attempt
        return self.db.query(Attempt).filter(
            Attempt.user_id == user_id
        ).order_by(Attempt.created_at.desc()).all()
    
    def get_active_attempt(self, user_id: str, exam_id: str):
        from models import Attempt, AttemptStatus
        return self.db.query(Attempt).filter(
            Attempt.user_id == user_id,
            Attempt.exam_id == exam_id,
            Attempt.status == AttemptStatus.IN_PROGRESS
        ).first()
    
    def update_attempt(self, attempt_id: str, updates: dict):
        from models import Attempt
        attempt = self.get_attempt(attempt_id)
        if attempt:
            for key, value in updates.items():
                if hasattr(attempt, key):
                    setattr(attempt, key, value)
            self.db.commit()
            self.db.refresh(attempt)
        return attempt
    
    # Audit operations
    def create_audit_entry(self, entry_data: dict):
        from models import AuditLog
        entry = AuditLog(**entry_data)
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

def get_storage(db: Session = None) -> DatabaseStorage:
    """Get database storage instance"""
    if db is None:
        db = next(get_db_session())
    return DatabaseStorage(db)