# Dong goi tu dong bo cai TeachStash-Setup.exe
param([switch]$SkipPublish = $false)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "=== BUOC 1: XUAT BAN UNG DUNG (PUBLISH) ===" -ForegroundColor Cyan
if (-not $SkipPublish) {
    & "$PSScriptRoot\publish.ps1"
}

Write-Host "`n=== BUOC 2: TIM TRINH BIEN DICH INNO SETUP (ISCC.exe) ===" -ForegroundColor Cyan
$isccCandidates = @(
    "ISCC.exe",
    "D:\DCOPY\IT\Inno Setup 6\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)

$isccPath = $null
foreach ($path in $isccCandidates) {
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        $isccPath = $path
        break
    }
    if (Test-Path $path) {
        $isccPath = $path
        break
    }
}

if (-not $isccPath) {
    Write-Host "[!] Chua tim thay Inno Setup 6 tren may tinh cua ban!" -ForegroundColor Yellow
    Write-Host "Vui long tai va cai dat Inno Setup 6 (mien phi, ~5MB) tai:" -ForegroundColor Yellow
    Write-Host "Link: https://jrsoftware.org/isdl.php" -ForegroundColor Cyan
    Write-Host "Sau khi cai dat xong Inno Setup, hay chay lai script nay hoac mo file installer\GiaoAnTin.iss va nhan Compile (Ctrl + F9)." -ForegroundColor White
    exit 1
}

Write-Host "Da tim thay Inno Setup tai: $isccPath" -ForegroundColor Green
Write-Host "`n=== BUOC 3: DONG GOI BO CAI SETUP (.EXE) ===" -ForegroundColor Cyan
$issFile = Join-Path $root "installer\GiaoAnTin.iss"
& $isccPath $issFile

$installerOutput = Join-Path $root "publish\installer\TeachStash-Setup.exe"
if (Test-Path $installerOutput) {
    Write-Host "`n[THANH CONG] File cai dat Setup da duoc tao tai:" -ForegroundColor Green
    Write-Host "$installerOutput" -ForegroundColor White
}