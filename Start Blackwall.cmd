@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Blackwall requires Node.js 20 or newer.
  echo Install Node.js, then run this launcher again.
  pause
  exit /b 1
)
node src/app/main.mjs --open
endlocal
