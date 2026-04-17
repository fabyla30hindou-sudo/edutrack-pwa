from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.school import School
from app.models.user import User
from app.routes.auth import get_current_user
from pydantic import BaseModel
from fastapi import Query

router = APIRouter(prefix="/schools", tags=["schools"])

class SchoolCreate(BaseModel):
    name: str  # Juste le nom de l'école

@router.get("/")
def get_all_schools(db: Session = Depends(get_db)):
    """Récupère toutes les écoles actives (dropdown pour l'inscription/connexion)"""
    schools = db.query(School).filter(School.is_active == True).all()
    return [
        {
            "id": school.id,
            "name": school.name
        }
        for school in schools
    ]

@router.get("/search")
def search_schools(query: str = Query(default=""), db: Session = Depends(get_db)):
    """Recherche simple d'Ã©tablissements par nom (compat frontend)"""
    q = (query or "").strip()
    schools_query = db.query(School).filter(School.is_active == True)
    if q:
        schools_query = schools_query.filter(School.name.ilike(f"%{q}%"))

    schools = schools_query.order_by(School.name.asc()).all()
    return [{"id": s.id, "name": s.name} for s in schools]

@router.get("/{school_id}")
def get_school(school_id: int, db: Session = Depends(get_db)):
    """Récupère une école spécifique"""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")
    
    return {
        "id": school.id,
        "name": school.name,
        "is_active": school.is_active
    }

@router.post("/")
def create_school(
    school: SchoolCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crée un nouvel établissement (SUPER ADMIN UNIQUEMENT)"""
    # Vérifier que c'est le super-admin
    if current_user.role.upper() != "SUPERADMIN":
        raise HTTPException(
            status_code=403,
            detail="Seul le super-administrateur peut créer des établissements"
        )
    
    existing = db.query(School).filter(School.name == school.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Établissement avec ce nom existe déjà")
    
    db_school = School(name=school.name)
    db.add(db_school)
    db.commit()
    db.refresh(db_school)
    
    return {
        "id": db_school.id,
        "name": db_school.name
    }

@router.put("/{school_id}")
def update_school(
    school_id: int,
    school: SchoolCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Met à jour une école (SUPER ADMIN UNIQUEMENT)"""
    if current_user.role.upper() != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Seul le super-administrateur peut modifier les établissements")
    
    db_school = db.query(School).filter(School.id == school_id).first()
    if not db_school:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")
    
    db_school.name = school.name
    db.commit()
    
    return {"success": True}

@router.delete("/{school_id}")
def delete_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprime une école (SUPER ADMIN UNIQUEMENT)"""
    if current_user.role.upper() != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Seul le super-administrateur peut supprimer des établissements")
    
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Établissement non trouvé")
    
    # Soft delete - désactiver l'établissement au lieu de le supprimer
    school.is_active = False
    db.commit()
    
    return {"success": True}
