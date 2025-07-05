@echo off
echo Cleaning up build artifacts...

:: Kill any running processes
taskkill /F /IM Hourglass.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

:: Wait a moment for processes to close
timeout /t 2 >nul

:: Remove the out directory using multiple methods
if exist out (
    echo Attempting to remove out directory...
    rmdir /s /q out >nul 2>&1
    if exist out (
        echo First attempt failed, trying with PowerShell...
        powershell -Command "Remove-Item -Path 'out' -Recurse -Force -ErrorAction SilentlyContinue"
    )
    if exist out (
        echo Directory still exists, trying file by file removal...
        del /f /s /q out\*.* >nul 2>&1
        rmdir /s /q out >nul 2>&1
    )
)

if exist .vite (
    echo Removing .vite directory...
    rmdir /s /q .vite >nul 2>&1
)

echo Cleanup complete!
echo Ready to run: npm run make
