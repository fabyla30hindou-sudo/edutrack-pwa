#!/usr/bin/env python3
"""
Liste tous les utilisateurs avec un mot de passe en clair si retrouvable.
Le script tente de retrouver le mot de passe via:
- comptes seed connus
- correspondance SHA256 avec une petite liste de mots de passe courants
"""

import hashlib
from sqlalchemy import select
from app.database import SessionLocal
from app.models.parent import Parent, parent_student_association
from app.models.school import School
from app.models.student import Student
from app.models.user import User


# Mots de passe par defaut connus (issus des scripts de seed)
KNOWN_DEFAULT_PASSWORDS = {
    "superadmin@edutrack.fr": "superadmin123",
    "admin@lycee-scientifique.fr": "admin123",
    "valerie@lycee-scientifique.fr": "teacher123",
    "jean.martin@example.com": "parent123",
    "leo.martin@lycee-scientifique.fr": "student123",
    "nina.essono@lycee-scientifique.fr": "student123",
    "paul.ngo@lycee-scientifique.fr": "student123",
}

# Dictionnaire minimal pour retrouver des mots de passe courants en SHA256
COMMON_PASSWORD_CANDIDATES = [
    "123456",
    "password",
    "admin",
    "admin123",
    "teacher123",
    "student123",
    "parent123",
    "test123",
    "changeme",
    "qwerty",
]


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


HASH_TO_PLAIN = {sha256(p): p for p in COMMON_PASSWORD_CANDIDATES}


def get_school_name(db, school_id: str) -> str:
    if not school_id:
        return ""
    if str(school_id).upper() == "SYSTEM":
        return "SYSTEM"
    try:
        sid = int(str(school_id))
    except Exception:
        return str(school_id)
    school = db.query(School).filter(School.id == sid).first()
    return school.name if school else str(school_id)


def get_parent_children_info(db, user_id: int) -> str:
    parent = db.query(Parent).filter(Parent.user_id == user_id).first()
    if not parent:
        return "Aucun profil parent"

    child_ids = [
        row[0]
        for row in db.execute(
            select(parent_student_association.c.student_id).where(
                parent_student_association.c.parent_id == parent.id
            )
        ).all()
    ]
    if not child_ids:
        return "Aucun enfant lie"

    students = db.query(Student).filter(Student.id.in_(child_ids)).all()
    if not students:
        return "Aucun enfant lie"

    parts = []
    for s in students:
        child_user = db.query(User).filter(User.id == s.user_id).first()
        child_name = child_user.full_name if child_user else f"student#{s.id}"
        school_name = get_school_name(db, s.school_id)
        parts.append(f"{child_name} ({s.matricule}) - {school_name}")
    return "; ".join(parts)


def main() -> None:
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.id.asc()).all()
        if not users:
            print("Aucun utilisateur trouve.")
            return

        print("ID | Email | Role | School | PasswordPlain | ParentChildren")
        print("-" * 180)
        for u in users:
            email = (u.email or "").lower()
            default_pwd = KNOWN_DEFAULT_PASSWORDS.get(email)
            guessed_pwd = default_pwd or HASH_TO_PLAIN.get(u.hashed_password)
            plain_display = guessed_pwd if guessed_pwd else "INCONNU (hash non reversible)"
            school_name = get_school_name(db, u.school_id)
            parent_children = get_parent_children_info(db, u.id) if (u.role or "").upper() == "PARENT" else ""
            print(
                f"{u.id} | {u.email} | {u.role} | {school_name} | {plain_display} | {parent_children}"
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()
