"""
Database models using SQLAlchemy
Replicates the schema from shared/schema.ts
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, Float, JSON, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum

# SQLAlchemy Base
Base = declarative_base()

# Pydantic models for API validation
class UserRole(str, Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"

class AttemptStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    GRADED = "graded"

# SQLAlchemy Models
class Session(Base):
    """Session storage table for authentication"""
    __tablename__ = "sessions"
    
    sid = Column(String, primary_key=True)
    sess = Column(JSON, nullable=False)
    expire = Column(DateTime, nullable=False)
    
    __table_args__ = (
        Index('IDX_session_expire', 'expire'),
    )

class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True)
    first_name = Column("first_name", String)
    last_name = Column("last_name", String)
    profile_image_url = Column("profile_image_url", String)
    role = Column(String, nullable=False, default=UserRole.STUDENT)
    preferences = Column(JSON, default=dict)
    created_at = Column("created_at", DateTime, default=func.now())
    updated_at = Column("updated_at", DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    created_exams = relationship("Exam", back_populates="instructor", foreign_keys="[Exam.instructor_id]")
    attempts = relationship("Attempt", back_populates="user")
    audit_entries = relationship("AuditLog", back_populates="user")

class Exam(Base):
    """Exam model"""
    __tablename__ = "exams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    description = Column(Text)
    instructor_id = Column("instructor_id", String, ForeignKey("users.id"), nullable=False)
    time_limit = Column("time_limit", Integer)  # in minutes
    published = Column(Boolean, nullable=False, default=False)
    settings = Column(JSON, default=dict)
    created_at = Column("created_at", DateTime, default=func.now())
    updated_at = Column("updated_at", DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    instructor = relationship("User", back_populates="created_exams", foreign_keys=[instructor_id])
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="exam")

class Question(Base):
    """Question model"""
    __tablename__ = "questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column("exam_id", UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    content = Column(JSON, nullable=False)  # stores question text, options, etc.
    correct_answer = Column("correct_answer", JSON)
    points = Column(Float, nullable=False, default=1.0)
    order = Column(Integer, nullable=False)
    created_at = Column("created_at", DateTime, default=func.now())
    
    # NLP Analysis fields
    difficulty_score = Column("difficulty_score", Float)  # Auto-calculated
    readability_score = Column("readability_score", Float)  # Auto-calculated
    keywords = Column(JSON)  # Extracted keywords
    
    # Relationships
    exam = relationship("Exam", back_populates="questions")

class Attempt(Base):
    """Exam attempt model"""
    __tablename__ = "attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column("exam_id", UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    user_id = Column("user_id", String, ForeignKey("users.id"), nullable=False)
    started_at = Column("started_at", DateTime, nullable=False)
    submitted_at = Column("submitted_at", DateTime)
    time_limit = Column("time_limit", Integer)  # copied from exam at start
    answers = Column(JSON, default=dict)
    score = Column(Float)
    status = Column(String, nullable=False, default=AttemptStatus.IN_PROGRESS)
    created_at = Column("created_at", DateTime, default=func.now())
    
    # NLP Analysis fields
    plagiarism_score = Column("plagiarism_score", Float)  # Auto-calculated
    sentiment_analysis = Column("sentiment_analysis", JSON)  # Per question sentiment
    writing_quality = Column("writing_quality", JSON)  # Writing quality metrics
    
    # Relationships
    exam = relationship("Exam", back_populates="attempts")
    user = relationship("User", back_populates="attempts")

class AuditLog(Base):
    """Audit log model"""
    __tablename__ = "audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column("user_id", String, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    entity_type = Column("entity_type", String)
    entity_id = Column("entity_id", String)
    audit_metadata = Column("metadata", JSON, default=dict)  # Use audit_metadata as python name, metadata as column name
    created_at = Column("created_at", DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="audit_entries")

# Pydantic schemas for API
class UserBase(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    role: UserRole = UserRole.STUDENT
    preferences: Dict[str, Any] = Field(default_factory=dict)

class UserCreate(UserBase):
    id: str

class UserUpdate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    time_limit: Optional[int] = None
    published: bool = False
    settings: Dict[str, Any] = Field(default_factory=dict)

class ExamCreate(ExamBase):
    pass

class ExamUpdate(ExamBase):
    title: Optional[str] = None
    published: Optional[bool] = None

class ExamResponse(ExamBase):
    id: uuid.UUID
    instructor_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    type: QuestionType
    content: Dict[str, Any]
    correct_answer: Optional[Dict[str, Any]] = None
    points: float = 1.0
    order: int

class QuestionCreate(QuestionBase):
    exam_id: uuid.UUID

class QuestionUpdate(QuestionBase):
    type: Optional[QuestionType] = None
    content: Optional[Dict[str, Any]] = None
    points: Optional[float] = None
    order: Optional[int] = None

class QuestionResponse(QuestionBase):
    id: uuid.UUID
    exam_id: uuid.UUID
    created_at: datetime
    difficulty_score: Optional[float] = None
    readability_score: Optional[float] = None
    keywords: Optional[List[str]] = None
    
    class Config:
        from_attributes = True

class AttemptBase(BaseModel):
    answers: Dict[str, Any] = Field(default_factory=dict)
    status: AttemptStatus = AttemptStatus.IN_PROGRESS

class AttemptCreate(AttemptBase):
    exam_id: uuid.UUID

class AttemptUpdate(AttemptBase):
    answers: Optional[Dict[str, Any]] = None
    status: Optional[AttemptStatus] = None
    score: Optional[float] = None

class AttemptResponse(AttemptBase):
    id: uuid.UUID
    exam_id: uuid.UUID
    user_id: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    time_limit: Optional[int] = None
    score: Optional[float] = None
    plagiarism_score: Optional[float] = None
    sentiment_analysis: Optional[Dict[str, Any]] = None
    writing_quality: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class AuditLogCreate(BaseModel):
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    audit_metadata: Dict[str, Any] = Field(default_factory=dict)

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    audit_metadata: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True

# NLP Response models
class TextAnalysisResponse(BaseModel):
    text: str
    word_count: int
    readability_score: float
    difficulty_score: float
    sentiment_score: float
    keywords: List[str]
    language_quality: Dict[str, Any]

class PlagiarismCheckResponse(BaseModel):
    similarity_score: float
    potential_matches: List[Dict[str, Any]]
    risk_level: str  # "low", "medium", "high"

class EssayGradingResponse(BaseModel):
    suggested_score: float
    max_score: float
    feedback: Dict[str, Any]
    strengths: List[str]
    areas_for_improvement: List[str]
    writing_quality: Dict[str, Any]