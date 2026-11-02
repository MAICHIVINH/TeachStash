# Chạy chế độ Development: server (cổng 5080) + Vite (cổng 5174). Mở cửa sổ WPF riêng bằng scripts/dev-desktop.ps1 nếu muốn.
$root = Split-Path -Parent $PSScriptRoot
$env:GIAOAN_DEV = "1"; $env:GIAOAN_PORT = "5080"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; dotnet run --project src/GiaoAn.Server"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\web'; npm install; npm run dev"
Write-Host "Server: http://127.0.0.1:5080   Giao diện: http://localhost:5174"
