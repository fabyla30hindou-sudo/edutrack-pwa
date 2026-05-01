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

def parse_options(raw_options: str | None) -> list[str]:
    if not raw_options:
        return []
    try:
        parsed = json.loads(raw_options)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []

def serialize_question(question: QuizQuestion) -> dict:
    return {
        "id": question.id,
        "question_text": question.question_text,
        "text": question.question_text,
        "question_type": question.question_type,
        "type": question.question_type,
        "options": parse_options(question.options),
        "correct_answer": question.correct_answer,
        "correctOption": question.correct_answer,
        "points": question.points,
    }

def serialize_quiz(quiz: Quiz, db: Session) -> dict:
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "duration": quiz.duration_minutes,
        "duration_minutes": quiz.duration_minutes,
        "questionCount": len(questions),
        "total_questions": len(questions),
        "status": "published",
        "questions": [serialize_question(q) for q in questions],
    }

@router.get("/")
def get_all_quizzes(db: Session = Depends(get_db)):
    """Get all quizzes with their questions."""
    quizzes = db.query(Quiz).all()
    return [serialize_quiz(q, db) for q in quizzes]

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
    return serialize_quiz(db_quiz, db)

@router.get("/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    """Get a specific quiz with questions"""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return serialize_quiz(quiz, db)

@router.put("/{quiz_id}")
def update_quiz(
    quiz_id: int,
    quiz: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a quiz"""
    query = db.query(Quiz).filter(Quiz.id == quiz_id)
    if current_user.role.upper() not in ["ADMIN", "SUPERADMIN"]:
        query = query.filter(Quiz.created_by == current_user.id)
    db_quiz = query.first()
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    db_quiz.title = quiz.title
    db_quiz.description = quiz.description
    db_quiz.duration_minutes = quiz.duration_minutes
    db_quiz.total_questions = len(quiz.questions)

    db.query(QuizAnswer).filter(QuizAnswer.quiz_id == quiz_id).delete()
    old_questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    for old_question in old_questions:
        db.delete(old_question)

    for q in quiz.questions:
        db.add(QuizQuestion(
            quiz_id=db_quiz.id,
            question_text=q.question_text,
            question_type=q.question_type,
            options=json.dumps(q.options) if q.options else "",
            correct_answer=q.correct_answer,
            points=q.points
        ))

    db.commit()
    return serialize_quiz(db_quiz, db)

@router.delete("/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a quiz"""
    query = db.query(Quiz).filter(Quiz.id == quiz_id)
    if current_user.role.upper() not in ["ADMIN", "SUPERADMIN"]:
        query = query.filter(Quiz.created_by == current_user.id)
    quiz = query.first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    db.query(QuizAnswer).filter(QuizAnswer.quiz_id == quiz_id).delete()
    db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).delete()
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
    
    submitted_answers = submission.get("answers")
    if isinstance(submitted_answers, dict):
        questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
        total_points = sum(q.points or 1.0 for q in questions) or 1.0
        earned_points = 0.0

        for question in questions:
            answer = str(submitted_answers.get(str(question.id), ""))
            is_correct = answer.strip().lower() == (question.correct_answer or "").strip().lower()
            points_earned = (question.points or 1.0) if is_correct else 0.0
            earned_points += points_earned
            db.add(QuizAnswer(
                quiz_id=quiz_id,
                student_id=student.id,
                question_id=question.id,
                student_answer=answer,
                is_correct=1 if is_correct else 0,
                points_earned=points_earned
            ))
        db.commit()
        score = round((earned_points / total_points) * 100)
    else:
        score = submission.get("score", 0)
    
    return {
        "success": True,
        "score": score,
        "message": f"Quiz submitted with score {score}"
    }
