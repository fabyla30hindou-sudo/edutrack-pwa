#!/usr/bin/env python
"""
Simple backend launcher for EduTrack
Run from project root: python -m backend_server
"""

import sys
from pathlib import Path

# Ajouter le chemin backend au sys.path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app
import uvicorn

if __name__ == "__main__":
    print("Demarrage du serveur EduTrack Backend...")
    print("Adresse: http://127.0.0.1:8000")
    print("Documentation: http://127.0.0.1:8000/docs")
    print("Arret: CTRL+C\n")

    uvicorn.run(app, host="127.0.0.1", port=8000)
