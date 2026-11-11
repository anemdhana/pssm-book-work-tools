@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Stopping any existing PSSM Book Work window and port 3010...
taskkill /FI "WINDOWTITLE eq PSSM Book Work*" /T /F >nul 2>&1
call :kill_port 3010

if not exist "node_modules\" (
  echo.
  echo Installing npm dependencies ^(first time^)...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting PSSM Book Work on http://localhost:3010 ...
start "PSSM Book Work" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo Waiting for the server, then opening the browser...
call :wait_port 3010 90
if errorlevel 1 (
  echo Timed out waiting for port 3010. Open http://localhost:3010 yourself.
) else (
  start "" "http://localhost:3010"
)

echo.
echo Book editor: http://localhost:3010
echo.
echo Re-run this script to stop and restart. Close the PSSM Book Work window to stop.
endlocal
exit /b 0

:kill_port
set "PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  if not "%%P"=="0" (
    echo   Killing PID %%P on port %PORT%
    taskkill /PID %%P /T /F >nul 2>&1
  )
)
exit /b 0

:wait_port
set "PORT=%~1"
set "MAX=%~2"
if "%MAX%"=="" set "MAX=60"
set /a "N=0"
:wait_port_loop
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a "N+=1"
if %N% GEQ %MAX% exit /b 1
timeout /t 1 /nobreak >nul
goto wait_port_loop
