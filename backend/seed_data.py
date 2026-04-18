"""
Idempotent seed script for EduTrack backend database.
Creates a superadmin and demo data across core tables.
"""
from __future__ import annotations

import hashlib
import json
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models.admin import Admin
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.message import Message, Notification
from app.models.parent import Parent, parent_student_association
from app.models.quiz import Quiz, QuizAnswer, QuizQuestion
from app.models.school import School
from app.models.student import Student
from app.models.superadmin import SuperAdmin
from app.models.teacher import Teacher
from app.models.user import User


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def get_or_create_school(db: Session, name: str) -> School:
    school = db.query(School).filter(School.name.ilike(name)).first()
    if school:
        if not school.is_active:
            school.is_active = True
            db.flush()
        return school
    school = School(name=name, is_active=True)
    db.add(school)
    db.flush()
    return school


def get_or_create_user(
    db: Session,
    *,
    email: str,
    full_name: str,
    password: str,
    school_id: str,
    role: str,
) -> User:
    user = db.query(User).filter(User.email.ilike(email)).first()
    if user:
        user.full_name = full_name
        user.school_id = str(school_id)
        user.role = role
        user.is_active = True
        db.flush()
        return user
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        school_id=str(school_id),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def ensure_parent_child_link(db: Session, parent_id: int, student_id: int) -> None:
    existing = db.execute(
        select(parent_student_association).where(
            parent_student_association.c.parent_id == parent_id,
            parent_student_association.c.student_id == student_id,
        )
    ).first()
    if not existing:
        db.execute(
            parent_student_association.insert().values(
                parent_id=parent_id,
                student_id=student_id,
            )
        )


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        school_names = [
            "Lycee Scientifique",
            "College Voltaire",
            "Lycee Technique",
            "Lycee Bilingue de Bertoua",
        ]
        schools = [get_or_create_school(db, name) for name in school_names]
        primary_school = schools[0]
        school_id = str(primary_school.id)

        superadmin_user = get_or_create_user(
            db,
            email="superadmin@edutrack.fr",
            full_name="Super Administrateur",
            password="superadmin123",
            school_id="SYSTEM",
            role="SUPERADMIN",
        )
        superadmin_profile = db.query(SuperAdmin).filter(SuperAdmin.user_id == superadmin_user.id).first()
        if not superadmin_profile:
            db.add(SuperAdmin(user_id=superadmin_user.id))

        admin_user = get_or_create_user(
            db,
            email="admin@gmail.fr",
            full_name="Administrateur Ecole",
            password="admin123",
            school_id=school_id,
            role="ADMIN",
        )
        admin_profile = db.query(Admin).filter(Admin.user_id == admin_user.id).first()
        if not admin_profile:
            db.add(Admin(user_id=admin_user.id, school_id=school_id))

        teacher_user = get_or_create_user(
            db,
            email="prof@gmail.fr",
            full_name="Mme Valerie",
            password="teacher123",
            school_id=school_id,
            role="TEACHER",
        )
        teacher_profile = db.query(Teacher).filter(Teacher.user_id == teacher_user.id).first()
        if not teacher_profile:
            db.add(
                Teacher(
                    user_id=teacher_user.id,
                    school_id=school_id,
                    subject="Mathematiques",
                    classes=json.dumps(["6eme A", "5eme B"]),
                )
            )

        parent_user = get_or_create_user(
            db,
            email="jean@example.com",
            full_name="Jean Martin",
            password="parent123",
            school_id=school_id,
            role="PARENT",
        )
        parent_profile = db.query(Parent).filter(Parent.user_id == parent_user.id).first()
        if not parent_profile:
            parent_profile = Parent(user_id=parent_user.id)
            db.add(parent_profile)
            db.flush()

        students_spec = [
            ("martin@gmail.fr", "Leo Martin", "student123", "MAT001", "6eme A"),
            ("essono@gmail.fr", "Nina Essono", "student123", "MAT002", "6eme A"),
            ("ngo@gmail.fr", "Paul Ngo", "student123", "MAT003", "5eme B"),
        ]
        seeded_students: list[Student] = []
        for email, full_name, password, matricule, class_name in students_spec:
            student_user = get_or_create_user(
                db,
                email=email,
                full_name=full_name,
                password=password,
                school_id=school_id,
                role="STUDENT",
            )
            student_profile = db.query(Student).filter(Student.user_id == student_user.id).first()
            if not student_profile:
                student_profile = db.query(Student).filter(Student.matricule == matricule).first()
            if not student_profile:
                student_profile = Student(
                    user_id=student_user.id,
                    school_id=school_id,
                    matricule=matricule,
                    class_name=class_name,
                )
                db.add(student_profile)
                db.flush()
            else:
                student_profile.school_id = school_id
                student_profile.class_name = class_name
                db.flush()
            seeded_students.append(student_profile)

        ensure_parent_child_link(db, parent_profile.id, seeded_students[0].id)
        ensure_parent_child_link(db, parent_profile.id, seeded_students[1].id)

        existing_grade_count = db.query(Grade).filter(Grade.teacher_id == teacher_user.id).count()
        if existing_grade_count < 6:
            for student in seeded_students:
                db.add(
                    Grade(
                        student_id=student.id,
                        subject="Mathematiques",
                        grade=14.5,
                        teacher_id=teacher_user.id,
                        comment="Bon travail",
                        graded_date=datetime.utcnow() - timedelta(days=2),
                    )
                )
                db.add(
                    Grade(
                        student_id=student.id,
                        subject="Sciences",
                        grade=12.0,
                        teacher_id=teacher_user.id,
                        comment="Peut mieux faire",
                        graded_date=datetime.utcnow() - timedelta(days=1),
                    )
                )

        existing_attendance_count = db.query(Attendance).count()
        if existing_attendance_count < 8:
            for student in seeded_students:
                db.add(
                    Attendance(
                        student_id=student.id,
                        attendance_date=date.today() - timedelta(days=1),
                        status="present",
                        notes="RAS",
                    )
                )
                db.add(
                    Attendance(
                        student_id=student.id,
                        attendance_date=date.today(),
                        status="late",
                        notes="Retard de 10 min",
                    )
                )

        quiz = db.query(Quiz).filter(Quiz.title == "Quiz Mathematiques - Fractions").first()
        if not quiz:
            quiz = Quiz(
                title="Quiz Mathematiques - Fractions",
                description="Evaluation rapide sur les fractions",
                created_by=teacher_user.id,
                total_questions=2,
                duration_minutes=20,
            )
            db.add(quiz)
            db.flush()

        question_count = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).count()
        if question_count == 0:
            q1 = QuizQuestion(
                quiz_id=quiz.id,
                question_text="Combien vaut 1/2 + 1/4 ?",
                question_type="multiple_choice",
                options=json.dumps(["1/4", "3/4", "2/4", "1"]),
                correct_answer="3/4",
                points=1.0,
            )
            q2 = QuizQuestion(
                quiz_id=quiz.id,
                question_text="Vrai ou faux: 2/3 est superieur a 3/4",
                question_type="true_false",
                options=json.dumps(["true", "false"]),
                correct_answer="false",
                points=1.0,
            )
            db.add(q1)
            db.add(q2)
            db.flush()

            db.add(
                QuizAnswer(
                    quiz_id=quiz.id,
                    student_id=seeded_students[0].id,
                    question_id=q1.id,
                    student_answer="3/4",
                    is_correct=1,
                    points_earned=1.0,
                )
            )
            db.add(
                QuizAnswer(
                    quiz_id=quiz.id,
                    student_id=seeded_students[0].id,
                    question_id=q2.id,
                    student_answer="false",
                    is_correct=1,
                    points_earned=1.0,
                )
            )

        if db.query(Message).count() < 6:
            db.add(
                Message(
                    sender_id=admin_user.id,
                    sender_name=admin_user.full_name,
                    recipient_id=None,
                    text="Bienvenue sur EduTrack. Cette base contient des donnees de demonstration.",
                    category="general",
                )
            )
            db.add(
                Message(
                    sender_id=parent_user.id,
                    sender_name=parent_user.full_name,
                    recipient_id=teacher_user.id,
                    text="Bonjour, je souhaite un point sur les progres de Leo.",
                    category="private",
                )
            )

        if db.query(Notification).count() < 6:
            db.add(
                Notification(
                    user_id=parent_user.id,
                    title="Nouveau bulletin",
                    message="Le bulletin de votre enfant est disponible.",
                    type="INFO",
                )
            )
            db.add(
                Notification(
                    user_id=teacher_user.id,
                    title="Quiz complete",
                    message="Le quiz de mathematiques a ete complete par un eleve.",
                    type="SUCCESS",
                )
            )

        db.commit()

        summary = {
            "schools": db.query(School).count(),
            "users": db.query(User).count(),
            "superadmins": db.query(SuperAdmin).count(),
            "admins": db.query(Admin).count(),
            "teachers": db.query(Teacher).count(),
            "students": db.query(Student).count(),
            "parents": db.query(Parent).count(),
            "grades": db.query(Grade).count(),
            "attendance": db.query(Attendance).count(),
            "quizzes": db.query(Quiz).count(),
            "quiz_questions": db.query(QuizQuestion).count(),
            "quiz_answers": db.query(QuizAnswer).count(),
            "messages": db.query(Message).count(),
            "notifications": db.query(Notification).count(),
        }
        print("Seed termine.")
        print("Identifiants principaux:")
        print("  Superadmin: superadmin@edutrack.fr / superadmin123")
        print("  Admin: admin@gmail.fr / admin123")
        print("  Teacher: valerie@gmail.fr / teacher123")
        print("  Parent: jean.martin@example.com / parent123")
        print("  Student: leo.martin@gmail.fr / student123")
        print("Resume:", summary)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
