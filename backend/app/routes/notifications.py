from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.models.message import Notification
from app.routes.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "INFO"

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    timestamp: datetime
    is_read: bool = False
    
    class Config:
        from_attributes = True

@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les notifications de l'utilisateur courant"""
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "timestamp": n.timestamp,
            "is_read": n.is_read
        }
        for n in notifications
    ]

@router.post("/", response_model=NotificationResponse)
def create_notification(
    notification: NotificationCreate,
    user_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crée une notification (pour les admins/systèmes)"""
    db_notification = Notification(
        user_id=user_id or current_user.id,
        title=notification.title,
        message=notification.message,
        type=notification.type,
        timestamp=datetime.utcnow()
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    
    return {
        "id": db_notification.id,
        "title": db_notification.title,
        "message": db_notification.message,
        "type": db_notification.type,
        "timestamp": db_notification.timestamp,
        "is_read": db_notification.is_read
    }

@router.post("/mark-read/{notification_id}")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marque une notification comme lue"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    
    notification.is_read = True
    db.commit()
    return {"success": True}

@router.put("/{notification_id}/read")
def mark_as_read_put(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Alias de compatibilitÃ© frontend pour marquer une notification comme lue"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification non trouvÃ©e")

    notification.is_read = True
    db.commit()
    return {"success": True}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprime une notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    
    db.delete(notification)
    db.commit()
    return {"success": True}
