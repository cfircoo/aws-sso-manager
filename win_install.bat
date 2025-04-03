@echo off
:: AWS SSO Manager Windows Installer
:: This script builds and installs the AWS SSO Manager application on Windows

echo AWS SSO Manager Windows Installer
echo ================================

:: Check for required tools
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is required but not installed.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm is required but not installed.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

:: Function to display progress
:progress
echo.
echo =^> %~1
goto :eof

:: Set installation directory
set APP_NAME=AWS SSO Manager
set INSTALL_DIR=%LOCALAPPDATA%\Programs\%APP_NAME%

:: Check if app is already installed
if exist "%INSTALL_DIR%" (
    choice /C YN /M "AWS SSO Manager is already installed. Do you want to replace it?"
    if errorlevel 2 (
        echo Installation canceled.
        exit /b 0
    )
)

:: Navigate to script directory
cd /d "%~dp0"

:: Build steps
call :progress "Installing dependencies..."
call npm install

call :progress "Building the application..."
call npm run build

call :progress "Creating the Windows application package..."
call npm run build-win

:: Check if the app was built successfully
if not exist "release\win-unpacked\%APP_NAME%.exe" (
    echo Error: Application build failed. Check the logs for details.
    exit /b 1
)

call :progress "Installing application to %INSTALL_DIR%..."

:: Stop running application if it exists
tasklist /FI "IMAGENAME eq %APP_NAME%.exe" 2>NUL | find /I /N "%APP_NAME%.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo %APP_NAME% is currently running. Closing it now...
    taskkill /F /IM "%APP_NAME%.exe" >NUL 2>NUL
    timeout /t 2 >NUL
)

:: Remove old version if exists
if exist "%INSTALL_DIR%" (
    rmdir /S /Q "%INSTALL_DIR%"
)

:: Create installation directory
mkdir "%INSTALL_DIR%"

:: Copy all files from the build directory
xcopy /E /I /H /Y "release\win-unpacked\*" "%INSTALL_DIR%"

:: Create shortcut on desktop
call :progress "Creating desktop shortcut..."
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\%APP_NAME%.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\%APP_NAME%.exe'; $Shortcut.Save()"

:: Create shortcut in start menu
call :progress "Adding to Start Menu..."
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('StartMenu') + '\Programs\%APP_NAME%.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\%APP_NAME%.exe'; $Shortcut.Save()"

call :progress "Installation complete!"
echo You can now launch AWS SSO Manager from your desktop or Start Menu.
echo.

start "" "%INSTALL_DIR%\%APP_NAME%.exe"

exit /b 0 