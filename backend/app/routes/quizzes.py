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

def quiz_result_for_student(quiz_id: int, student_id: int, db: Session) -> dict:
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    answers = db.query(QuizAnswer).filter(
        QuizAnswer.quiz_id == quiz_id,
        QuizAnswer.student_id == student_id
    ).all()
    answers_by_question = {answer.question_id: answer for answer in answers}
    correct_answers = sum(1 for answer in answers if answer.is_correct == 1)
    total_questions = len(questions)
    score = round((correct_answers / total_questions) * 100) if total_questions else 0

    return {
        "status": "completed" if answers else "published",
        "averageScore": score if answers else None,
        "correctAnswers": correct_answers,
        "answeredQuestions": len(answers),
        "totalQuestions": total_questions,
        "correction": [
            {
                "questionId": str(question.id),
                "isCorrect": bool(answers_by_question.get(question.id) and answers_by_question[question.id].is_correct == 1),
                "yourAnswer": answers_by_question.get(question.id).student_answer if answers_by_question.get(question.id) else "",
                "correctAnswer": question.correct_answer or ""
            }
            for question in questions
        ] if answers else []
    }

def aggregate_quiz_results(quiz_id: int, db: Session) -> dict:
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    total_questions = len(questions)
    if not total_questions:
        return {"averageScore": None, "correctAnswers": 0, "answeredQuestions": 0, "attemptsCount": 0}

    answers = db.query(QuizAnswer).filter(QuizAnswer.quiz_id == quiz_id).all()
    by_student: dict[int, list[QuizAnswer]] = {}
    for answer in answers:
        by_student.setdefault(answer.student_id, []).append(answer)

    scores = []
    correct_answers = 0
    for student_answers in by_student.values():
        student_correct = sum(1 for answer in student_answers if answer.is_correct == 1)
        correct_answers += student_correct
        scores.append(round((student_correct / total_questions) * 100))

    return {
        "averageScore": round(sum(scores) / len(scores)) if scores else None,
        "correctAnswers": correct_answers,
        "answeredQuestions": len(answers),
        "attemptsCount": len(scores)
    }

def serialize_quiz(quiz: Quiz, db: Session, current_user: User | None = None) -> dict:
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    result = {}
    if current_user and (current_user.role or "").upper() == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            result = quiz_result_for_student(quiz.id, student.id, db)
    elif current_user and (current_user.role or "").upper() in ["TEACHER", "ADMIN", "SUPERADMIN"]:
        result = aggregate_quiz_results(quiz.id, db)

    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "duration": quiz.duration_minutes,
        "duration_minutes": quiz.duration_minutes,
        "questionCount": len(questions),
        "total_questions": len(questions),
        "status": result.get("status", "published"),
        "averageScore": result.get("averageScore"),
        "correctAnswers": result.get("correctAnswers", 0),
        "answeredQuestions": result.get("answeredQuestions", 0),
        "attemptsCount": result.get("attemptsCount", 0),
        "correction": result.get("correction", []),
        "questions": [serialize_question(q) for q in questions],
    }

@router.get("/")
def get_all_quizzes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all quizzes with their questions."""
    quizzes = db.query(Quiz).all()
    return [serialize_quiz(q, db, current_user) for q in quizzes]

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
    return serialize_quiz(db_quiz, db, current_user)

@router.get("/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific quiz with questions"""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return serialize_quiz(quiz, db, current_user)

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
    return serialize_quiz(db_quiz, db, current_user)

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
        correct_answers = 0
        correction = []

        db.query(QuizAnswer).filter(
            QuizAnswer.quiz_id == quiz_id,
            QuizAnswer.student_id == student.id
        ).delete()

        for question in questions:
            answer = str(submitted_answers.get(str(question.id), ""))
            is_correct = answer.strip().lower() == (question.correct_answer or "").strip().lower()
            points_earned = (question.points or 1.0) if is_correct else 0.0
            earned_points += points_earned
            correct_answers += 1 if is_correct else 0
            correction.append({
                "questionId": str(question.id),
                "isCorrect": is_correct,
                "yourAnswer": answer,
                "correctAnswer": question.correct_answer or ""
            })
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
        questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
        correct_answers = round((score / 100) * len(questions)) if questions else 0
        correction = []
    
    return {
        "success": True,
        "score": score,
        "correctAnswers": correct_answers,
        "totalQuestions": len(questions),
        "correction": correction,
        "message": f"Quiz submitted with score {score}"
    }
