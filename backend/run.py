import sys
import os

# Ajouter le répertoire backend au sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
