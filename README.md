# Kho giáo án Tin học (TeachStash)

Ứng dụng Windows Desktop **offline** cho giáo viên Tin học THPT: lưu trữ, phân loại, tìm kiếm và tái sử dụng giáo án, bài giảng, bài tập, đề kiểm tra, tài liệu tham khảo và mã nguồn mẫu.

- **Backend:** .NET 9, ASP.NET Core Minimal API, EF Core + SQLite, FluentValidation (Clean Architecture)
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS 4 + Zustand, PDF.js, highlight.js, Lucide Icons
- **Desktop:** WPF + WebView2 (server nội bộ chạy cùng tiến trình trên `127.0.0.1`, cổng ưu tiên cố định `5080`)
- **Cloud Sync:** Tích hợp Google Drive API v3 (OAuth 2.0 PKCE / Loopback & Auth Code) sao lưu an toàn lên đám mây

---

## 🌟 Các tính năng chính (Key Features)

### 1. Quản lý tài liệu & giáo án đa định dạng
- Phân loại tài liệu theo **Loại** (Giáo án, Bài giảng, Đề kiểm tra, Bài tập, Chuyên đề...), **Khối lớp** (10, 11, 12), **Chủ đề** và **Bài học**.
- Hỗ trợ xem trước (preview) trực tiếp trong ứng dụng:
  - **Tài liệu văn phòng:** PDF, Word (.docx), Excel (.xlsx, .xls), PowerPoint (.pptx).
  - **Hình ảnh & Văn bản thuần:** PNG, JPG, SVG, TXT, Markdown, CSV, JSON.
  - **Mã nguồn:** Tự động tô màu cú pháp (Syntax Highlighting) cho C++, Python, Pascal, C#, Java, JavaScript, HTML/CSS, SQL.
- Quản lý tệp vật lý an toàn bằng mã định danh GUID, chống trùng lặp và thất lạc tệp tin.

### 2. Ngân hàng bài tập & đề luyện tập (Exercises Bank)
- Giao diện trực quan hỗ trợ 2 chế độ hiển thị linh hoạt: **Dạng lưới thẻ (Grid Cards)** và **Dạng bảng chi tiết (Table View)**.
- Phân cấp 4 mức độ nhận thức chuẩn sư phạm: **Nhận biết**, **Thông hiểu**, **Vận dụng**, **Vận dụng cao** kèm thanh lọc nhanh trực quan.
- Tích hợp trích đoạn đề bài, gợi ý giải thuật, lời giải chi tiết và mã nguồn mẫu.
- Nút **Sao chép đề bài nhanh** vào khay nhớ tạm để giáo viên dán ngay vào giáo án hoặc đề thi Word/PowerPoint.

### 3. Kho mã nguồn mẫu (Code Snippets)
- Lưu trữ các thuật toán, bài giải mẫu, đoạn code mẫu giảng dạy theo từng ngôn ngữ (Python, C++, Pascal...).
- Trình biên tập mã nguồn thông minh (giữ thụt lề, hỗ trợ Tab thụt dòng 4 dấu cách) và nút sao chép mã nguồn nhanh 1-click.

### 4. Tìm kiếm thông minh & Thẻ nhãn (Tags)
- Tìm kiếm toàn văn (Full-text Search) siêu tốc, tự động bỏ dấu tiếng Việt (ví dụ: gõ `"giao an"` vẫn tìm thấy `"giáo án"`).
- Hệ thống gắn thẻ (Tags) linh hoạt giúp gom nhóm học liệu theo chuyên đề liên môn hoặc đợt ôn thi.

### 5. Sao lưu nội bộ & Đồng bộ đám mây cá nhân (Google Drive Cloud Backup)
- **Sao lưu ngoại tuyến (Local Backup):** Đóng gói toàn bộ cơ sở dữ liệu và tệp đính kèm thành tệp nén `.zip` tiêu chuẩn; hỗ trợ kiểm tra tính toàn vẹn (Validate) trước khi phục hồi.
- **Đồng bộ Google Drive:**
  - Kết nối bảo mật tài khoản cá nhân qua Google OAuth 2.0.
  - Tự động tải bản sao lưu mới nhất lên Google Drive phòng ngừa trường hợp máy tính bị hỏng, lỗi ổ cứng hoặc đổi máy mới.
  - Quản lý hạn mức lưu trữ tự động trên đám mây (giữ lại N bản gần nhất để tránh đầy bộ nhớ Drive).
  - Khôi phục dữ liệu trực tiếp từ đám mây Google Drive về máy tính chỉ với 1 cú nhấp chuột.

### 6. Bảo mật & Thùng rác an toàn
- Hỗ trợ khóa bảo mật bằng mật khẩu khởi động và tự động khóa sau khoảng thời gian không thao tác.
- Thùng rác (Recycle Bin) cho phép xem lại, khôi phục hoặc dọn dẹp vĩnh viễn các tài liệu đã xóa.

---

## 1. Cài đặt môi trường phát triển (Windows 10/11 x64)

1. [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) (khuyến nghị .NET 9.0.300+)
2. [Node.js LTS](https://nodejs.org) (≥ 20)
3. Visual Studio 2022 17.12+ (workload *.NET desktop development*) hoặc VS Code + C# Dev Kit
4. [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (đã có sẵn trên Windows 10/11)
5. (Tùy chọn đóng gói) [Inno Setup 6](https://jrsoftware.org/isinfo.php)

---

## 2. Cấu trúc dự án

```
src/GiaoAn.Domain          Entity, enum, TextNormalizer (bỏ dấu tiếng Việt), TagName
src/GiaoAn.Application     Use cases/services, DTOs, validators, interfaces (IFileStorage, IAppDbContext…)
src/GiaoAn.Infrastructure  EF Core + SQLite, cấu hình entity, lưu tệp GUID, sao lưu/phục hồi, Google Drive sync
src/GiaoAn.Server          Minimal API, middleware bảo mật/CSRF, ServerHost (khởi chạy server nền)
src/GiaoAn.Desktop         WPF + WebView2 (TeachStash.exe), nạp giao diện React nội bộ từ wwwroot
web/                       Mã nguồn Frontend (React 18, TypeScript, Tailwind CSS, Vite)
tests/                     xUnit: Domain, Application (SQLite in-memory), Server (HTTP integration tests)
scripts/                   PowerShell scripts hỗ trợ dev, build, publish, đóng gói
installer/                 Kịch bản Inno Setup đóng gói bộ cài (.exe)
```

---

## 3. Chạy ứng dụng trên môi trường Development

### Cách A – Chạy trên Trình duyệt (khuyến nghị khi phát triển giao diện & API)
Cách này hỗ trợ **Hot-Module Replacement (HMR)** của Vite, code giao diện đổi tới đâu trình duyệt cập nhật tức thì tới đó.

1. **Khởi động tự động bằng script:**
   ```powershell
   .\scripts\dev.ps1
   ```
   *(Script sẽ mở 2 cửa sổ terminal: một cho .NET API cổng 5080 và một cho Vite dev server cổng 5174).*

2. **Hoặc khởi động thủ công (2 cửa sổ terminal riêng biệt):**
   - **Terminal 1 (Backend API):**
     ```powershell
     $env:GIAOAN_DEV = "1"; $env:GIAOAN_PORT = "5080"
     dotnet run --project src/GiaoAn.Server
     ```
   - **Terminal 2 (Frontend React):**
     ```powershell
     cd web
     npm install
     npm run dev
     ```
3. Mở trình duyệt tại: **`http://localhost:5174`** (Vite tự động proxy các request `/api` sang `http://127.0.0.1:5080`).

---

### Cách B – Chạy cửa sổ Desktop WPF nạp trực tiếp từ Vite dev server
Dành cho khi muốn xem giao diện chạy trực tiếp trong cửa sổ WebView2 của WPF Desktop nhưng vẫn giữ khả năng Hot-Reload của Vite:

1. Chạy Vite dev server trước:
   ```powershell
   cd web
   npm run dev
   ```
2. Mở cửa sổ thứ 2 và chạy script:
   ```powershell
   .\scripts\dev-desktop.ps1
   ```
   *(WPF Desktop sẽ tự động kết nối và tải giao diện từ `http://localhost:5174`).*

---

## 4. Cách Build lại giao diện (Frontend React / Vite)

Khi bạn thực hiện chỉnh sửa trong thư mục `web/src/` (thay đổi component, giao diện, CSS...):

```powershell
cd web
npm run build
cd ..
```

**Quá trình này sẽ thực hiện:**
- `tsc --noEmit`: Kiểm tra toàn bộ kiểu dữ liệu TypeScript (strict mode).
- `vite build`: Đóng gói và tối ưu hóa CSS, JavaScript vào thư mục `web/dist/`.

---

## 5. Cách Cập nhật lại App Desktop khi phát triển thêm hoặc chỉnh sửa

Sau khi bạn chỉnh sửa mã nguồn, thực hiện theo quy trình dưới đây để cập nhật ứng dụng Desktop:

### Trường hợp 1: Khi chỉnh sửa Frontend (React / TSX / CSS)
File `src/GiaoAn.Desktop/GiaoAn.Desktop.csproj` đã được cấu hình tự động đưa toàn bộ tệp từ `web/dist/` vào thư mục `wwwroot` cạnh file `TeachStash.exe`. Bạn chỉ cần:

```powershell
# 1. Build lại frontend
cd web
npm run build
cd ..

# 2. Build lại dự án Desktop để đồng bộ wwwroot mới nhất
dotnet build src/GiaoAn.Desktop/GiaoAn.Desktop.csproj
```

Chạy thử ứng dụng Desktop đã cập nhật:
```powershell
.\src\GiaoAn.Desktop\bin\Debug\net9.0-windows\TeachStash.exe
```

---

### Trường hợp 2: Khi chỉnh sửa Backend C# (.NET)
Khi thêm bớt bảng DB, sửa API Endpoints, Services hoặc Business Logic:

```powershell
# Biên dịch lại toàn bộ solution
dotnet build GiaoAnTin.sln

# Chạy kiểm thử toàn bộ test cases
dotnet test GiaoAnTin.sln
```

---

### Trường hợp 3: Đóng gói bản phát hành độc lập (Self-contained Publish)
Khi muốn xuất ra một thư mục chứa tệp `TeachStash.exe` hoàn chỉnh để dùng thử hoặc chuyển giao máy khác (người dùng **không cần cài .NET SDK**):

```powershell
.\scripts\publish.ps1
```

Kết quả xuất ra tại:
📁 `publish\TeachStash\TeachStash.exe`

*(Script sẽ tự động chạy `npm run build` cho frontend, sau đó chạy `dotnet publish` chế độ Release win-x64 self-contained kèm toàn bộ tài nguyên `wwwroot`).*

---

## 6. Đóng gói bộ cài đặt Setup (.exe)

1. Chạy lệnh xuất bản độc lập: `.\scripts\publish.ps1`.
2. (Tùy chọn) Tải `MicrosoftEdgeWebview2Setup.exe` đặt vào thư mục `installer\` nếu muốn bộ cài tự động cài WebView2 khi máy đích thiếu.
3. Mở tệp `installer\GiaoAnTin.iss` bằng **Inno Setup 6** và nhấn **Compile** (hoặc dùng dòng lệnh: `ISCC.exe installer\GiaoAnTin.iss`).
4. Tệp cài đặt cuối cùng sẽ nằm tại: `publish\installer\KhoGiaoAnTinHoc-Setup.exe`.

---

## 7. Thư mục dữ liệu & Cơ sở dữ liệu

- **Thư mục lưu trữ mặc định:** `D:\DCOPY\MAICHIVINH\DataApp\`
  - `giaoan.db`: Cơ sở dữ liệu SQLite
  - `files/`: Lưu tệp tài liệu, bài tập, code vật lý theo mã GUID
  - `backups/`: Các bản sao lưu toàn vẹn (.zip)
  - `logs/`: Ghi log vận hành ứng dụng hàng ngày
- Nếu ổ đĩa `D:\` không ghi được, ứng dụng sẽ hiện hộp thoại cho phép chọn thư mục bất kỳ và ghi nhớ tại `%LOCALAPPDATA%\KhoGiaoAnTinHoc\location.json`.

---

## 8. Khắc phục sự cố thường gặp

| Hiện tượng | Nguyên nhân & Cách xử lý |
|---|---|
| Thay đổi giao diện nhưng mở `TeachStash.exe` vẫn ra bản cũ | Chưa build lại web hoặc chưa đồng bộ `wwwroot`. Chạy: `cd web; npm run build; cd ..; dotnet build src/GiaoAn.Desktop` |
| Báo lỗi cổng 5174 hoặc 5080 đang bận | Một tiến trình Vite hoặc .NET cũ đang chạy ngầm. Mở Task Manager hoặc lệnh PowerShell tắt tiến trình `GiaoAn.Server` / `node` cũ |
| “Máy chưa cài WebView2 Runtime” | Cài đặt WebView2 Evergreen Runtime từ trang chủ Microsoft |
| Mở Desktop trắng tinh | Đảm bảo thư mục `web/dist/index.html` đã tồn tại trước khi biên dịch Desktop |
| Lỗi migration cơ sở dữ liệu | Nếu schema thay đổi lúc dev, có thể tạm xóa `giaoan.db` thử nghiệm; ứng dụng sẽ tự khởi tạo lại cấu trúc mới nhất qua `EnsureCreated()` |
| Lỗi đăng nhập Google Drive (redirect URI mismatch) | Đảm bảo server chạy đúng cổng cố định `5080` và đã thêm `http://127.0.0.1:5080/api/gdrive/callback` vào Authorized redirect URIs trên Google Cloud Console |
