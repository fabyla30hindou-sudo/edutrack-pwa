from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import time
from jose import JWTError, jwt
from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.admin import Admin
from app.models.parent import Parent
from app.models.school import School
from app.schemas.schemas import LoginRequest, UserResponse, UserCreate
import hashlib
import json
from pydantic import BaseModel

security = HTTPBearer()

router = APIRouter(prefix="/auth", tags=["auth"])

# Configuration de sÃ©curitÃ©
SECRET_KEY = "your-secret-key-change-in-production"  # Ã€ changer en env var
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 heures

class LoginResponse:
    def __init__(self, access_token, token_type, user, role):
        self.access_token = access_token
        self.token_type = token_type
        self.user = user
        self.role = role

class MeUpdateRequest(BaseModel):
    full_name: str | None = None
    email: str | None = None

def hash_password(password: str) -> str:
    """Hash simple avec SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def is_superadmin(user: User) -> bool:
    """VÃ©rifie si l'utilisateur est super-admin"""
    return user.role.upper() == "SUPERADMIN"

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """RÃ©cupÃ¨re l'utilisateur courant Ã  partir du token JWT"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token manquant dans l'en-tÃªte Authorization"
        )
    
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

@router.post("/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Authentifie un utilisateur et retourne un JWT
    Identifiants requis: email + password.
    school_id est optionnel et sert uniquement a departager des comptes
    qui partagent le meme email sur plusieurs etablissements.
    """
    school_input = (str(credentials.school_id).strip() if credentials.school_id is not None else "")

    users_with_email = db.query(User).filter(User.email.ilike(credentials.email)).all()
    matching_users = [u for u in users_with_email if verify_password(credentials.password, u.hashed_password)]

    if not matching_users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects"
        )

    # Un seul compte: connexion directe (superadmin, parent, enseignant, etc.)
    if len(matching_users) == 1:
        user = matching_users[0]
    else:
        # Plusieurs comptes avec le meme email: on demande school_id pour departager
        if not school_input:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plusieurs comptes trouves pour cet email. Veuillez renseigner l'etablissement."
            )

        school = None
        if hasattr(School, "code"):
            school = db.query(School).filter(
                (School.code.ilike(school_input)) | (School.name.ilike(school_input))
            ).first()
        else:
            try:
                school_id_int = int(school_input)
            except Exception:
                school_id_int = None

            if school_id_int is not None:
                school = db.query(School).filter(
                    (School.id == school_id_int) | (School.name.ilike(school_input))
                ).first()
            else:
                school = db.query(School).filter(School.name.ilike(school_input)).first()

        possible_school_ids = [school_input]
        if school:
            possible_school_ids.append(str(school.id))
            possible_school_ids.append(str(school.name))
            school_code = getattr(school, "code", None)
            if school_code:
                possible_school_ids.append(str(school_code))
        possible_school_ids = list({sid for sid in possible_school_ids if sid})

        filtered = [u for u in matching_users if str(u.school_id) in possible_school_ids]
        if len(filtered) == 1:
            user = filtered[0]
        elif len(filtered) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plusieurs comptes correspondent encore. Contactez un administrateur."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Identifiants incorrects"
            )
    
    # CrÃ©er le JWT
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # RÃ©cupÃ©rer les infos spÃ©cifiques au rÃ´le
    role_data = {}
    role_lower = user.role.lower()
    if role_lower == "student":
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if student:
            role_data = {"matricule": student.matricule, "class_name": student.class_name}
    elif role_lower == "teacher":
        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        if teacher:
            role_data = {"subject": teacher.subject, "classes": teacher.classes}
    elif role_lower in ["admin", "superadmin"]:
        admin = db.query(Admin).filter(Admin.user_id == user.id).first()
        if admin:
            role_data = {"school_id": admin.school_id}
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "school_id": user.school_id,
            "role": user.role,
            **role_data,
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.full_name}"
        }
    }

@router.post("/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    """
    CrÃ©e un nouvel utilisateur avec son rÃ´le spÃ©cifique
    """
    email = data.email
    role = (data.role or "student").lower()
    
    # DÃ©terminer school_id en fonction du rÃ´le
    if role == "superadmin":
        # Le super admin a une Ã©cole systÃ¨me
        school_id = "SYSTEM"
    else:
        if role == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La crÃ©ation d'un administrateur se fait uniquement par le super-administrateur"
            )

        # Les autres rÃ´les ont besoin d'une Ã©cole
        school_id = data.school_id
        if not school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="L'Ã©tablissement est requis pour ce rÃ´le"
            )

        school = None
        try:
            school = db.query(School).filter(School.id == int(school_id)).first()
        except Exception:
            school = db.query(School).filter(School.name.ilike(str(school_id))).first()

        if not school or not school.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="L'Ã©tablissement sÃ©lectionnÃ© est introuvable ou inactif"
            )

        school_id = str(school.id)
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email est requis"
        )

    # VÃ©rifier si l'email existe dÃ©jÃ 
    existing = db.query(User).filter(User.email.ilike(email)).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est dÃ©jÃ  enregistrÃ©"
        )
    
    # CrÃ©er le nouvel utilisateur
    new_user = User(
        email=email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        school_id=school_id,
        role=role.upper()  # Stocker en majuscules
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.flush()
        
        # CrÃ©er l'entitÃ© spÃ©cifique au rÃ´le
        if role == "student":
            # GÃ©nÃ©rer un matricule unique si non fourni (Ã©vite l'erreur d'unicitÃ© sur matricule)
            gen_matricule = data.matricule
            if not gen_matricule:
                gen_matricule = f"MAT{new_user.id}{int(datetime.utcnow().timestamp()*1000) % 1000000}"

            # Assurer l'unicitÃ© en ajoutant un suffixe si nÃ©cessaire
            existing_m = db.query(Student).filter(Student.matricule == gen_matricule).first()
            suffix = 1
            base_m = gen_matricule
            while existing_m:
                gen_matricule = f"{base_m}-{suffix}"
                existing_m = db.query(Student).filter(Student.matricule == gen_matricule).first()
                suffix += 1

            student = Student(
                user_id=new_user.id,
                matricule=gen_matricule,
                school_id=school_id,
                class_name=data.class_name or ""
            )
            db.add(student)
        elif role == "teacher":
            teacher = Teacher(
                user_id=new_user.id,
                school_id=school_id,
                subject=data.subject or "",
                classes=json.dumps(data.classes or [])
            )
            db.add(teacher)
        elif role == "admin":
            admin = Admin(
                user_id=new_user.id,
                school_id=school_id
            )
            db.add(admin)
        elif role == "superadmin":
            # CrÃ©er le profil SuperAdmin
            from app.models.superadmin import SuperAdmin
            superadmin = SuperAdmin(user_id=new_user.id)
            db.add(superadmin)
        elif role == "parent":
            parent = Parent(user_id=new_user.id)
            db.add(parent)
        
        db.commit()
        db.refresh(new_user)
        
        # CrÃ©er un JWT
        access_token = create_access_token(data={"sub": str(new_user.id)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "full_name": new_user.full_name,
                "school_id": new_user.school_id,
                "role": new_user.role,
                "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={new_user.full_name}"
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de la crÃ©ation: {str(e)}"
        )

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """
    RÃ©cupÃ¨re les informations de l'utilisateur courant
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "school_id": current_user.school_id,
        "role": current_user.role,
        "is_active": current_user.is_active
    }

@router.put("/me")
def update_me(data: MeUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Met ÃƒÂ  jour le profil utilisateur courant"""
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.email is not None:
        current_user.email = data.email
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "school_id": current_user.school_id,
        "role": current_user.role,
        "is_active": current_user.is_active
    }

@router.post("/logout")
def logout():
    """
    DÃ©connecte l'utilisateur (cÃ´tÃ© client: supprimer le token du localStorage)
    """
    return {"message": "DÃ©connexion rÃ©ussie"}


