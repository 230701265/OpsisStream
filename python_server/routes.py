"""
API Routes for the FastAPI backend
Replicates all endpoints from the original Express.js server
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

from database import get_db_session, get_storage
from auth import get_current_user, require_instructor, authenticate_replit_user
from models import (
    User, UserResponse, UserCreate,
    Exam, ExamResponse, ExamCreate, ExamUpdate,
    Question, QuestionResponse, QuestionCreate, QuestionUpdate,
    Attempt, AttemptResponse, AttemptCreate, AttemptUpdate,
    AuditLogCreate, AttemptStatus, UserRole
)
from nlp_service import nlp_service
import logging

logger = logging.getLogger(__name__)

# Create routers
auth_router = APIRouter()
exam_router = APIRouter()
question_router = APIRouter()
attempt_router = APIRouter()
nlp_router = APIRouter()

# Authentication Routes
@auth_router.get("/user", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user

@auth_router.post("/login")
async def login(request: Request, db: Session = Depends(get_db_session)):
    """Handle authentication login"""
    try:
        # This would handle the actual OIDC flow in production
        # For now, return a development user
        user_data = {
            "id": "dev-user-123",
            "email": "dev@example.com",
            "first_name": "Dev",
            "last_name": "User",
            "role": UserRole.INSTRUCTOR
        }
        
        storage = get_storage(db)
        user = storage.upsert_user(user_data)
        
        return {"message": "Login successful", "user": user}
    
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=400, detail="Login failed")

@auth_router.post("/logout")
async def logout(response: Response):
    """Handle user logout"""
    # In production, you'd invalidate the session/token here
    return {"message": "Logged out successfully"}

# Exam Routes
@exam_router.get("/exams", response_model=List[ExamResponse])
async def get_exams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Get exams based on user role"""
    storage = get_storage(db)
    
    if current_user.role == UserRole.INSTRUCTOR:
        exams = storage.get_exams_by_instructor(current_user.id)
    else:
        exams = storage.get_active_exams_for_student(current_user.id)
    
    return exams

@exam_router.get("/exams/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Get specific exam by ID"""
    storage = get_storage(db)
    exam = storage.get_exam(exam_id)
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check permissions
    if (current_user.role != UserRole.INSTRUCTOR and 
        current_user.id != exam.instructor_id and 
        not exam.published):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return exam

@exam_router.post("/exams", response_model=ExamResponse)
async def create_exam(
    exam_data: ExamCreate,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db_session)
):
    """Create a new exam"""
    storage = get_storage(db)
    
    exam_dict = exam_data.model_dump()
    exam_dict["instructor_id"] = current_user.id
    
    exam = storage.create_exam(exam_dict)
    
    # Create audit entry
    storage.create_audit_entry({
        "user_id": current_user.id,
        "action": "create_exam",
        "entity_type": "exam",
        "entity_id": str(exam.id),
        "audit_metadata": {"title": exam.title}
    })
    
    return exam

@exam_router.put("/exams/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: str,
    exam_updates: ExamUpdate,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db_session)
):
    """Update an existing exam"""
    storage = get_storage(db)
    exam = storage.get_exam(exam_id)
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    updates = exam_updates.model_dump(exclude_unset=True)
    updated_exam = storage.update_exam(exam_id, updates)
    
    # Create audit entry
    storage.create_audit_entry({
        "user_id": current_user.id,
        "action": "update_exam",
        "entity_type": "exam",
        "entity_id": str(exam_id),
        "audit_metadata": updates
    })
    
    return updated_exam

# Question Routes
@question_router.get("/exams/{exam_id}/questions", response_model=List[QuestionResponse])
async def get_exam_questions(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Get all questions for an exam"""
    storage = get_storage(db)
    
    # Check if user has access to exam
    exam = storage.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if (current_user.role != UserRole.INSTRUCTOR and 
        current_user.id != exam.instructor_id and 
        not exam.published):
        raise HTTPException(status_code=403, detail="Access denied")
    
    questions = storage.get_questions_by_exam(exam_id)
    return questions

@question_router.post("/questions", response_model=QuestionResponse)
async def create_question(
    question_data: QuestionCreate,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db_session)
):
    """Create a new question"""
    storage = get_storage(db)
    
    # Verify exam ownership
    exam = storage.get_exam(str(question_data.exam_id))
    if not exam or exam.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    question_dict = question_data.model_dump()
    
    # Perform NLP analysis on question text
    if "text" in question_dict.get("content", {}):
        analysis = nlp_service.analyze_question_text(question_dict["content"]["text"])
        question_dict.update({
            "difficulty_score": analysis["difficulty_score"],
            "readability_score": analysis["readability"]["flesch_score"],
            "keywords": analysis["keywords"]
        })
    
    question = storage.create_question(question_dict)
    
    # Create audit entry
    storage.create_audit_entry({
        "user_id": current_user.id,
        "action": "create_question",
        "entity_type": "question",
        "entity_id": str(question.id),
        "audit_metadata": {"exam_id": str(question_data.exam_id)}
    })
    
    return question

@question_router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: str,
    question_updates: QuestionUpdate,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db_session)
):
    """Update a question"""
    storage = get_storage(db)
    
    question = storage.update_question(question_id, question_updates.model_dump(exclude_unset=True))
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Verify ownership through exam
    exam = storage.get_exam(str(question.exam_id))
    if not exam or exam.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return question

# Attempt Routes
@attempt_router.get("/user/attempts", response_model=List[AttemptResponse])
async def get_user_attempts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Get all attempts for current user"""
    storage = get_storage(db)
    attempts = storage.get_attempts_by_user(current_user.id)
    return attempts

@attempt_router.get("/user/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Get user statistics"""
    storage = get_storage(db)
    attempts = storage.get_attempts_by_user(current_user.id)
    
    # Calculate stats
    total_attempts = len(attempts)
    completed_attempts = [a for a in attempts if a.status == AttemptStatus.GRADED and a.score is not None]
    
    average_score = 0
    if completed_attempts:
        average_score = sum(a.score for a in completed_attempts) / len(completed_attempts)
    
    # Estimate time spent (simplified)
    time_spent = sum(
        60 * (a.time_limit or 60) for a in attempts 
        if a.status in [AttemptStatus.SUBMITTED, AttemptStatus.GRADED]
    )
    
    return {
        "totalAttempts": total_attempts,
        "averageScore": round(average_score, 2),
        "completedExams": len(completed_attempts),
        "timeSpent": time_spent  # in minutes
    }

@attempt_router.post("/exams/{exam_id}/start", response_model=AttemptResponse)
async def start_exam_attempt(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Start a new exam attempt"""
    storage = get_storage(db)
    
    # Check if exam exists and is accessible
    exam = storage.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if not exam.published and current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=403, detail="Exam not available")
    
    # Check for existing active attempt
    active_attempt = storage.get_active_attempt(current_user.id, exam_id)
    if active_attempt:
        return active_attempt
    
    # Create new attempt
    attempt_data = {
        "exam_id": exam_id,
        "user_id": current_user.id,
        "started_at": datetime.utcnow(),
        "time_limit": exam.time_limit,
        "status": AttemptStatus.IN_PROGRESS
    }
    
    attempt = storage.create_attempt(attempt_data)
    
    # Create audit entry
    storage.create_audit_entry({
        "user_id": current_user.id,
        "action": "start_attempt",
        "entity_type": "attempt",
        "entity_id": str(attempt.id),
        "audit_metadata": {"exam_id": exam_id}
    })
    
    return attempt

@attempt_router.get("/attempts/{attempt_id}", response_model=AttemptResponse)
async def get_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Get specific attempt"""
    storage = get_storage(db)
    attempt = storage.get_attempt(attempt_id)
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Check permissions
    if attempt.user_id != current_user.id and current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return attempt

@attempt_router.put("/attempts/{attempt_id}", response_model=AttemptResponse)
async def update_attempt(
    attempt_id: str,
    attempt_updates: AttemptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    """Update an attempt (save answers, submit, etc.)"""
    storage = get_storage(db)
    attempt = storage.get_attempt(attempt_id)
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    updates = attempt_updates.model_dump(exclude_unset=True)
    
    # If submitting, add timestamp
    if updates.get("status") == AttemptStatus.SUBMITTED:
        updates["submitted_at"] = datetime.utcnow()
        
        # Perform NLP analysis on essay answers
        if updates.get("answers"):
            nlp_analysis = await analyze_attempt_answers(updates["answers"], attempt.exam_id, db)
            updates.update(nlp_analysis)
    
    updated_attempt = storage.update_attempt(attempt_id, updates)
    
    # Create audit entry
    storage.create_audit_entry({
        "user_id": current_user.id,
        "action": "update_attempt",
        "entity_type": "attempt",
        "entity_id": attempt_id,
        "audit_metadata": {"status": updates.get("status", attempt.status)}
    })
    
    return updated_attempt

# NLP Routes
@nlp_router.post("/analyze-text")
async def analyze_text(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Analyze text using NLP"""
    text = data.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    analysis = {
        "text": text,
        "word_count": len(text.split()),
        "readability_score": nlp_service.calculate_readability(text)["flesch_score"],
        "difficulty_score": nlp_service.calculate_difficulty_score(text),
        "sentiment_score": nlp_service.analyze_sentiment(text)["compound"],
        "keywords": nlp_service.extract_keywords(text),
        "language_quality": nlp_service.analyze_writing_quality(text)
    }
    
    return analysis

@nlp_router.post("/check-plagiarism")
async def check_plagiarism(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Check text for potential plagiarism"""
    text = data.get("text", "")
    reference_texts = data.get("reference_texts", [])
    
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    result = nlp_service.check_plagiarism(text, reference_texts)
    return result

@nlp_router.post("/grade-essay")
async def grade_essay(
    data: Dict[str, Any],
    current_user: User = Depends(require_instructor)
):
    """Provide automated essay grading"""
    essay_text = data.get("essay_text", "")
    question_text = data.get("question_text", "")
    max_score = data.get("max_score", 10.0)
    
    if not essay_text or not question_text:
        raise HTTPException(status_code=400, detail="Essay text and question text are required")
    
    result = nlp_service.grade_essay_automated(essay_text, question_text, max_score)
    return result

# Helper functions
async def analyze_attempt_answers(answers: Dict[str, Any], exam_id: str, db: Session) -> Dict[str, Any]:
    """Analyze answers with NLP and return analysis data"""
    storage = get_storage(db)
    
    # Get exam questions for context
    questions = storage.get_questions_by_exam(exam_id)
    
    # Analyze essay and short answer responses
    essay_analyses = []
    total_plagiarism_score = 0
    plagiarism_count = 0
    
    for question in questions:
        question_id = str(question.id)
        if question_id in answers:
            answer = answers[question_id]
            
            if question.type in ["essay", "short_answer"] and isinstance(answer, str) and answer.strip():
                # Analyze writing quality and sentiment
                quality_analysis = nlp_service.analyze_writing_quality(answer)
                sentiment = nlp_service.analyze_sentiment(answer)
                
                # Check plagiarism
                plagiarism_result = nlp_service.check_plagiarism(answer)
                total_plagiarism_score += plagiarism_result["similarity_score"]
                plagiarism_count += 1
                
                essay_analyses.append({
                    "question_id": question_id,
                    "quality": quality_analysis,
                    "sentiment": sentiment,
                    "plagiarism": plagiarism_result
                })
    
    # Calculate overall scores
    avg_plagiarism_score = total_plagiarism_score / max(plagiarism_count, 1)
    
    # Aggregate sentiment analysis
    if essay_analyses:
        avg_sentiment = {
            "positive": sum(a["sentiment"]["positive"] for a in essay_analyses) / len(essay_analyses),
            "neutral": sum(a["sentiment"]["neutral"] for a in essay_analyses) / len(essay_analyses),
            "negative": sum(a["sentiment"]["negative"] for a in essay_analyses) / len(essay_analyses),
            "compound": sum(a["sentiment"]["compound"] for a in essay_analyses) / len(essay_analyses)
        }
        
        # Aggregate writing quality
        avg_quality = {
            "overall_quality_score": sum(a["quality"]["overall_quality_score"] for a in essay_analyses) / len(essay_analyses),
            "vocabulary_richness": sum(a["quality"]["vocabulary_richness"] for a in essay_analyses) / len(essay_analyses),
            "grammar_score": sum(a["quality"]["grammar_score"] for a in essay_analyses) / len(essay_analyses)
        }
    else:
        avg_sentiment = {"positive": 0, "neutral": 1, "negative": 0, "compound": 0}
        avg_quality = {"overall_quality_score": 0, "vocabulary_richness": 0, "grammar_score": 0}
    
    return {
        "plagiarism_score": round(avg_plagiarism_score, 3),
        "sentiment_analysis": avg_sentiment,
        "writing_quality": avg_quality
    }