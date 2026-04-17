from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List, Union

# ===== USER SCHEMAS =====
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    school_id: Optional[Union[int, str]] = None  # Optionnel pour super admin
    role: str = "student"  # student, teacher, admin, parent
    matricule: Optional[str] = None
    class_name: Optional[str] = None
    subject: Optional[str] = None
    classes: Optional[List[str]] = None

class LoginRequest(BaseModel):
    email: str
    password: str
    school_id: Optional[Union[int, str]] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    school_id: Optional[Union[int, str]] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ===== TEACHER SCHEMAS =====
class TeacherCreate(BaseModel):
    user_id: int
    school_id: int
    subject: str
    classes: List[str]  # Liste des classes

class TeacherResponse(BaseModel):
    id: int
    user_id: int
    school_id: int
    subject: str
    classes: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ===== ADMIN SCHEMAS =====
class AdminCreate(BaseModel):
    user_id: int
    school_id: int

class AdminResponse(BaseModel):
    id: int
    user_id: int
    school_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ===== STUDENT SCHEMAS =====
class StudentCreate(BaseModel):
    user_id: int
    matricule: str
    school_id: int
    class_name: str

class StudentResponse(BaseModel):
    id: int
    user_id: int
    matricule: str
    school_id: int
    class_name: str
    created_at: datetime

    class Config:
        from_attributes = True

# ===== PARENT SCHEMAS =====
class ParentCreate(BaseModel):
    user_id: int

class ParentResponse(BaseModel):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ParentSearchStudent(BaseModel):
    school_id: int
    matricule: str

# ===== ATTENDANCE SCHEMAS =====
class AttendanceCreate(BaseModel):
    student_id: int
    status: str
    notes: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    attendance_date: str
    status: str

    class Config:
        from_attributes = True

# ===== QUIZ SCHEMAS =====
class QuizCreate(BaseModel):
    title: str
    description: str
    duration_minutes: int = 30

class QuizResponse(BaseModel):
    id: int
    title: str
    description: str
    total_questions: int
    duration_minutes: int

    class Config:
        from_attributes = True

# ===== GRADE SCHEMAS =====
class GradeCreate(BaseModel):
    student_id: int
    subject: str
    grade: float
    comment: Optional[str] = None

class GradeResponse(BaseModel):
    id: int
    student_id: int
    subject: str
    grade: float
    graded_date: datetime

    class Config:
        from_attributes = True
# ===== SCHOOL SCHEMAS =====
class SchoolCreate(BaseModel):
    name: str

class SchoolResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True