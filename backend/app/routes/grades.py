from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.grade import Grade
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent, parent_student_association
from app.routes.auth import get_current_user
from app.schemas.schemas import GradeCreate
from datetime import datetime
import json

router = APIRouter(prefix="/grades", tags=["grades"])


def _teacher_scope(db: Session, current_user: User):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    try:
        classes = json.loads(teacher.classes or "[]")
    except Exception:
        classes = []
    return teacher, set(classes)


def _student_or_404(db: Session, student_id: int) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


def _assert_parent_child_access(db: Session, current_user: User, student_id: int):
    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        raise HTTPException(status_code=403, detail="Parent profile not found")
    link = db.execute(
        parent_student_association.select().where(
            (parent_student_association.c.parent_id == parent.id) &
            (parent_student_association.c.student_id == student_id)
        )
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="AccÃ¨s interdit Ã  cet enfant")


@router.get("/", response_model=list[dict])
def get_all_grades(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    role = (current_user.role or "").upper()

    if role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        grades = db.query(Grade).filter(Grade.student_id == student.id).all()
    elif role == "TEACHER":
        grades = db.query(Grade).filter(Grade.teacher_id == current_user.id).all()
    elif role == "ADMIN":
        grades = db.query(Grade).join(Student, Grade.student_id == Student.id).filter(
            Student.school_id == str(current_user.school_id)
        ).all()
    elif role == "SUPERADMIN":
        grades = db.query(Grade).all()
    elif role == "PARENT":
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            return []
        child_ids = [
            row[0] for row in db.execute(
                parent_student_association.select().with_only_columns(parent_student_association.c.student_id).where(
                    parent_student_association.c.parent_id == parent.id
                )
            ).all()
        ]
        if not child_ids:
            return []
        grades = db.query(Grade).filter(Grade.student_id.in_(child_ids)).all()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return [
        {
            "id": g.id,
            "student_id": g.student_id,
            "subject": g.subject,
            "grade": g.grade,
            "comment": g.comment,
            "graded_date": str(g.graded_date)
        }
        for g in grades
    ]


@router.post("/", response_model=dict)
def create_grade(
    grade: GradeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    student = _student_or_404(db, grade.student_id)

    if role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        if str(student.school_id) != str(teacher.school_id):
            raise HTTPException(status_code=403, detail="Ã‰lÃ¨ve hors de votre Ã©tablissement")
        if allowed_classes and student.class_name not in allowed_classes:
            raise HTTPException(status_code=403, detail="Vous ne pouvez noter que vos classes")
        if (teacher.subject or "").strip() and (grade.subject or "").strip().lower() != (teacher.subject or "").strip().lower():
            raise HTTPException(status_code=403, detail="Vous ne pouvez noter que votre matiÃ¨re")
    elif role == "ADMIN":
        if str(student.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Ã‰lÃ¨ve hors de votre Ã©tablissement")
    elif role == "SUPERADMIN":
        pass
    else:
        raise HTTPException(status_code=403, detail="Only teachers/admins can create grades")

    db_grade = Grade(
        student_id=grade.student_id,
        subject=grade.subject,
        grade=grade.grade,
        teacher_id=current_user.id,
        comment=grade.comment,
        graded_date=datetime.utcnow()
    )
    db.add(db_grade)
    db.commit()
    db.refresh(db_grade)

    return {
        "id": db_grade.id,
        "student_id": db_grade.student_id,
        "subject": db_grade.subject,
        "grade": db_grade.grade,
        "comment": db_grade.comment,
        "graded_date": str(db_grade.graded_date)
    }


@router.get("/student/{student_id}")
def get_student_grades(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    student = _student_or_404(db, student_id)

    if role == "STUDENT":
        me = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not me or me.id != student_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        if str(student.school_id) != str(teacher.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
        if allowed_classes and student.class_name not in allowed_classes:
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role == "ADMIN":
        if str(student.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role == "PARENT":
        _assert_parent_child_access(db, current_user, student_id)
    elif role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized")

    grades = db.query(Grade).filter(Grade.student_id == student_id).all()
    return [
        {
            "id": g.id,
            "subject": g.subject,
            "grade": g.grade,
            "comment": g.comment,
            "graded_date": str(g.graded_date)
        }
        for g in grades
    ]


@router.get("/{grade_id}")
def get_grade(
    grade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    student = _student_or_404(db, grade.student_id)
    role = (current_user.role or "").upper()

    if role == "TEACHER":
        if grade.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role == "ADMIN":
        if str(student.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role == "STUDENT":
        me = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not me or me.id != student.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role == "PARENT":
        _assert_parent_child_access(db, current_user, student.id)
    elif role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized")

    return {
        "id": grade.id,
        "student_id": grade.student_id,
        "subject": grade.subject,
        "grade": grade.grade,
        "comment": grade.comment,
        "graded_date": str(grade.graded_date)
    }


@router.put("/{grade_id}")
def update_grade(
    grade_id: int,
    grade_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    if role not in ["TEACHER", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    student = _student_or_404(db, grade.student_id)

    if role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        if grade.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot modify other teacher's grades")
        if str(student.school_id) != str(teacher.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
        if allowed_classes and student.class_name not in allowed_classes:
            raise HTTPException(status_code=403, detail="Unauthorized")
        new_subject = grade_update.get("subject", grade.subject)
        if (teacher.subject or "").strip() and (new_subject or "").strip().lower() != (teacher.subject or "").strip().lower():
            raise HTTPException(status_code=403, detail="Vous ne pouvez noter que votre matiÃ¨re")
    elif role == "ADMIN":
        if str(student.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")

    for key, value in grade_update.items():
        if key in ["subject", "grade", "comment"]:
            setattr(grade, key, value)

    db.commit()
    return {"success": True}


@router.delete("/{grade_id}")
def delete_grade(
    grade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    if role not in ["TEACHER", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    student = _student_or_404(db, grade.student_id)
    if role == "TEACHER" and grade.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete other teacher's grades")
    if role == "ADMIN" and str(student.school_id) != str(current_user.school_id):
        raise HTTPException(status_code=403, detail="Unauthorized")

    db.delete(grade)
    db.commit()
    return {"success": True}
