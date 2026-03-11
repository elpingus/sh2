$root = 'c:\Users\arash\Desktop\hourboýst'
$apiLogOut = Join-Path $root 'run\api.out.log'
$apiLogErr = Join-Path $root 'run\api.err.log'
$previewLogOut = Join-Path $root 'run\preview.out.log'
$previewLogErr = Join-Path $root 'run\preview.err.log'
New-Item -ItemType Directory -Force -Path (Join-Path $root 'run') | Out-Null
Start-Process -FilePath powershell.exe -WorkingDirectory (Join-Path $root 'api') -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command',"Set-Location '$root\api'; node src/server.js 1>> '$apiLogOut' 2>> '$apiLogErr'"
Start-Sleep -Seconds 2
Start-Process -FilePath powershell.exe -WorkingDirectory $root -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command',"Set-Location '$root'; node deploy/local-preview-server.cjs 1>> '$previewLogOut' 2>> '$previewLogErr'"
