@echo off
setlocal

cd /d "%~dp0"

echo [EduTrack] Verification des dependances...
where python >nul 2>&1 || (echo ERREUR: Python non trouve && pause && exit /b 1)
where npm >nul 2>&1 || (echo ERREUR: npm non trouve && pause && exit /b 1)

echo.
echo [EduTrack] Demarrage backend (port 8000)...
start "EduTrack Backend" cmd /k "python backend_server.py"

echo [EduTrack] Demarrage frontend (port 3000)...
start "EduTrack Frontend" cmd /k "npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo       EduTrack - URLs d'acces
echo ========================================
echo Backend API:  http://127.0.0.1:8000
echo Frontend:     http://localhost:3000
echo.
echo Appuyez sur une touche pour fermer...
pause >nul

endlocal
