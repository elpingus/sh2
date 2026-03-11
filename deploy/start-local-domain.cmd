@echo off
setlocal

set "ROOT=%~dp0.."

if not exist "%ROOT%\run" mkdir "%ROOT%\run"

start "SteamHours API" cmd /k "pushd ""%ROOT%\api"" && node src\server.js"
timeout /t 2 /nobreak >nul
start "SteamHours Local Preview" cmd /k "pushd ""%ROOT%"" && node deploy\local-preview-server.cjs"

echo Local domain services started.
echo Frontend: http://steamhoursnet.xyz
echo API: http://steamhoursnet.xyz/api/health
echo If deploy\certs\steamhoursnet.xyz.pem exists, https://steamhoursnet.xyz will be used automatically.
