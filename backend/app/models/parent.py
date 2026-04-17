from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from datetime import datetime
from app.database import Base

# Relation many-to-many entre parents et enfants
parent_student_association = Table(
    'parent_student',
    Base.metadata,
    Column('parent_id', Integer, ForeignKey('parents.id')),
    Column('student_id', Integer, ForeignKey('students.id'))
)

class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    # Les parents sont identifiés et liés aux enfants via le matricule
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
