#!/usr/bin/env python3
"""
Test rapide de la connexion super admin
"""
from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.routes.auth import hash_password, verify_password

# Créer la session
db = SessionLocal()

try:
    # Rechercher le super admin
    superadmin = db.query(User).filter(User.email == "superadmin@edutrack.fr").first()
    
    if superadmin:
        print("✅ Super Admin trouvé!")
        print(f"   Email: {superadmin.email}")
        print(f"   Rôle: {superadmin.role}")
        print(f"   Nom complet: {superadmin.full_name}")
        
        # Vérifier le mot de passe
        if verify_password("superadmin123", superadmin.hashed_password):
            print("✅ Mot de passe correct!")
        else:
            print("❌ Mot de passe incorrect!")
    else:
        print("❌ Super Admin non trouvé!")
        
finally:
    db.close()
