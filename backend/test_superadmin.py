#!/usr/bin/env python3
"""
Script de test pour vérifier que la connexion super admin fonctionne
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_superadmin_login():
    """Test la connexion du super admin sans school_id obligatoire"""
    print("=" * 60)
    print("TEST: Connexion Super Admin")
    print("=" * 60)
    
    # Données de connexion super admin
    login_data = {
        "email": "superadmin@edutrack.fr",
        "password": "superadmin123",
        "school_id": "SYSTEM"  # Peut être vide ou SYSTEM pour super admin
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Connexion réussie!")
            print(f"   Token: {result['access_token'][:20]}...")
            print(f"   Rôle: {result['user']['role']}")
            print(f"   Email: {result['user']['email']}")
            return result['access_token']
        else:
            print(f"❌ Erreur de connexion: {response.status_code}")
            print(f"   {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def test_create_school(token):
    """Test la création d'une école par le super admin"""
    print("\n" + "=" * 60)
    print("TEST: Créer une école (Super Admin)")
    print("=" * 60)
    
    school_data = {
        "name": "Lycée de Test Créé"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(f"{BASE_URL}/schools/", json=school_data, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ École créée avec succès!")
            print(f"   ID: {result.get('id')}")
            print(f"   Nom: {result.get('name')}")
            return result
        else:
            print(f"❌ Erreur création école: {response.status_code}")
            print(f"   {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def test_list_users(token):
    """Test la liste des utilisateurs"""
    print("\n" + "=" * 60)
    print("TEST: Lister les utilisateurs")
    print("=" * 60)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/users/", headers=headers)
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ {len(users)} utilisateur(s) trouvé(s)")
            for user in users[:3]:  # Afficher les 3 premiers
                print(f"   - {user['full_name']} ({user['role']})")
        else:
            print(f"❌ Erreur listage: {response.status_code}")
            print(f"   {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    print("\n🚀 Démarrage des tests Super Admin\n")
    
    # Test 1: Connexion
    token = test_superadmin_login()
    
    if token:
        # Test 2: Créer une école
        test_create_school(token)
        
        # Test 3: Lister les utilisateurs
        test_list_users(token)
    
    print("\n✅ Tests terminés\n")
