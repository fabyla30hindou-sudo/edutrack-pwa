from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date
from datetime import datetime, date
from app.database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    attendance_date = Column(Date, default=date.today)
    status = Column(String)  # present, absent, late, justified
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
