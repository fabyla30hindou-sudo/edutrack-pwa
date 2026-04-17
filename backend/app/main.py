from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routes import students, attendance, grades, quizzes, users, auth, messages, notifications, schools, parents
import importlib
import hashlib
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.superadmin import SuperAdmin

# Debug: show which schemas module is loaded and StudentResponse fields
try:
    s = importlib.import_module('app.schemas')
    print('DEBUG: loaded schemas from', getattr(s, '__file__', None))
    print('DEBUG: StudentResponse fields =', list(getattr(s, 'StudentResponse').__fields__.keys()))
except Exception as e:
    print('DEBUG: could not inspect app.schemas:', e)

# Create tables
Base.metadata.create_all(bind=engine)

# Seed default superadmin if not present
def seed_superadmin():
    db: Session = SessionLocal()
    try:
        sa = db.query(User).filter(User.email.ilike('superadmin@edutrack.fr')).first()
        if not sa:
            pw = hashlib.sha256('superadmin123'.encode()).hexdigest()
            new = User(
                email='superadmin@edutrack.fr',
                hashed_password=pw,
                full_name='Super Admin',
                school_id='SYSTEM',
                role='SUPERADMIN'
            )
            db.add(new)
            db.flush()
            db.add(SuperAdmin(user_id=new.id))
            db.commit()
            print('INFO: Superadmin created with email superadmin@edutrack.fr and password superadmin123')
        else:
            updated = False
            if sa.role != 'SUPERADMIN':
                sa.role = 'SUPERADMIN'
                updated = True
            if sa.school_id != 'SYSTEM':
                sa.school_id = 'SYSTEM'
                updated = True
            sa_profile = db.query(SuperAdmin).filter(SuperAdmin.user_id == sa.id).first()
            if not sa_profile:
                db.add(SuperAdmin(user_id=sa.id))
                updated = True
            if updated:
                db.commit()
                print('INFO: Superadmin account normalized and profile ensured')
            print('INFO: Superadmin already exists')
    except Exception as e:
        print('ERROR seeding superadmin:', e)
        db.rollback()
    finally:
        db.close()

seed_superadmin()

app = FastAPI(
    title="EduTrack API",
    description="Backend API for EduTrack - Student Management System",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(grades.router)
app.include_router(quizzes.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(schools.router)
app.include_router(parents.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to EduTrack API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
