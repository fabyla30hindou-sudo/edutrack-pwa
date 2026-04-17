@echo off
setlocal

cd /d "%~dp0"

echo [EduTrack] Demarrage backend...
start "EduTrack Backend" cmd /k "cd /d \"%~dp0\" && python backend_server.py"

echo [EduTrack] Demarrage frontend...
start "EduTrack Frontend" cmd /k "cd /d \"%~dp0\" && npm run dev"

echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
echo Fermez les fenetres backend/frontend pour arreter l'application.

endlocal
