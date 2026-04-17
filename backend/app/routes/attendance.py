from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.attendance import Attendance
from app.models.user import User
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.parent import Parent, parent_student_association
from app.routes.auth import get_current_user
from app.schemas.schemas import AttendanceCreate
from datetime import date
import json

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _student_or_404(db: Session, student_id: int) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


def _teacher_scope(db: Session, current_user: User):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    try:
        classes = json.loads(teacher.classes or "[]")
    except Exception:
        classes = []
    return teacher, set(classes)


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
def get_all_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = (current_user.role or "").upper()

    if role == "SUPERADMIN":
        attendance = db.query(Attendance).all()
    elif role == "ADMIN":
        attendance = db.query(Attendance).join(Student, Attendance.student_id == Student.id).filter(
            Student.school_id == str(current_user.school_id)
        ).all()
    elif role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        query = db.query(Attendance).join(Student, Attendance.student_id == Student.id).filter(
            Student.school_id == str(teacher.school_id)
        )
        if allowed_classes:
            query = query.filter(Student.class_name.in_(list(allowed_classes)))
        attendance = query.all()
    elif role == "STUDENT":
        me = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not me:
            raise HTTPException(status_code=404, detail="Student profile not found")
        attendance = db.query(Attendance).filter(Attendance.student_id == me.id).all()
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
        attendance = db.query(Attendance).filter(Attendance.student_id.in_(child_ids)).all() if child_ids else []
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return [
        {
            "id": a.id,
            "student_id": a.student_id,
            "attendance_date": str(a.attendance_date),
            "status": a.status,
            "notes": a.notes
        }
        for a in attendance
    ]


@router.post("/", response_model=dict)
def create_attendance(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    if role not in ["TEACHER", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers/admins can record attendance")

    student = _student_or_404(db, attendance.student_id)
    if role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        if str(student.school_id) != str(teacher.school_id):
            raise HTTPException(status_code=403, detail="Ã‰lÃ¨ve hors de votre Ã©tablissement")
        if allowed_classes and student.class_name not in allowed_classes:
            raise HTTPException(status_code=403, detail="Vous ne pouvez gÃ©rer que vos classes")
    elif role == "ADMIN":
        if str(student.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Ã‰lÃ¨ve hors de votre Ã©tablissement")

    db_attendance = Attendance(
        student_id=attendance.student_id,
        attendance_date=date.today(),
        status=attendance.status,
        notes=attendance.notes
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)

    return {
        "id": db_attendance.id,
        "student_id": db_attendance.student_id,
        "attendance_date": str(db_attendance.attendance_date),
        "status": db_attendance.status,
        "notes": db_attendance.notes
    }


@router.get("/date/{attendance_date}")
def get_attendance_by_date(
    attendance_date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        att_date = date.fromisoformat(attendance_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format (use YYYY-MM-DD)")

    role = (current_user.role or "").upper()
    query = db.query(Attendance).join(Student, Attendance.student_id == Student.id).filter(
        Attendance.attendance_date == att_date
    )
    if role == "ADMIN":
        query = query.filter(Student.school_id == str(current_user.school_id))
    elif role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        query = query.filter(Student.school_id == str(teacher.school_id))
        if allowed_classes:
            query = query.filter(Student.class_name.in_(list(allowed_classes)))
    elif role == "SUPERADMIN":
        pass
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    attendance = query.all()
    return [
        {
            "id": a.id,
            "student_id": a.student_id,
            "status": a.status,
            "notes": a.notes
        }
        for a in attendance
    ]


@router.get("/student/{student_id}")
def get_student_attendance(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = _student_or_404(db, student_id)
    role = (current_user.role or "").upper()

    if role == "STUDENT":
        me = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not me or me.id != student_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role == "PARENT":
        _assert_parent_child_access(db, current_user, student_id)
    elif role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        if str(student.school_id) != str(teacher.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
        if allowed_classes and student.class_name not in allowed_classes:
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role == "ADMIN":
        if str(student.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized")

    attendance = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    return [
        {
            "id": a.id,
            "attendance_date": str(a.attendance_date),
            "status": a.status,
            "notes": a.notes
        }
        for a in attendance
    ]


@router.get("/{attendance_id}")
def get_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    student = _student_or_404(db, attendance.student_id)
    role = (current_user.role or "").upper()
    if role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        if str(student.school_id) != str(teacher.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
        if allowed_classes and student.class_name not in allowed_classes:
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
        "id": attendance.id,
        "student_id": attendance.student_id,
        "attendance_date": str(attendance.attendance_date),
        "status": attendance.status,
        "notes": attendance.notes
    }


@router.put("/{attendance_id}")
def update_attendance(
    attendance_id: int,
    attendance_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    if role not in ["TEACHER", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    student = _student_or_404(db, attendance.student_id)
    if role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        if str(student.school_id) != str(teacher.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
        if allowed_classes and student.class_name not in allowed_classes:
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif role == "ADMIN":
        if str(student.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")

    for key, value in attendance_update.items():
        if key in ["status", "notes"]:
            setattr(attendance, key, value)

    db.commit()
    return {"success": True}


@router.delete("/{attendance_id}")
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    if role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can delete attendance records")

    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    student = _student_or_404(db, attendance.student_id)
    if role == "ADMIN" and str(student.school_id) != str(current_user.school_id):
        raise HTTPException(status_code=403, detail="Unauthorized")

    db.delete(attendance)
    db.commit()
    return {"success": True}
