# Kho giáo án Tin học (TeachStash)

Ứng dụng Windows Desktop **offline** cho giáo viên Tin học THPT: lưu trữ, phân loại, tìm kiếm và tái sử dụng giáo án, bài giảng, bài tập, đề kiểm tra, tài liệu tham khảo và mã nguồn mẫu.

- **Backend:** .NET 9, ASP.NET Core Minimal API, EF Core + SQLite, FluentValidation (Clean Architecture)
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS 4 + Zustand, Docx, JSZip, PDF.js, highlight.js, Lucide Icons
- **Desktop:** WPF + WebView2 (server nội bộ chạy cùng tiến trình trên `127.0.0.1`, cổng ưu tiên cố định `5080`)
- **Cloud Sync:** Tích hợp Google Drive API v3 (OAuth 2.0 PKCE / Loopback & Auth Code) sao lưu an toàn lên đám mây

---

## 🌟 Các tính năng chính (Key Features)

### 1. Kế hoạch giảng dạy & Phân phối chương trình (PPCT Planner) (Mới ⭐)
- **Tiến độ chuẩn 35 tuần chuẩn mẫu Công văn 5512 (Phụ lục 3):**
  - Bảng theo dõi trực quan đúng cấu trúc chuẩn của Bộ GD&ĐT: **STT $\rightarrow$ PPCT $\rightarrow$ Bài học $\rightarrow$ Số tiết $\rightarrow$ Tuần $\rightarrow$ Thiết bị dạy học $\rightarrow$ Địa điểm dạy học $\rightarrow$ Trạng thái $\rightarrow$ Ngày dạy $\rightarrow$ Tài liệu gắn kèm $\rightarrow$ Ghi chú**.
  - **Tự động gom nhóm chuyên nghiệp:** Phân nhóm theo **Học kỳ (Học kỳ 1 / Học kỳ 2)** và **Chủ đề** kèm tự động tính tổng số tiết lý thuyết + thực hành (ví dụ: `CHỦ ĐỀ 1. MÁY TÍNH VÀ XÃ HỘI TRI THỨC (10 tiết: 8LT+2TH)`).
  - **Khởi tạo siêu tốc 1-click:** Nút *"Khởi tạo nhanh từ bài học"* tự động quét danh mục bài học Tin học của khối để tạo đầy đủ 35 tuần giảng dạy theo phân phối chương trình kèm thiết bị và địa điểm dạy học chuẩn, giáo viên không cần gõ tay thủ công từng tiết.
  - **Xuất file Word (.docx) chuẩn mẫu Công văn 5512:** Nhấn nút *"Xuất Word (CV 5512)"* để xuất trọn vẹn Kế hoạch dạy học của tổ chuyên môn ra file Word khổ ngang A4, chuẩn phông Times New Roman kèm phần ký tên của Tổ trưởng chuyên môn và Giáo viên để in ấn hoặc nộp cho Ban giám hiệu.
  - Cho phép tùy biến, thêm tiết dạy mới, sửa tên bài, số tiết (2LT, 2TH), thiết bị, địa điểm dạy học hoặc ghi chú riêng cho từng tiết trong khung chuẩn.
- **Theo dõi tiến độ chi tiết theo từng Lớp học:**
  - Hệ thống tab chuyển đổi linh hoạt giữa các lớp (ví dụ: `11A1`, `11A2`, `11A5`...).
  - Quản lý thêm lớp, sửa tên lớp, phân chia năm học độc lập. Khung PPCT chuẩn của khối dùng chung, nhưng tiến độ bài dạy và ngày thực dạy được lưu riêng biệt cho từng lớp.
- **Đánh dấu trạng thái 1 chạm (1-touch Toggle):**
  - Chuyển đổi nhanh 1-chạm giữa các trạng thái: **Đã dạy** (xanh lục với dấu kiểm), **Chưa dạy** (xám), **Nghỉ / Hoãn** (vàng cam), **Dạy bù** (xanh dương).
  - Tự động điền ngày dạy thực tế khi giáo viên đánh dấu *"Đã dạy"*.
- **Thanh tiến độ & Thống kê trực quan (Progress Banner):**
  - Hiển thị tỷ lệ hoàn thành theo thời gian thực (ví dụ: `Đã dạy 18/35 tiết (51.4%)`).
  - Đếm chi tiết số tiết đã dạy, chưa dạy, số tiết nghỉ/hoãn cần dạy bù.
  - Bộ lọc học kỳ tiện lợi: **Cả năm (35 tuần)**, **Học kỳ 1 (Tuần 1–18)**, **Học kỳ 2 (Tuần 19–35)** hoặc lọc theo từng trạng thái bài dạy.
- **Gắn nhanh tài liệu & Xem trước 1-click (Instant Document Preview):**
  - Hệ thống tự động nhận diện và hiển thị các huy hiệu tài liệu gắn kèm theo bài học: **Giáo án (KHBD)** (xanh dương), **Bài giảng trình chiếu (PPTX)** (cam), **Phiếu học tập / Bài tập** (tím).
  - Nhấp trực tiếp vào huy hiệu tài liệu để mở ngay hộp thoại xem trước (Preview Modal), đọc nội dung tệp hoặc mở bằng ứng dụng trên máy mà không cần rời khỏi bảng kế hoạch.

### 2. Trộn đề & Tạo đề kiểm tra tự động theo Ma trận GDPT 2018 (Mới ⭐)
- **Quy trình 3 bước (Wizard) tinh gọn & chuyên nghiệp:**
  - **Bước 1: Thiết lập đề thi & Ma trận phân bổ:**
    - Cấu hình tiêu đề chuẩn: Tên trường/đơn vị, tên kỳ thi, khối lớp, môn học, thời gian làm bài.
    - Lựa chọn linh hoạt số lượng mã đề cần tạo: 1 mã đề (101), 2 mã đề, 4 mã đề (101, 102, 103, 104) hoặc 8 mã đề.
    - Lưới ma trận trực quan phân bổ theo **Chủ đề** và **4 mức độ nhận thức GDPT 2018** (*Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao*). Tự động hiển thị số lượng câu hỏi khả dụng hiện có trong ngân hàng để cảnh báo giáo viên nếu thiếu câu.
    - **Quản lý Mẫu ma trận đề:** Cho phép lưu cấu hình ma trận thành mẫu (ví dụ: *"Đề Giữa kỳ 1 - Tin 11"*) và nạp lại để tái sử dụng nhanh chóng cho các năm học tiếp theo.
    - **Tùy chọn xáo trộn thông minh:** Tùy chọn đảo câu hỏi / đảo phương án A, B, C, D (tự động giữ nguyên 100% phương án gốc khi xuất 1 mã đề).
  - **Bước 2: Xem trước đề thi gốc & Tinh chỉnh câu hỏi (Preview & Swap):**
    - Hệ thống bốc ngẫu nhiên câu hỏi từ ngân hàng khớp theo ma trận.
    - Mỗi câu hỏi đều có nút **"Đổi câu khác"** để đổi sang một câu hỏi khác trong ngân hàng có cùng chủ đề và mức độ nhận thức tức thời.
  - **Bước 3: Trộn đề ngẫu nhiên & Tải về gói ZIP:**
    - Ứng dụng thuật toán Fisher-Yates xáo trộn câu hỏi và đảo phương án lựa chọn độc lập cho từng mã đề.
    - Đóng gói file `.zip` gồm các file Word (.docx) chuẩn phông Times New Roman 13pt, căn lề chuẩn văn bản giáo dục:
      - Các file mã đề riêng lẻ: `De_101.docx`, `De_102.docx`, `De_103.docx`, `De_104.docx` (ẩn hoàn toàn các đường viền phụ, trình bày bảng phương án thoáng đẹp).
      - File `DapAn_Va_MaTran.docx`: Chứa **Bảng soi đáp án trắc nghiệm chéo** tất cả các mã đề (giúp chấm thi siêu tốc), **Hướng dẫn chấm & Đáp án chi tiết tự luận** và **Bảng ma trận đặc tả đề thi GDPT 2018**.

### 2. Ngân hàng bài tập & Hỗ trợ Trắc nghiệm A/B/C/D (Mới ⭐)
- **Hỗ trợ 2 chế độ câu hỏi linh hoạt:**
  - **Trắc nghiệm 4 lựa chọn (A, B, C, D):** Ô nhập đề bài, 4 ô nhập phương án rõ ràng, click nút tròn để đánh dấu nhanh đáp án đúng (tô màu xanh lục nổi bật).
  - **Tự luận / Lập trình:** Đề bài, gợi ý thuật toán, lời giải chi tiết và trình soạn mã nguồn mẫu (CodeEditor).
- **Trình bày trực quan:** Nhãn badge phân biệt rõ ràng `[Trắc nghiệm]` (xanh dương) và `[Tự luận]` (tím) trên cả thẻ hiển thị và bảng dữ liệu.
- Phân cấp 4 mức độ nhận thức: **Nhận biết**, **Thông hiểu**, **Vận dụng**, **Vận dụng cao** kèm bộ lọc nhanh theo khối lớp, chủ đề, mức độ nhận thức và ngôn ngữ lập trình.
- Nút **Sao chép đề bài nhanh** vào khay nhớ tạm để dán vào giáo án hoặc đề cương.

### 3. Trợ lý AI Hỗ trợ Soạn bài (Google Gemini API Cá nhân) (Mới ⭐)
- **Thiết kế dạng Side Panel / Drawer bên phải:**
  - Nút biểu tượng Robot AI thông minh trên thanh Header cho phép mở nhanh trợ lý ở bất kỳ màn hình nào mà không làm gián đoạn luồng làm việc.
  - Lưu trữ API Key cục bộ an toàn trong máy tính, hỗ trợ đa dạng các model mới nhất: **`gemini-3.8-flash`** (mặc định), `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro` và tùy chọn tự nhập model bất kỳ.
- **3 Công cụ sư phạm đắc lực 3-trong-1:**
  1. **Tạo câu hỏi trắc nghiệm SGK tự động:** Dán một đoạn văn bản kiến thức SGK $\rightarrow$ AI sinh 4 câu hỏi trắc nghiệm theo đúng 4 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) kèm đáp án đúng và lời giải chi tiết. Hỗ trợ **Sao chép tất cả** và nút **Lưu thẳng vào Ngân hàng bài tập** 1-chạm.
  2. **Sinh Testcase bài tập lập trình:** Nhập đề bài toán (C++, Python...) $\rightarrow$ AI gợi ý 5–10 bộ testcase biên (Edge Cases: số 0, số âm, giá trị cực đại, chuỗi rỗng...) kèm giải thích trường hợp kiểm thử. Hỗ trợ **Sao chép bảng Markdown** và **Tải file text/zip** để chấm thi.
  3. **Soạn mục tiêu bài dạy theo Công văn 5512:** Nhập tên bài học và khối lớp $\rightarrow$ AI soạn thảo hoàn chỉnh mục tiêu theo chuẩn 3 phần (Kiến thức, Năng lực chung + Năng lực Tin học NLa–NLe, Phẩm chất), sẵn sàng sao chép dán vào file Word giáo án.
- **Cấu hình & Kiểm tra kết nối:** Tích hợp kiểm tra kết nối (Ping test) ngay trong Drawer và trang Cài đặt (Settings).

### 4. Xuất nhanh Phiếu học tập / Bài tập ra Word (.docx) (Mới ⭐)
- **Tích chọn linh hoạt trong Kho bài tập:**
  - Ô checkbox chọn bài trên cả chế độ **Lưới thẻ** và **Danh sách**.
  - Nút **"Chọn tất cả trong trang"** giúp chọn nhanh cả trang 20 câu chỉ với 1 click.
  - **Thanh tác vụ nổi (Floating Action Bar):** Tự động nổi lên khi có $\ge 1$ bài được tích chọn, hiển thị số lượng bài đã chọn và nút mở hộp thoại xuất file Word.
- **Hộp thoại tùy chỉnh trước khi xuất (Modal):**
  - Tùy chỉnh tiêu đề phiếu (*Phiếu bài tập, Phiếu học tập, Bài tập về nhà, Phiếu ôn tập*).
  - Tên trường, môn học (Tin học), tên lớp/khối và thời gian làm bài (phút).
  - Tùy chỉnh số dòng kẻ làm bài (4 - 12 dòng) và kiểu dòng kẻ (dòng chấm ly hoặc gạch mờ).
  - Tùy chọn bật/tắt trang Đáp án & Hướng dẫn giải chi tiết cho giáo viên.
- **Tự động co giãn cấu trúc theo câu hỏi được chọn:**
  - *Nếu chỉ chọn Trắc nghiệm:* Xuất đề trắc nghiệm kèm **Bảng khung điền đáp án** (ô số câu 1, 2, 3... để học sinh tô A/B/C/D).
  - *Nếu chỉ chọn Tự luận:* Xuất các bài tự luận kèm các dòng kẻ chấm/ly làm bài.
  - *Nếu chọn cả Trắc nghiệm + Tự luận:* Tự động chia rõ thành `PHẦN I: TRẮC NGHIỆM` (kèm bảng đáp án) và `PHẦN II: TỰ LUẬN` (kèm dòng kẻ làm bài).
  - Xuất file `.docx` chuẩn A4 Dọc, font Times New Roman, căn lề 20mm chuẩn in ấn.

### 4. Giao diện Bộ lọc ngang hiện đại (Modern Horizontal Filter Bar) (Mới ⭐)
- Thay thế hoàn toàn thanh lọc dọc chiếm diện tích cũ bằng **Thanh lọc ngang 3 tầng hiện đại full-width (100% chiều rộng màn hình)** trên các trang: *Tất cả tài liệu*, *Giáo án*, *Bài giảng*, *Bài tập*, *Mã nguồn*.
- **Dropdown chọn chủ đề tùy chỉnh (CustomSelect):** Tự động phát hiện vị trí mép phải màn hình để căn lề phù hợp, hỗ trợ tự động xuống dòng và hiển thị trọn vẹn các tên chủ đề dài của chương trình Tin học mới (không bị tràn màn hình hay bị che khuất).

### 4. Lịch sử tìm kiếm Header (Search History) (Mới ⭐)
- Ghi nhớ tự động các từ khóa tìm kiếm gần nhất ngay trên thanh tìm kiếm trên cùng.
- Menu dropdown thả xuống hiển thị danh sách từ khóa đã tìm kiếm, cho phép nhấp để tìm lại ngay lập tức.
- Cho phép xóa từng từ khóa hoặc xóa toàn bộ lịch sử tìm kiếm dễ dàng.

### 5. Quản lý tài liệu & giáo án đa định dạng
- Phân loại tài liệu theo **Loại** (Giáo án / KHBD, Bài giảng trình chiếu, Đề kiểm tra, Phiếu học tập, Tài liệu tham khảo...), **Khối lớp** (10, 11, 12), **Chủ đề** và **Bài học**.
- Hỗ trợ xem trước (preview) trực tiếp trong ứng dụng:
  - **Tài liệu văn phòng:** PDF, Word (.docx), Excel (.xlsx, .xls), PowerPoint (.pptx).
  - **Hình ảnh & Văn bản thuần:** PNG, JPG, SVG, TXT, Markdown, CSV, JSON.
  - **Mã nguồn:** Tự động tô màu cú pháp (Syntax Highlighting) cho C++, Python, Pascal, C#, Java, JavaScript, HTML/CSS, SQL.
- Quản lý tệp vật lý an toàn bằng mã định danh GUID, chống trùng lặp và thất lạc tệp tin.

### 6. Kho mã nguồn mẫu (Code Snippets)
- Lưu trữ các thuật toán, bài giải mẫu, đoạn code mẫu giảng dạy theo từng ngôn ngữ (Python, C++, Pascal, Scratch...).
- Trình biên tập mã nguồn thông minh (giữ thụt lề, hỗ trợ Tab thụt dòng 4 dấu cách) và nút sao chép mã nguồn nhanh 1-click.

### 7. Sao lưu nội bộ & Đồng bộ đám mây cá nhân (Google Drive Cloud Backup)
- **Sao lưu ngoại tuyến (Local Backup):** Đóng gói toàn bộ cơ sở dữ liệu và tệp đính kèm thành tệp nén `.zip` tiêu chuẩn; hỗ trợ kiểm tra tính toàn vẹn (Validate) trước khi phục hồi.
- **Đồng bộ Google Drive:**
  - Kết nối bảo mật tài khoản cá nhân qua Google OAuth 2.0 PKCE.
  - Tự động tải bản sao lưu mới nhất lên Google Drive phòng ngừa trường hợp máy tính bị hỏng, lỗi ổ cứng hoặc đổi máy mới.
  - Quản lý hạn mức lưu trữ tự động trên đám mây (giữ lại N bản gần nhất để tránh đầy bộ nhớ Drive).
  - Khôi phục dữ liệu trực tiếp từ đám mây Google Drive về máy tính chỉ với 1 cú nhấp chuột.

### 8. Bảo mật & Thùng rác an toàn
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
src/GiaoAn.Domain          Entity (Exercise, ExamMatrixTemplate, Document...), enum, TextNormalizer
src/GiaoAn.Application     Use cases/services (ExamMatrixTemplateService, ExerciseService...), DTOs, validators
src/GiaoAn.Infrastructure  EF Core + SQLite, di trú tự động (DbInitializer), lưu tệp GUID, sao lưu, Google Drive
src/GiaoAn.Server          Minimal API, endpoints, ServerHost (khởi chạy server nền)
src/GiaoAn.Desktop         WPF + WebView2 (TeachStash.exe), nạp giao diện React nội bộ từ wwwroot
web/                       Mã nguồn Frontend (React 18, TypeScript, Tailwind CSS, Vite, Docx, JSZip)
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
| Thay đổi giao diện nhưng mở `TeachStash.exe` vẫn ra bản cũ | Nhấn `Ctrl + F5` trực tiếp trong ứng dụng hoặc build lại web: `cd web; npm run build; cd ..; dotnet build src/GiaoAn.Desktop` |
| Báo lỗi cổng 5174 hoặc 5080 đang bận | Một tiến trình Vite hoặc .NET cũ đang chạy ngầm. Mở Task Manager hoặc lệnh PowerShell tắt tiến trình `GiaoAn.Server` / `node` cũ |
| “Máy chưa cài WebView2 Runtime” | Cài đặt WebView2 Evergreen Runtime từ trang chủ Microsoft |
| Mở Desktop trắng tinh | Đảm bảo thư mục `web/dist/index.html` đã tồn tại trước khi biên dịch Desktop |
| Lỗi migration cơ sở dữ liệu | Ứng dụng tự động kiểm tra và nâng cấp bảng, thêm cột mới qua `DbInitializer` mà không làm mất dữ liệu cũ |
| Lỗi đăng nhập Google Drive (redirect URI mismatch) | Đảm bảo server chạy đúng cổng cố định `5080` và đã thêm `http://127.0.0.1:5080/api/gdrive/callback` vào Authorized redirect URIs trên Google Cloud Console |
