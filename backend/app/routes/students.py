from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent, parent_student_association
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.routes.auth import get_current_user
from app.schemas import StudentCreate, StudentResponse
import json

router = APIRouter(prefix="/students", tags=["students"])


def _student_payload(db: Session, student: Student):
    user = db.query(User).filter(User.id == student.user_id).first()
    return {
        "id": student.id,
        "user_id": student.user_id,
        "matricule": student.matricule,
        "school_id": student.school_id,
        "class_name": student.class_name,
        "created_at": student.created_at,
        "full_name": user.full_name if user else f"Élève #{student.id}",
        "email": user.email if user else "",
    }


def _teacher_scope(db: Session, current_user: User):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    try:
        classes = json.loads(teacher.classes or "[]")
    except Exception:
        classes = []
    return teacher, set(classes)


def _assert_can_access_student(db: Session, current_user: User, student: Student):
    role = (current_user.role or "").upper()
    if role == "SUPERADMIN":
        return
    if role == "ADMIN":
        if str(student.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
        return
    if role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        if str(student.school_id) != str(teacher.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
        if allowed_classes and student.class_name not in allowed_classes:
            raise HTTPException(status_code=403, detail="Unauthorized")
        return
    if role == "STUDENT":
        mine = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not mine or mine.id != student.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        return
    if role == "PARENT":
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Unauthorized")
        link = db.execute(
            parent_student_association.select().where(
                (parent_student_association.c.parent_id == parent.id) &
                (parent_student_association.c.student_id == student.id)
            )
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="Unauthorized")
        return
    raise HTTPException(status_code=403, detail="Unauthorized")


@router.get("/", response_model=list[dict])
def get_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    role = (current_user.role or "").upper()

    if role == "SUPERADMIN":
        students = db.query(Student).all()
    elif role == "ADMIN":
        students = db.query(Student).filter(Student.school_id == str(current_user.school_id)).all()
    elif role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        query = db.query(Student).filter(Student.school_id == str(teacher.school_id))
        if allowed_classes:
            query = query.filter(Student.class_name.in_(list(allowed_classes)))
        students = query.all()
    elif role == "STUDENT":
        me = db.query(Student).filter(Student.user_id == current_user.id).first()
        students = [me] if me else []
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
        students = db.query(Student).filter(Student.id.in_(child_ids)).all() if child_ids else []
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return [_student_payload(db, student) for student in students]


@router.get("/{student_id}", response_model=dict)
def get_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_can_access_student(db, current_user, student)
    return _student_payload(db, student)


@router.post("/", response_model=StudentResponse)
def create_student(student: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    role = (current_user.role or "").upper()
    if role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can create students directly")

    user = db.query(User).filter(User.id == student.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with id {student.user_id} not found")

    if role == "ADMIN" and str(student.school_id) != str(current_user.school_id):
        raise HTTPException(status_code=403, detail="Vous ne pouvez gÃ©rer que votre Ã©tablissement")

    existing_student = db.query(Student).filter(Student.user_id == student.user_id).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="A student record already exists for this user")

    db_student = Student(
        user_id=student.user_id,
        school_id=student.school_id,
        matricule=student.matricule,
        class_name=getattr(student, 'class_name', None)
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


@router.get("/{student_id}/attendance")
def get_student_attendance(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_can_access_student(db, current_user, student)

    attendance = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    return [{"id": a.id, "date": str(a.attendance_date), "status": a.status} for a in attendance]


@router.get("/{student_id}/grades")
def get_student_grades(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_can_access_student(db, current_user, student)

    grades = db.query(Grade).filter(Grade.student_id == student_id).all()
    return [{"id": g.id, "subject": g.subject, "grade": g.grade, "date": str(g.graded_date)} for g in grades]
