# Mở ứng dụng WPF ở chế độ Development: WPF tự chạy server cổng 5080 và hiển thị giao diện từ Vite (http://localhost:5174).
# Cần chạy `cd web; npm run dev` trước.
$root = Split-Path -Parent $PSScriptRoot
$env:GIAOAN_DEV = "1"; $env:GIAOAN_PORT = "5080"
dotnet run --project "$root\src\GiaoAn.Desktop"
