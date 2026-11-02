# Tạo migration EF Core (chạy một lần sau khi thay đổi model). Cần: dotnet tool install --global dotnet-ef
param([Parameter(Mandatory=$true)][string]$Name)
$root = Split-Path -Parent $PSScriptRoot
dotnet ef migrations add $Name `
  --project "$root\src\GiaoAn.Infrastructure" `
  --startup-project "$root\src\GiaoAn.Server" `
  --output-dir Persistence\Migrations
