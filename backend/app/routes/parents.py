from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.student import Student
from app.models.parent import Parent
from app.models.user import User
from app.models.teacher import Teacher
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.routes.auth import get_current_user
from app.schemas.schemas import StudentResponse
from pydantic import BaseModel

router = APIRouter(prefix="/parents", tags=["parents"])

class ParentChildRequest(BaseModel):
    school_id: str
    matricule: str

@router.post("/find-child")
def find_child_by_matricule(payload: ParentChildRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Permet aux parents de rechercher un enfant par son matricule et l'établissement
    """
    if current_user.role.upper() != "PARENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les parents peuvent accéder à cette fonction"
        )
    
    # Rechercher l'étudiant par matricule et établissement
    student = db.query(Student).filter(
        Student.matricule == payload.matricule,
        Student.school_id == payload.school_id
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enfant non trouvé"
        )
    
    # Récupérer les infos de l'utilisateur associé
    user = db.query(User).filter(User.id == student.user_id).first()
    
    return {
        "id": student.id,
        "user_id": student.user_id,
        "matricule": student.matricule,
        "full_name": user.full_name if user else None,
        "school_id": student.school_id,
        "class_name": student.class_name,
        "created_at": student.created_at
    }

@router.get("/my-children")
def get_my_children(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Récupère tous les enfants liés au parent connecté (via la relation many-to-many)
    """
    if current_user.role.upper() != "PARENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les parents peuvent accéder à cette fonction"
        )
    
    # Récupérer le parent
    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        return {"children": []}
    
    # Récupérer les enfants via la relation many-to-many
    from app.models.parent import parent_student_association
    students = db.query(Student).join(
        parent_student_association,
        Student.id == parent_student_association.c.student_id
    ).filter(
        parent_student_association.c.parent_id == parent.id
    ).all()
    
    children = []
    for student in students:
        user = db.query(User).filter(User.id == student.user_id).first()
        children.append({
            "id": student.id,
            "name": user.full_name if user else "Unknown",
            "matricule": student.matricule,
            "class_name": student.class_name,
            "school_id": student.school_id,
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.full_name if user else 'child'}"
        })
    
    return {"children": children}

@router.post("/link-child")
def link_child_to_parent(payload: ParentChildRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Lie un enfant au parent via le matricule
    """
    # Vérifier le rôle de façon insensible à la casse (les rôles sont stockés en majuscules)
    if getattr(current_user, 'role', '').upper() != "PARENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les parents peuvent accéder à cette fonction"
        )
    
    # Récupérer le parent
    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        # Créer le profil parent s'il n'existe pas
        parent = Parent(user_id=current_user.id)
        db.add(parent)
        db.commit()
        db.refresh(parent)
    
    # Rechercher l'étudiant
    student = db.query(Student).filter(
        Student.matricule == payload.matricule,
        Student.school_id == payload.school_id
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enfant non trouvé"
        )
    
    # Ajouter la relation many-to-many
    from app.models.parent import parent_student_association
    existing_link = db.execute(
        parent_student_association.select().where(
            (parent_student_association.c.parent_id == parent.id) &
            (parent_student_association.c.student_id == student.id)
        )
    ).first()
    if existing_link:
        return {"success": True, "message": "Enfant dÃ©jÃ  liÃ©"}

    stmt = parent_student_association.insert().values(
        parent_id=parent.id,
        student_id=student.id
    )
    db.execute(stmt)
    db.commit()
    
    user = db.query(User).filter(User.id == student.user_id).first()
    return {
        "success": True,
        "child": {
            "id": student.id,
            "name": user.full_name if user else "Unknown",
            "matricule": student.matricule,
            "class_name": student.class_name,
            "school_id": student.school_id
        }
    }

@router.get("/children/{student_id}/progress")
def get_child_progress(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retourne l'Ã©volution (notes + assiduitÃ©) d'un enfant liÃ© au parent"""
    if getattr(current_user, 'role', '').upper() != "PARENT":
        raise HTTPException(status_code=403, detail="Seuls les parents peuvent accÃ©der Ã  cette fonction")

    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        raise HTTPException(status_code=403, detail="Profil parent introuvable")

    from app.models.parent import parent_student_association
    link = db.execute(
        parent_student_association.select().where(
            (parent_student_association.c.parent_id == parent.id) &
            (parent_student_association.c.student_id == student_id)
        )
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="Cet enfant n'est pas liÃ© Ã  votre compte")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Enfant non trouvÃ©")

    grades = db.query(Grade).filter(Grade.student_id == student_id).order_by(Grade.graded_date.desc()).all()
    attendance = db.query(Attendance).filter(Attendance.student_id == student_id).order_by(Attendance.attendance_date.desc()).all()

    return {
        "student": {
            "id": student.id,
            "matricule": student.matricule,
            "class_name": student.class_name,
            "school_id": student.school_id
        },
        "grades": [
            {
                "id": g.id,
                "subject": g.subject,
                "grade": g.grade,
                "comment": g.comment,
                "graded_date": str(g.graded_date)
            } for g in grades
        ],
        "attendance": [
            {
                "id": a.id,
                "attendance_date": str(a.attendance_date),
                "status": a.status,
                "notes": a.notes
            } for a in attendance
        ]
    }

@router.get("/children/{student_id}/teachers")
def get_child_teachers(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Liste les enseignants de l'Ã©cole de l'enfant liÃ©"""
    if getattr(current_user, 'role', '').upper() != "PARENT":
        raise HTTPException(status_code=403, detail="Seuls les parents peuvent accÃ©der Ã  cette fonction")

    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        raise HTTPException(status_code=403, detail="Profil parent introuvable")

    from app.models.parent import parent_student_association
    link = db.execute(
        parent_student_association.select().where(
            (parent_student_association.c.parent_id == parent.id) &
            (parent_student_association.c.student_id == student_id)
        )
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="Cet enfant n'est pas liÃ© Ã  votre compte")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Enfant non trouvÃ©")

    teachers = db.query(Teacher).filter(Teacher.school_id == student.school_id).all()
    users = db.query(User).filter(User.id.in_([t.user_id for t in teachers])).all() if teachers else []
    by_user = {u.id: u for u in users}

    return [
        {
            "id": t.user_id,
            "full_name": by_user[t.user_id].full_name if t.user_id in by_user else "Unknown",
            "subject": t.subject,
            "classes": t.classes
        } for t in teachers
    ]
