from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.quiz import Quiz, QuizQuestion, QuizAnswer
from app.models.user import User
from app.models.student import Student
from app.routes.auth import get_current_user
from pydantic import BaseModel
import json

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

class QuestionCreate(BaseModel):
    question_text: str
    question_type: str
    options: list[str] = []
    correct_answer: str
    points: float = 1.0

class QuizCreate(BaseModel):
    title: str
    description: str
    duration_minutes: int = 30
    questions: list[QuestionCreate] = []

@router.get("/")
def get_all_quizzes(db: Session = Depends(get_db)):
    """Get all quizzes"""
    quizzes = db.query(Quiz).all()
    return [
        {
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "duration": q.duration_minutes,
            "questionCount": q.total_questions,
            "status": "published",
            "questions": []
        }
        for q in quizzes
    ]

@router.post("/")
def create_quiz(
    quiz: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new quiz"""
    role_upper = current_user.role.upper()
    if role_upper not in ["TEACHER", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers can create quizzes")
    
    db_quiz = Quiz(
        title=quiz.title,
        description=quiz.description,
        created_by=current_user.id,
        duration_minutes=quiz.duration_minutes,
        total_questions=len(quiz.questions)
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    
    for q in quiz.questions:
        question = QuizQuestion(
            quiz_id=db_quiz.id,
            question_text=q.question_text,
            question_type=q.question_type,
            options=json.dumps(q.options) if q.options else "",
            correct_answer=q.correct_answer,
            points=q.points
        )
        db.add(question)
    db.commit()
    
    return {
        "id": db_quiz.id,
        "title": db_quiz.title,
        "description": db_quiz.description,
        "duration": db_quiz.duration_minutes,
        "questionCount": db_quiz.total_questions
    }

@router.get("/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    """Get a specific quiz with questions"""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "duration": quiz.duration_minutes,
        "questionCount": len(questions),
        "questions": [
            {
                "id": q.id,
                "text": q.question_text,
                "type": q.question_type,
                "options": json.loads(q.options) if q.options else [],
                "correctOption": q.correct_answer
            }
            for q in questions
        ]
    }

@router.put("/{quiz_id}")
def update_quiz(
    quiz_id: int,
    quiz: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a quiz"""
    db_quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.created_by == current_user.id).first()
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    db_quiz.title = quiz.title
    db_quiz.description = quiz.description
    db_quiz.duration_minutes = quiz.duration_minutes
    db.commit()
    
    return {"success": True, "id": db_quiz.id}

@router.delete("/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a quiz"""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.created_by == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    db.delete(quiz)
    db.commit()
    return {"success": True}

@router.post("/{quiz_id}/submit")
def submit_quiz_answer(
    quiz_id: int,
    submission: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit an answer to a quiz"""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    score = submission.get("score", 0)
    
    return {
        "success": True,
        "score": score,
        "message": f"Quiz submitted with score {score}"
    }
