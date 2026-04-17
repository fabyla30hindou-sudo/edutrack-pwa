from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import json
from app.database import get_db
from app.schemas.schemas import UserCreate, UserResponse
from app.models.user import User
from app.models.admin import Admin
from app.models.school import School
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent
from app.routes.auth import get_current_user, hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _is_superadmin(user: User) -> bool:
    return (user.role or "").upper() == "SUPERADMIN"


def _is_admin(user: User) -> bool:
    return (user.role or "").upper() == "ADMIN"


def _assert_admin_or_superadmin(user: User):
    if not (_is_admin(user) or _is_superadmin(user)):
        raise HTTPException(status_code=403, detail="AccÃ¨s rÃ©servÃ© aux administrateurs")


def _assert_school_exists(db: Session, school_id: str) -> str:
    school = db.query(School).filter(School.id == int(school_id)).first()
    if not school or not school.is_active:
        raise HTTPException(status_code=400, detail="Ã‰tablissement introuvable ou inactif")
    return str(school.id)


def _ensure_user_scope(current_user: User, target_user: User):
    if _is_superadmin(current_user):
        return
    if _is_admin(current_user):
        if str(target_user.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Utilisateur hors de votre Ã©tablissement")
        if (target_user.role or "").upper() in ["ADMIN", "SUPERADMIN"]:
            raise HTTPException(status_code=403, detail="Action non autorisÃ©e sur ce rÃ´le")
        return
    raise HTTPException(status_code=403, detail="AccÃ¨s non autorisÃ©")


@router.get("/", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _assert_admin_or_superadmin(current_user)

    query = db.query(User)
    if _is_admin(current_user):
        query = query.filter(User.school_id == str(current_user.school_id))

    users = query.all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "school_id": u.school_id,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at
        }
        for u in users
    ]


@router.post("/admin", response_model=UserResponse)
def create_admin(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not _is_superadmin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Seul le super-administrateur peut crÃ©er des administrateurs d'Ã©cole"
        )

    if not user.school_id:
        raise HTTPException(status_code=400, detail="school_id est requis")

    school_id = _assert_school_exists(db, str(user.school_id))

    existing = db.query(User).filter(User.email.ilike(user.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email dÃ©jÃ  enregistrÃ©")

    hashed = hash_password(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed,
        full_name=user.full_name,
        school_id=school_id,
        role="ADMIN"
    )
    db.add(db_user)
    db.commit()
    db.flush()

    admin = Admin(user_id=db_user.id, school_id=school_id)
    db.add(admin)
    db.commit()
    db.refresh(db_user)

    return {
        "id": db_user.id,
        "email": db_user.email,
        "full_name": db_user.full_name,
        "school_id": db_user.school_id,
        "role": db_user.role,
        "is_active": db_user.is_active,
        "created_at": db_user.created_at
    }


@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _assert_admin_or_superadmin(current_user)

    role = (user.role or "").upper()
    if role not in ["STUDENT", "TEACHER", "PARENT"]:
        raise HTTPException(status_code=400, detail="RÃ´le non autorisÃ© pour cet endpoint")

    existing = db.query(User).filter(User.email.ilike(user.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email dÃ©jÃ  enregistrÃ©")

    if _is_admin(current_user):
        if user.school_id and str(user.school_id) != str(current_user.school_id):
            raise HTTPException(status_code=403, detail="Vous ne pouvez gÃ©rer que votre Ã©tablissement")
        school_id = str(current_user.school_id)
    else:
        if not user.school_id:
            raise HTTPException(status_code=400, detail="school_id est requis")
        school_id = _assert_school_exists(db, str(user.school_id))

    db_user = User(
        email=user.email,
        hashed_password=hash_password(user.password),
        full_name=user.full_name,
        school_id=school_id,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.flush()

    if role == "STUDENT":
        matricule = user.matricule or f"MAT{db_user.id}{int(datetime.utcnow().timestamp()*1000) % 1000000}"
        exists = db.query(Student).filter(Student.matricule == matricule).first()
        suffix = 1
        base = matricule
        while exists:
            matricule = f"{base}-{suffix}"
            exists = db.query(Student).filter(Student.matricule == matricule).first()
            suffix += 1
        db.add(Student(
            user_id=db_user.id,
            matricule=matricule,
            school_id=school_id,
            class_name=user.class_name or ""
        ))
    elif role == "TEACHER":
        db.add(Teacher(
            user_id=db_user.id,
            school_id=school_id,
            subject=user.subject or "",
            classes=json.dumps(user.classes or [])
        ))
    elif role == "PARENT":
        db.add(Parent(user_id=db_user.id))

    db.commit()
    db.refresh(db_user)

    return {
        "id": db_user.id,
        "email": db_user.email,
        "full_name": db_user.full_name,
        "school_id": db_user.school_id,
        "role": db_user.role,
        "is_active": db_user.is_active,
        "created_at": db_user.created_at
    }


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvÃ©")

    _ensure_user_scope(current_user, user)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "school_id": user.school_id,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at
    }


@router.put("/{user_id}")
def update_user(
    user_id: int,
    user_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvÃ©")

    _ensure_user_scope(current_user, user)

    if "school_id" in user_update and not _is_superadmin(current_user):
        raise HTTPException(status_code=403, detail="Seul le superadmin peut changer d'Ã©tablissement")

    for key, value in user_update.items():
        if key == "password" and value:
            setattr(user, "hashed_password", hash_password(value))
        elif key not in ["id", "role", "school_id"]:
            setattr(user, key, value)

    db.commit()
    return {"success": True}


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvÃ©")

    _ensure_user_scope(current_user, user)
    db.delete(user)
    db.commit()
    return {"success": True}
