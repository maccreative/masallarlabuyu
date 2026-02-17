@echo off
setlocal
cd /d C:\Projects\masallarlabuyu

echo ==========================================
echo MasallarlaBuyu - One Click Deploy
echo ==========================================

git status
echo.

git add -A
if errorlevel 1 goto err

set msg=auto deploy
git commit -m "%msg%"
rem commit olmayabilir (degisiklik yoksa) sorun degil

git push
if errorlevel 1 goto err

echo.
echo ✅ Push tamam. Vercel otomatik deploy alacak.
pause
exit /b 0

:err
echo.
echo ❌ Hata oldu. Bu ekrani kopyalayip bana gonder.
pause
exit /b 1
