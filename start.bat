@echo off
echo ===============================================
echo  ShiftSync - Website Setup Script
echo ===============================================
echo.

echo [1] Creating frames directory...
if not exist "frontend\public\frames" mkdir "frontend\public\frames"

echo [2] Copying animation frames (240 files)...
copy "animated\*.jpg" "frontend\public\frames\"
echo Done! Copied frames.

echo.
echo [3] Starting backend server in a new window...
start cmd /k "cd backend && call venv\Scripts\activate && python -m uvicorn main:app --reload --port 8000"

echo.
echo [4] Starting frontend development server...
echo    Open browser at: http://localhost:5173
echo.
cd frontend
npm run dev
