@echo off
setlocal

:: --- CONFIGURATION ---
set "REPO_URL=https://github.com/nebulize17/react-fastapi-thaid.git"
:: ---------------------

echo [1/4] Initializing Git...
git init

echo [2/4] Staging files (ignoring env/node_modules)...
git add .

echo [3/4] Creating commit...
git commit -m "Initial commit from Antigravity"

echo [4/4] Pushing to GitHub...
git branch -M main
git remote add origin %REPO_URL%
git push -u origin main

echo.
echo ==========================================
echo Done! Please check your GitHub repository.
echo ==========================================
pause
