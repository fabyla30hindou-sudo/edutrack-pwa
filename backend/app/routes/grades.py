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


# ===== GRADE ANALYTICS ENDPOINTS =====

@router.get("/analytics/student/{student_id}")
def get_student_grade_analytics(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get grade analytics for a specific student"""
    role = (current_user.role or "").upper()
    student = _student_or_404(db, student_id)

    # Access control
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
    elif role == "ADMIN":
        if str(student.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Unauthorized")

    grades = db.query(Grade).filter(Grade.student_id == student_id).order_by(Grade.graded_date).all()

    if not grades:
        return {
            "student_id": student_id,
            "overall_average": None,
            "subjects": [],
            "evolution": [],
            "distribution": {}
        }

    # Group by subject
    subject_grades: dict[str, list[Grade]] = {}
    for g in grades:
        if g.subject not in subject_grades:
            subject_grades[g.subject] = []
        subject_grades[g.subject].append(g)

    # Calculate subject averages and evolution
    subjects = []
    for subject, subject_grade_list in subject_grades.items():
        sorted_grades = sorted(subject_grade_list, key=lambda x: x.graded_date)
        avg = sum(g.grade for g in subject_grade_list) / len(subject_grade_list)

        # Evolution data (last 5 grades)
        evolution = [
            {"date": str(g.graded_date), "grade": g.grade}
            for g in sorted_grades[-5:]
        ]

        subjects.append({
            "subject": subject,
            "average": round(avg, 2),
            "count": len(subject_grade_list),
            "latest_grade": sorted_grades[-1].grade,
            "evolution": evolution
        })

    # Overall evolution (all subjects combined, sorted by date)
    all_grades_sorted = sorted(grades, key=lambda x: x.graded_date)
    evolution_overall = [
        {"date": str(g.graded_date), "grade": g.grade, "subject": g.subject}
        for g in all_grades_sorted[-10:]
    ]

    # Distribution
    distribution = {"0-10": 0, "10-12": 0, "12-14": 0, "14-16": 0, "16-18": 0, "18-20": 0}
    for g in grades:
        if g.grade < 10:
            distribution["0-10"] += 1
        elif g.grade < 12:
            distribution["10-12"] += 1
        elif g.grade < 14:
            distribution["12-14"] += 1
        elif g.grade < 16:
            distribution["14-16"] += 1
        elif g.grade < 18:
            distribution["16-18"] += 1
        else:
            distribution["18-20"] += 1

    overall_avg = sum(g.grade for g in grades) / len(grades)

    return {
        "student_id": student_id,
        "overall_average": round(overall_avg, 2),
        "total_grades": len(grades),
        "subjects": subjects,
        "evolution": evolution_overall,
        "distribution": distribution
    }


@router.get("/analytics/class/{class_name}")
def get_class_grade_analytics(
    class_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get grade analytics for a class"""
    role = (current_user.role or "").upper()

    if role not in ["TEACHER", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Get all students in the class
    students = db.query(Student).filter(Student.class_name == class_name).all()

    if role == "TEACHER":
        teacher, allowed_classes = _teacher_scope(db, current_user)
        if allowed_classes and class_name not in allowed_classes:
            raise HTTPException(status_code=403, detail="Class not in your scope")

    student_ids = [s.id for s in students]
    if not student_ids:
        return {
            "class_name": class_name,
            "student_count": 0,
            "overall_average": None,
            "subjects": [],
            "top_students": [],
            "distribution": {}
        }

    grades = db.query(Grade).filter(Grade.student_id.in_(student_ids)).all()

    # Group by subject
    subject_grades: dict[str, list[Grade]] = {}
    for g in grades:
        if g.subject not in subject_grades:
            subject_grades[g.subject] = []
        subject_grades[g.subject].append(g)

    subjects = []
    for subject, subject_grade_list in subject_grades.items():
        avg = sum(g.grade for g in subject_grade_list) / len(subject_grade_list)
        subjects.append({
            "subject": subject,
            "average": round(avg, 2),
            "count": len(subject_grade_list)
        })

    # Student averages
    student_averages: dict[int, float] = {}
    for g in grades:
        if g.student_id not in student_averages:
            student_averages[g.student_id] = []
        student_averages[g.student_id].append(g.grade)

    top_students = []
    for sid, grade_list in student_averages.items():
        avg = sum(grade_list) / len(grade_list)
        student = next((s for s in students if s.id == sid), None)
        if student:
            user = db.query(User).filter(User.id == student.user_id).first()
            top_students.append({
                "student_id": sid,
                "student_name": user.full_name if user else "Unknown",
                "average": round(avg, 2),
                "grade_count": len(grade_list)
            })

    top_students.sort(key=lambda x: x["average"], reverse=True)
    top_students = top_students[:5]

    # Distribution
    distribution = {"0-10": 0, "10-12": 0, "12-14": 0, "14-16": 0, "16-18": 0, "18-20": 0}
    for g in grades:
        if g.grade < 10:
            distribution["0-10"] += 1
        elif g.grade < 12:
            distribution["10-12"] += 1
        elif g.grade < 14:
            distribution["12-14"] += 1
        elif g.grade < 16:
            distribution["14-16"] += 1
        elif g.grade < 18:
            distribution["16-18"] += 1
        else:
            distribution["18-20"] += 1

    overall_avg = sum(g.grade for g in grades) / len(grades) if grades else 0

    return {
        "class_name": class_name,
        "student_count": len(students),
        "overall_average": round(overall_avg, 2),
        "total_grades": len(grades),
        "subjects": subjects,
        "top_students": top_students,
        "distribution": distribution
    }
