@echo off
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":80 " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8787 " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>nul
echo Local domain services stopped.
