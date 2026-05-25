@echo off
REM Start the backend server for Windows

cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
