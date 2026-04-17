"""
Script d'initialisation de la base de données avec des utilisateurs de test
"""
from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.admin import Admin
from app.models.parent import Parent
from app.models.school import School
from app.models.superadmin import SuperAdmin
import hashlib

# Créer les tables
Base.metadata.create_all(bind=engine)

# Créer la session
db = SessionLocal()

def hash_password(password: str) -> str:
    """Hash simple avec SHA256 pour les tests"""
    return hashlib.sha256(password.encode()).hexdigest()

try:
    # Vérifier si les écoles existent déjà
    existing_schools = db.query(School).count()
    
    if existing_schools == 0:
        # Créer les écoles de test
        schools = [
            School(name="Lycée Scientifique"),
            School(name="Collège Voltaire"),
            School(name="Lycée Technique"),
            School(name="Lycée Bilingue de Bertoua"),
        ]
        for school in schools:
            db.add(school)
        db.commit()
        print("✅ Écoles créées avec succès!")
    
    # Vérifier si les utilisateurs existent déjà
    existing_users = db.query(User).count()
    
    if existing_users == 0:
        # Récupérer la première école pour les utilisateurs de test
        school1 = db.query(School).first()
        school_id = school1.id if school1 else 1
        
        # 👑 CRÉER LE SUPER-ADMINISTRATEUR
        superadmin_user = User(
            email="superadmin@edutrack.fr",
            full_name="Super Administrateur",
            hashed_password=hash_password("superadmin123"),
            school_id=school_id,
            role="SUPERADMIN"
        )
        db.add(superadmin_user)
        db.flush()
        
        # Créer le profil SuperAdmin
        superadmin = SuperAdmin(user_id=superadmin_user.id)
        db.add(superadmin)
        
        # Créer un administrateur RÉGULIER
        admin_user = User(
            email="admin@lycee-scientifique.fr",
            full_name="Administrateur École",
            hashed_password=hash_password("admin123"),
            school_id=school_id,
            role="ADMIN"
        )
        db.add(admin_user)
        db.flush()
        
        admin = Admin(user_id=admin_user.id, school_id=school_id)
        db.add(admin)
        
        # Créer un enseignant
        teacher_user = User(
            email="valerie@lycee-scientifique.fr",
            full_name="Mme Valérie",
            hashed_password=hash_password("teacher123"),
            school_id=school_id,
            role="TEACHER"
        )
        db.add(teacher_user)
        db.flush()
        
        teacher = Teacher(
            user_id=teacher_user.id,
            school_id=school_id,
            subject="Mathématiques",
            classes='["6ème A", "5ème B"]'
        )
        db.add(teacher)
        
        # Créer un parent
        parent_user = User(
            email="jean.martin@example.com",
            full_name="Jean Martin",
            hashed_password=hash_password("parent123"),
            school_id=school_id,
            role="PARENT"
        )
        db.add(parent_user)
        db.flush()
        
        parent = Parent(user_id=parent_user.id)
        db.add(parent)
        
        # Créer un élève
        student_user = User(
            email="leo.martin@lycee-scientifique.fr",
            full_name="Léo Martin",
            hashed_password=hash_password("student123"),
            school_id=school_id,
            role="STUDENT"
        )
        db.add(student_user)
        db.flush()
        
        student = Student(
            user_id=student_user.id,
            school_id=school_id,
            matricule="MAT001",
            class_name="6ème A"
        )
        db.add(student)
        
        db.commit()
        print("✅ Tables créées et utilisateurs de test ajoutés avec succès!")
        print("\n" + "="*60)
        print("🔐 IDENTIFIANTS DE TEST")
        print("="*60)
        print("\n👑 SUPER ADMIN (crée les écoles):")
        print("   Email: superadmin@edutrack.fr")
        print("   Mot de passe: superadmin123")
        print("\n🔒 ADMIN RÉGULIER:")
        print("   Email: admin@lycee-scientifique.fr")
        print("   Mot de passe: admin123")
        print("\n👨‍🏫 ENSEIGNANT:")
        print("   Email: valerie@lycee-scientifique.fr")
        print("   Mot de passe: teacher123")
        print("\n👨‍👩‍👧 PARENT:")
        print("   Email: jean.martin@example.com")
        print("   Mot de passe: parent123")
        print("\n🎓 ÉLÈVE:")
        print("   Email: leo.martin@lycee-scientifique.fr")
        print("   Mot de passe: student123")
        print("   Matricule: MAT001")
        print("\n🏫 ÉCOLES (sélectionnez dans le dropdown):")
        all_schools = db.query(School).all()
        for school in all_schools:
            print(f"   • {school.name} (ID: {school.id})")
        print("="*60 + "\n")
    else:
        print(f"✅ Base de données contient déjà {existing_users} utilisateur(s)")

finally:
    db.close()
