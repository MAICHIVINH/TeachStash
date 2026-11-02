$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$publishExe = "$root\publish\TeachStash\TeachStash.exe"
$debugExe = "$root\src\GiaoAn.Desktop\bin\Debug\net9.0-windows\TeachStash.exe"
$iconPath = "$root\src\GiaoAn.Desktop\app.ico"

$targetExe = ""
if (Test-Path $publishExe) {
    $targetExe = $publishExe
} elseif (Test-Path $debugExe) {
    $targetExe = $debugExe
} else {
    Write-Host "Building TeachStash..." -ForegroundColor Cyan
    & dotnet build "$root\src\GiaoAn.Desktop\GiaoAn.Desktop.csproj" -c Debug
    $targetExe = $debugExe
}

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "TeachStash.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetExe
$Shortcut.WorkingDirectory = Split-Path -Parent $targetExe
$Shortcut.Description = "TeachStash - Kho giao an Tin hoc"
if (Test-Path $iconPath) {
    $Shortcut.IconLocation = "$iconPath,0"
}
$Shortcut.Save()

Write-Host "SUCCESS: Created desktop shortcut at $shortcutPath" -ForegroundColor Green
Write-Host "Target: $targetExe" -ForegroundColor White
Write-Host "Icon: $iconPath" -ForegroundColor White
