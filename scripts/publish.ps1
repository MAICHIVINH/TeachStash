# Build React + publish WPF self-contained win-x64 vào .\publish\TeachStash
param([string]$Output = ".\publish\TeachStash")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location "$root\web"; npm ci; npm run build; Pop-Location
dotnet publish "$root\src\GiaoAn.Desktop\GiaoAn.Desktop.csproj" -c Release -r win-x64 --self-contained true `
  -p:PublishReadyToRun=true -o (Join-Path $root $Output)
Write-Host "Xong: $(Join-Path $root $Output)\TeachStash.exe"
