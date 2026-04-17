from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.models.message import Message
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.teacher import Teacher
from app.models.parent import Parent, parent_student_association
from app.models.student import Student

router = APIRouter(prefix="/messages", tags=["messages"])

class MessageCreate(BaseModel):
    text: str
    recipient_id: int = None
    category: str = "general"

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    text: str
    timestamp: datetime
    category: str
    
    class Config:
        from_attributes = True

@router.post("/", response_model=MessageResponse)
def send_message(
    msg: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Envoie un message"""
    role = (current_user.role or "").upper()
    if role == "PARENT":
        if not msg.recipient_id:
            raise HTTPException(status_code=400, detail="Un parent doit cibler un enseignant")
        recipient = db.query(User).filter(User.id == msg.recipient_id).first()
        if not recipient or (recipient.role or "").upper() != "TEACHER":
            raise HTTPException(status_code=403, detail="Un parent peut contacter uniquement des enseignants")

        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Profil parent introuvable")

        child_ids = [
            row[0] for row in db.execute(
                parent_student_association.select().with_only_columns(parent_student_association.c.student_id).where(
                    parent_student_association.c.parent_id == parent.id
                )
            ).all()
        ]
        if not child_ids:
            raise HTTPException(status_code=403, detail="Aucun enfant liÃ© Ã  ce parent")

        teacher = db.query(Teacher).filter(Teacher.user_id == recipient.id).first()
        if not teacher:
            raise HTTPException(status_code=403, detail="Enseignant invalide")

        children = db.query(Student).filter(Student.id.in_(child_ids)).all()
        child_school_ids = {str(c.school_id) for c in children}
        if str(teacher.school_id) not in child_school_ids:
            raise HTTPException(status_code=403, detail="Cet enseignant n'est pas liÃ© Ã  l'Ã©tablissement de vos enfants")

        msg.category = "private"

    db_message = Message(
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        recipient_id=msg.recipient_id,
        text=msg.text,
        category=msg.category,
        timestamp=datetime.utcnow()
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return {
        "id": db_message.id,
        "sender_id": db_message.sender_id,
        "sender_name": db_message.sender_name,
        "text": db_message.text,
        "timestamp": db_message.timestamp,
        "category": db_message.category
    }

@router.get("/")
def get_messages(
    category: str = "general",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les messages d'une catégorie"""
    messages = db.query(Message).filter(
        Message.category == category,
        (Message.sender_id == current_user.id) | (Message.recipient_id == current_user.id) | (Message.recipient_id == None)
    ).all()
    
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": m.sender_name,
            "text": m.text,
            "timestamp": m.timestamp,
            "category": m.category,
            "is_read": m.is_read
        }
        for m in messages
    ]

@router.get("/{recipient_id}")
def get_private_messages(
    recipient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les messages privés avec un utilisateur"""
    messages = db.query(Message).filter(
        Message.category == "private",
        (
            ((Message.sender_id == current_user.id) & (Message.recipient_id == recipient_id)) |
            ((Message.sender_id == recipient_id) & (Message.recipient_id == current_user.id))
        )
    ).all()
    
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": m.sender_name,
            "text": m.text,
            "timestamp": m.timestamp,
            "is_me": m.sender_id == current_user.id
        }
        for m in messages
    ]

@router.put("/{message_id}/read")
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marque un message comme lu"""
    message = db.query(Message).filter(
        Message.id == message_id,
        ((Message.recipient_id == current_user.id) | (Message.sender_id == current_user.id))
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    message.is_read = True
    db.commit()
    return {"success": True}
