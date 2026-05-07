"""
Reset and seed script for EduTrack demo data.

This script:
- removes existing SQLite databases used by the project
- recreates the schema
- inserts a coherent Cameroon-themed demo dataset
- prints login credentials clearly at the end
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

# Force a stable working directory so sqlite:///./edutrack.db always targets
# the same database file during seed execution.
os.chdir(PROJECT_ROOT)
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models.admin import Admin  # noqa: E402
from app.models.attendance import Attendance  # noqa: E402
from app.models.grade import Grade  # noqa: E402
from app.models.message import Message, Notification  # noqa: E402
from app.models.parent import Parent, parent_student_association  # noqa: E402
from app.models.quiz import Quiz, QuizAnswer, QuizQuestion  # noqa: E402
from app.models.school import School  # noqa: E402
from app.models.student import Student  # noqa: E402
from app.models.superadmin import SuperAdmin  # noqa: E402
from app.models.teacher import Teacher  # noqa: E402
from app.models.user import User  # noqa: E402


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def wipe_sqlite_files() -> list[Path]:
    db_paths = [
        PROJECT_ROOT / "edutrack.db",
        BACKEND_DIR / "edutrack.db",
    ]
    removed: list[Path] = []
    for db_path in db_paths:
        if db_path.exists():
            try:
                db_path.unlink()
                removed.append(db_path)
            except PermissionError:
                # Another local process may currently hold the file open.
                # In that case we will fall back to truncating data in-place.
                continue
    return removed


def truncate_all_tables() -> None:
    with engine.begin() as connection:
        connection.execute(text("PRAGMA foreign_keys=OFF"))
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())
        connection.execute(text("PRAGMA foreign_keys=ON"))


def reset_database() -> list[Path]:
    engine.dispose()
    removed = wipe_sqlite_files()
    if not (PROJECT_ROOT / "edutrack.db").exists():
        Base.metadata.create_all(bind=engine)
    else:
        Base.metadata.create_all(bind=engine)
        truncate_all_tables()
    Base.metadata.create_all(bind=engine)
    return removed


def create_user(
    db,
    *,
    email: str,
    full_name: str,
    password: str,
    school_id: str,
    role: str,
) -> User:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        school_id=str(school_id),
        role=role.upper(),
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def create_quiz_with_questions(
    db,
    *,
    teacher_user: User,
    title: str,
    description: str,
    duration_minutes: int,
    questions: list[dict],
) -> tuple[Quiz, list[QuizQuestion]]:
    quiz = Quiz(
        title=title,
        description=description,
        created_by=teacher_user.id,
        total_questions=len(questions),
        duration_minutes=duration_minutes,
    )
    db.add(quiz)
    db.flush()

    created_questions: list[QuizQuestion] = []
    for raw in questions:
        question = QuizQuestion(
            quiz_id=quiz.id,
            question_text=raw["question_text"],
            question_type=raw["question_type"],
            options=json.dumps(raw.get("options", [])),
            correct_answer=raw["correct_answer"],
            points=raw.get("points", 1.0),
        )
        db.add(question)
        db.flush()
        created_questions.append(question)
    return quiz, created_questions


def add_quiz_attempt(
    db,
    *,
    quiz: Quiz,
    student: Student,
    questions: list[QuizQuestion],
    answers: list[str],
    submitted_at: datetime,
) -> None:
    for question, answer in zip(questions, answers):
        is_correct = answer.strip().lower() == (question.correct_answer or "").strip().lower()
        db.add(
            QuizAnswer(
                quiz_id=quiz.id,
                student_id=student.id,
                question_id=question.id,
                student_answer=answer,
                is_correct=1 if is_correct else 0,
                points_earned=question.points if is_correct else 0.0,
                submitted_at=submitted_at,
            )
        )


def seed() -> None:
    removed_dbs = reset_database()
    db = SessionLocal()

    credentials: list[tuple[str, str, str, str]] = []

    try:
        school = School(name="College Bilingue La Rigueur de Yaounde", is_active=True)
        db.add(school)
        db.flush()
        school_id = str(school.id)

        superadmin_user = create_user(
            db,
            email="superadmin@edutrack.cm",
            full_name="Amina Tchameni",
            password="SuperAdmin123",
            school_id="SYSTEM",
            role="SUPERADMIN",
        )
        db.add(SuperAdmin(user_id=superadmin_user.id))
        credentials.append(("SUPERADMIN", superadmin_user.full_name, superadmin_user.email, "SuperAdmin123"))

        admin_user = create_user(
            db,
            email="proviseur@larigueur.cm",
            full_name="Pauline Ndzi",
            password="Admin123",
            school_id=school_id,
            role="ADMIN",
        )
        db.add(Admin(user_id=admin_user.id, school_id=school_id))
        credentials.append(("ADMIN", admin_user.full_name, admin_user.email, "Admin123"))

        teacher_specs = [
            {
                "full_name": "Boris Ndzi",
                "email": "boris.ndzi@larigueur.cm",
                "password": "ProfInfo123",
                "subject": "Informatique",
                "classes": ["3eme A", "3eme B"],
            },
            {
                "full_name": "Estelle Ngono",
                "email": "estelle.ngono@larigueur.cm",
                "password": "ProfAnglais123",
                "subject": "Anglais",
                "classes": ["3eme A", "3eme B"],
            },
        ]

        teachers_by_subject: dict[str, tuple[User, Teacher]] = {}
        for spec in teacher_specs:
            user = create_user(
                db,
                email=spec["email"],
                full_name=spec["full_name"],
                password=spec["password"],
                school_id=school_id,
                role="TEACHER",
            )
            teacher = Teacher(
                user_id=user.id,
                school_id=school_id,
                subject=spec["subject"],
                classes=json.dumps(spec["classes"]),
            )
            db.add(teacher)
            teachers_by_subject[spec["subject"]] = (user, teacher)
            credentials.append(("TEACHER", user.full_name, user.email, spec["password"]))

        parent_user = create_user(
            db,
            email="marie.ewane@famille.cm",
            full_name="Marie Ewane",
            password="Parent123",
            school_id=school_id,
            role="PARENT",
        )
        parent = Parent(user_id=parent_user.id)
        db.add(parent)
        db.flush()
        credentials.append(("PARENT", parent_user.full_name, parent_user.email, "Parent123"))

        student_specs = [
            {
                "full_name": "Cedric Mvondo",
                "email": "cedric.mvondo@eleve.cm",
                "password": "Eleve123",
                "matricule": "CMR3A001",
                "class_name": "3eme A",
            },
            {
                "full_name": "Diane Fouda",
                "email": "diane.fouda@eleve.cm",
                "password": "Eleve123",
                "matricule": "CMR3A002",
                "class_name": "3eme A",
            },
            {
                "full_name": "Blaise Etoa",
                "email": "blaise.etoa@eleve.cm",
                "password": "Eleve123",
                "matricule": "CMR3B001",
                "class_name": "3eme B",
            },
            {
                "full_name": "Ruth Ndzi",
                "email": "ruth.ndzi@eleve.cm",
                "password": "Eleve123",
                "matricule": "CMR3B002",
                "class_name": "3eme B",
            },
        ]

        students: list[tuple[User, Student]] = []
        for spec in student_specs:
            user = create_user(
                db,
                email=spec["email"],
                full_name=spec["full_name"],
                password=spec["password"],
                school_id=school_id,
                role="STUDENT",
            )
            student = Student(
                user_id=user.id,
                matricule=spec["matricule"],
                school_id=school_id,
                class_name=spec["class_name"],
            )
            db.add(student)
            db.flush()
            students.append((user, student))
            credentials.append(("STUDENT", user.full_name, user.email, spec["password"]))

            db.execute(
                parent_student_association.insert().values(
                    parent_id=parent.id,
                    student_id=student.id,
                )
            )

        now = datetime.utcnow()

        info_teacher_user = teachers_by_subject["Informatique"][0]
        english_teacher_user = teachers_by_subject["Anglais"][0]

        grade_matrix = {
            "Cedric Mvondo": {"Informatique": 15.5, "Anglais": 13.0},
            "Diane Fouda": {"Informatique": 16.0, "Anglais": 14.5},
            "Blaise Etoa": {"Informatique": 12.5, "Anglais": 11.5},
            "Ruth Ndzi": {"Informatique": 14.0, "Anglais": 15.0},
        }
        grade_comments = {
            "Informatique": "Bonne maitrise des bases de bureautique et de logique.",
            "Anglais": "Participation satisfaisante et bonne comprehension orale.",
        }

        for user, student in students:
            for subject, value in grade_matrix[user.full_name].items():
                teacher_user = info_teacher_user if subject == "Informatique" else english_teacher_user
                db.add(
                    Grade(
                        student_id=student.id,
                        subject=subject,
                        grade=value,
                        teacher_id=teacher_user.id,
                        comment=grade_comments[subject],
                        graded_date=now - timedelta(days=3 if subject == "Informatique" else 1),
                    )
                )

        attendance_rows = [
            ("Cedric Mvondo", date.today() - timedelta(days=2), "present", "Present au cours d'informatique."),
            ("Cedric Mvondo", date.today() - timedelta(days=1), "late", "Retard de 8 minutes apres la pause."),
            ("Diane Fouda", date.today() - timedelta(days=2), "present", "Travail regulier en classe."),
            ("Diane Fouda", date.today() - timedelta(days=1), "present", "RAS."),
            ("Blaise Etoa", date.today() - timedelta(days=2), "absent", "Absence signalee par le parent."),
            ("Blaise Etoa", date.today() - timedelta(days=1), "present", "Retour en classe normal."),
            ("Ruth Ndzi", date.today() - timedelta(days=2), "present", "Bonne attitude en classe."),
            ("Ruth Ndzi", date.today() - timedelta(days=1), "present", "Participation active."),
        ]
        student_by_name = {user.full_name: student for user, student in students}
        for student_name, attendance_date, status, notes in attendance_rows:
            db.add(
                Attendance(
                    student_id=student_by_name[student_name].id,
                    attendance_date=attendance_date,
                    status=status,
                    notes=notes,
                )
            )

        info_quiz, info_questions = create_quiz_with_questions(
            db,
            teacher_user=info_teacher_user,
            title="Quiz Informatique - Traitement de texte et clavier",
            description="Cours: initiation a l'ordinateur, raccourcis clavier et saisie dans un contexte de salle multimedia a Yaounde.",
            duration_minutes=25,
            questions=[
                {
                    "question_text": "Quel raccourci permet de copier un texte sous Windows ?",
                    "question_type": "multiple_choice",
                    "options": ["Ctrl + C", "Ctrl + V", "Ctrl + X", "Alt + C"],
                    "correct_answer": "Ctrl + C",
                },
                {
                    "question_text": "Quel appareil permet d'afficher les informations de l'ordinateur ?",
                    "question_type": "multiple_choice",
                    "options": ["L'ecran", "La souris", "L'onduleur", "Le clavier"],
                    "correct_answer": "L'ecran",
                },
                {
                    "question_text": "Vrai ou faux: un dossier permet de ranger plusieurs fichiers.",
                    "question_type": "true_false",
                    "options": ["true", "false"],
                    "correct_answer": "true",
                },
            ],
        )

        english_quiz, english_questions = create_quiz_with_questions(
            db,
            teacher_user=english_teacher_user,
            title="Quiz Anglais - Introducing yourself",
            description="Cours: saluer, se presenter et parler de son ecole en anglais dans un contexte camerounais.",
            duration_minutes=20,
            questions=[
                {
                    "question_text": "Choose the correct greeting for the morning.",
                    "question_type": "multiple_choice",
                    "options": ["Good night", "Good morning", "Goodbye", "See you"],
                    "correct_answer": "Good morning",
                },
                {
                    "question_text": "Complete: My name ___ Cedric.",
                    "question_type": "multiple_choice",
                    "options": ["am", "is", "are", "be"],
                    "correct_answer": "is",
                },
                {
                    "question_text": "Vrai ou faux: 'I am in Form Three' peut servir a parler de sa classe.",
                    "question_type": "true_false",
                    "options": ["true", "false"],
                    "correct_answer": "true",
                },
            ],
        )

        quiz_attempts = {
            "Cedric Mvondo": {
                info_quiz.id: ["Ctrl + C", "L'ecran", "true"],
                english_quiz.id: ["Good morning", "is", "true"],
            },
            "Diane Fouda": {
                info_quiz.id: ["Ctrl + C", "L'ecran", "true"],
                english_quiz.id: ["Good morning", "is", "false"],
            },
            "Blaise Etoa": {
                info_quiz.id: ["Ctrl + V", "L'ecran", "true"],
                english_quiz.id: ["Good morning", "am", "true"],
            },
            "Ruth Ndzi": {
                info_quiz.id: ["Ctrl + C", "Le clavier", "true"],
                english_quiz.id: ["Good morning", "is", "true"],
            },
        }
        quiz_meta = {
            info_quiz.id: (info_quiz, info_questions),
            english_quiz.id: (english_quiz, english_questions),
        }
        for index, (user, student) in enumerate(students):
            attempts = quiz_attempts[user.full_name]
            for quiz_id, answers in attempts.items():
                quiz, questions = quiz_meta[quiz_id]
                add_quiz_attempt(
                    db,
                    quiz=quiz,
                    student=student,
                    questions=questions,
                    answers=answers,
                    submitted_at=now - timedelta(hours=6 - index),
                )

        messages = [
            Message(
                sender_id=admin_user.id,
                sender_name=admin_user.full_name,
                recipient_id=None,
                text="Bienvenue sur la base de demonstration EduTrack. Les donnees concernent les classes de 3eme A et 3eme B.",
                category="general",
            ),
            Message(
                sender_id=parent_user.id,
                sender_name=parent_user.full_name,
                recipient_id=info_teacher_user.id,
                text="Bonsoir professeur, merci de confirmer le prochain exercice pratique d'informatique pour Cedric et Diane.",
                category="private",
            ),
            Message(
                sender_id=parent_user.id,
                sender_name=parent_user.full_name,
                recipient_id=english_teacher_user.id,
                text="Bonjour madame, Ruth revise bien ses salutations en anglais a la maison.",
                category="private",
            ),
        ]
        db.add_all(messages)

        notifications = [
            Notification(
                user_id=parent_user.id,
                title="Nouvelles notes disponibles",
                message="Les notes d'Informatique et d'Anglais des 4 eleves ont ete publiees.",
                type="INFO",
            ),
            Notification(
                user_id=info_teacher_user.id,
                title="Quiz rendu",
                message="Les eleves de 3eme A et 3eme B ont soumis le quiz d'Informatique.",
                type="SUCCESS",
            ),
            Notification(
                user_id=english_teacher_user.id,
                title="Suivi parent",
                message="Un parent a envoye un message concernant l'evolution en Anglais.",
                type="INFO",
            ),
        ]
        db.add_all(notifications)

        db.commit()

        print("=" * 72)
        print("EduTrack demo seed termine")
        print("=" * 72)
        print("Bases supprimees avant recreation:")
        if removed_dbs:
            for db_path in removed_dbs:
                print(f" - {db_path}")
        else:
            print(" - Aucune base precedente trouvee")

        print("\nResume des donnees creees:")
        print(f" - Ecole: {school.name}")
        print(" - Classes: 3eme A (2 eleves), 3eme B (2 eleves)")
        print(" - Matieres: Informatique, Anglais")
        print(" - Quiz: 2")
        print(" - Eleves lies au parent: 4")

        print("\nIdentifiants de connexion:")
        print("-" * 72)
        for role, full_name, email, password in credentials:
            print(f"{role:<11} | {full_name:<22} | {email:<34} | {password}")

        print("\nMatricules eleves:")
        print("-" * 72)
        for user, student in students:
            print(f"{user.full_name:<22} | {student.class_name:<7} | {student.matricule}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
