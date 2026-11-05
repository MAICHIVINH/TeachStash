using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Features.Auth;
using GiaoAn.Application.Interfaces;
using GiaoAn.Server.Extensions;
using GiaoAn.Server.Middleware;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using GiaoAn.Application.Validators;

namespace GiaoAn.Server.Endpoints;

public static class ApiEndpoints
{
    public static void MapApi(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api");
        api.MapGet("/health", () => Results.Ok(new { status = "ok", app = "GiaoAnTin" }));
        MapAuth(api);
        MapLookups(api);
        MapDocuments(api);
        MapExercises(api);
        MapExamMatrixTemplates(api);
        MapSnippets(api);
        MapMisc(api);
        MapTeachingPlans(api);
        MapTeachingClasses(api);
        MapBackups(api);
        MapGoogleDrive(api);
    }

    // ---------- Auth ----------
    private static void SetCookie(HttpContext ctx, string token) =>
        ctx.Response.Cookies.Append(SessionAuthMiddleware.CookieName, token,
            new CookieOptions { HttpOnly = true, SameSite = SameSiteMode.Strict, Path = "/", IsEssential = true });

    private static void MapAuth(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/auth");
        g.MapGet("/status", async (HttpContext c, IAuthService s, CancellationToken ct) =>
            Results.Ok(await s.StatusAsync(c.Request.Cookies[SessionAuthMiddleware.CookieName], ct)));
        g.MapPost("/setup", async (HttpContext c, PasswordRequest r, IValidator<PasswordRequest> v, IAuthService s, CancellationToken ct) =>
        {
            await v.ValidateOrThrowAsync(r, ct);
            SetCookie(c, await s.SetPasswordAsync(r.Password, ct));
            return Results.Ok((await s.StatusAsync(null, ct)) with { IsAuthenticated = true });
        });
        g.MapPost("/login", async (HttpContext c, PasswordRequest r, IValidator<PasswordRequest> v, IAuthService s, CancellationToken ct) =>
        {
            await v.ValidateOrThrowAsync(r, ct);
            var token = await s.LoginAsync(r.Password, ct);
            SetCookie(c, token);
            return Results.Ok(await s.StatusAsync(token, ct));
        });
        g.MapPost("/logout", (HttpContext c, ISessionStore sessions) =>
        {
            sessions.Revoke(c.Request.Cookies[SessionAuthMiddleware.CookieName]);
            c.Response.Cookies.Delete(SessionAuthMiddleware.CookieName, new CookieOptions { Path = "/" });
            return Results.NoContent();
        });
        g.MapPost("/change-password", async (HttpContext c, ChangePasswordRequest r, IValidator<ChangePasswordRequest> v, IAuthService s, ISessionStore sessions, CancellationToken ct) =>
        {
            RequireSession(c, sessions);
            await v.ValidateOrThrowAsync(r, ct);
            await s.ChangePasswordAsync(r, ct);
            SetCookie(c, sessions.Create());
            return Results.NoContent();
        });
        g.MapPost("/disable", async (HttpContext c, PasswordRequest r, IAuthService s, ISessionStore sessions, CancellationToken ct) =>
        {
            RequireSession(c, sessions);
            await s.DisablePasswordAsync(r.Password, ct);
            return Results.NoContent();
        });
    }

    private static void RequireSession(HttpContext c, ISessionStore sessions)
    {
        if (sessions.PasswordEnabled && !sessions.IsValid(c.Request.Cookies[SessionAuthMiddleware.CookieName]))
            throw new UnauthorizedAppException("Ứng dụng đang bị khóa.");
    }

    // ---------- Danh mục, thẻ ----------
    private static void MapLookups(RouteGroupBuilder api)
    {
        api.MapGet("/lookups", async (ICategoryService s, CancellationToken ct) => Results.Ok(await s.GetLookupsAsync(ct)));
        api.MapGet("/tags", async (ITagService s, CancellationToken ct) => Results.Ok(await s.ListAsync(ct)));
        api.MapPost("/topics", async (TopicSaveRequest r, ICategoryService s, CancellationToken ct) => Results.Ok(await s.SaveTopicAsync(null, r, ct)));
        api.MapPut("/topics/{id:int}", async (int id, TopicSaveRequest r, ICategoryService s, CancellationToken ct) => Results.Ok(await s.SaveTopicAsync(id, r, ct)));
        api.MapDelete("/topics/{id:int}", async (int id, ICategoryService s, CancellationToken ct) => { await s.DeleteTopicAsync(id, ct); return Results.NoContent(); });
        api.MapPost("/lessons", async (LessonSaveRequest r, ICategoryService s, CancellationToken ct) => Results.Ok(await s.SaveLessonAsync(null, r, ct)));
        api.MapPut("/lessons/{id:int}", async (int id, LessonSaveRequest r, ICategoryService s, CancellationToken ct) => Results.Ok(await s.SaveLessonAsync(id, r, ct)));
        api.MapDelete("/lessons/{id:int}", async (int id, ICategoryService s, CancellationToken ct) => { await s.DeleteLessonAsync(id, ct); return Results.NoContent(); });
    }

    // ---------- Tài liệu ----------
    private static void MapDocuments(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/documents");
        g.MapGet("", async ([AsParameters] DocumentQuery q, IDocumentService s, CancellationToken ct) => Results.Ok(await s.QueryAsync(q, ct)));
        g.MapGet("/trash", async (string? q, int? page, int? pageSize, IDocumentService s, CancellationToken ct) =>
            Results.Ok(await s.QueryTrashAsync(q, page ?? 1, pageSize ?? 20, ct)));
        g.MapGet("/{id:int}", async (int id, IDocumentService s, CancellationToken ct) => Results.Ok(await s.GetAsync(id, true, ct)));

        g.MapPost("", async (HttpRequest req, IDocumentService s, CancellationToken ct) =>
        {
            var (save, upload, stream) = await req.ReadDocumentFormAsync(ct);
            await using var _ = stream;
            var dto = await s.CreateAsync(save, upload, ct);
            return Results.Created($"/api/documents/{dto.Id}", dto);
        });
        g.MapPut("/{id:int}", async (int id, HttpRequest req, IDocumentService s, CancellationToken ct) =>
        {
            var (save, upload, stream) = await req.ReadDocumentFormAsync(ct);
            await using var _ = stream;
            return Results.Ok(await s.UpdateAsync(id, save, upload, ct));
        });
        g.MapDelete("/{id:int}/file", async (int id, IDocumentService s, CancellationToken ct) => Results.Ok(await s.RemoveFileAsync(id, ct)));
        g.MapPost("/{id:int}/favorite", async (int id, FavoriteRequest r, IDocumentService s, CancellationToken ct) =>
        { await s.SetFavoriteAsync(id, r.IsFavorite, ct); return Results.NoContent(); });
        g.MapPost("/trash", async (IdsRequest r, IDocumentService s, CancellationToken ct) => { await s.TrashAsync(r.Ids, ct); return Results.NoContent(); });
        g.MapPost("/restore", async (IdsRequest r, IDocumentService s, CancellationToken ct) => { await s.RestoreAsync(r.Ids, ct); return Results.NoContent(); });
        g.MapPost("/purge", async (IdsRequest r, IDocumentService s, CancellationToken ct) => { await s.PurgeAsync(r.Ids, ct); return Results.NoContent(); });

        g.MapGet("/{id:int}/file/download", async (int id, IDocumentService s, CancellationToken ct) =>
        {
            var a = await s.GetFileAccessAsync(id, ct);
            return Results.File(a.FullPath, "application/octet-stream", a.File.OriginalName, enableRangeProcessing: true);
        });
        // Xem trực tiếp: chỉ PDF và hình ảnh; không bao giờ phục vụ HTML/JS để tránh chạy mã.
        g.MapGet("/{id:int}/file/content", async (int id, HttpContext c, IDocumentService s, CancellationToken ct) =>
        {
            var a = await s.GetFileAccessAsync(id, ct);
            var kind = FileTypes.PreviewKind(a.File.Extension);
            if (kind is not ("pdf" or "image")) return Results.StatusCode(StatusCodes.Status415UnsupportedMediaType);
            c.Response.Headers["Content-Security-Policy"] = "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:";
            return Results.File(a.FullPath, FileTypes.MimeOf(a.File.Extension), enableRangeProcessing: true);
        });
        g.MapGet("/{id:int}/file/text", async (int id, IDocumentService s, CancellationToken ct) => Results.Ok(await s.ReadTextAsync(id, 1_000_000, ct)));
        g.MapPost("/{id:int}/file/open", async (int id, IDocumentService s, CancellationToken ct) => { await s.OpenWithDefaultAppAsync(id, ct); return Results.NoContent(); });
    }

    // ---------- Bài tập ----------
    private static void MapExercises(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/exercises");
        g.MapGet("", async ([AsParameters] ExerciseQuery q, IExerciseService s, CancellationToken ct) => Results.Ok(await s.QueryAsync(q, ct)));
        g.MapGet("/{id:int}", async (int id, IExerciseService s, CancellationToken ct) => Results.Ok(await s.GetAsync(id, ct)));
        g.MapPost("", async (ExerciseSaveRequest r, IExerciseService s, CancellationToken ct) =>
        { var d = await s.CreateAsync(r, ct); return Results.Created($"/api/exercises/{d.Id}", d); });
        g.MapPut("/{id:int}", async (int id, ExerciseSaveRequest r, IExerciseService s, CancellationToken ct) => Results.Ok(await s.UpdateAsync(id, r, ct)));
        g.MapDelete("/{id:int}", async (int id, IExerciseService s, CancellationToken ct) => { await s.DeleteAsync(id, ct); return Results.NoContent(); });
    }

    // ---------- Mẫu ma trận đề thi ----------
    private static void MapExamMatrixTemplates(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/exam-matrix-templates");
        g.MapGet("", async (IExamMatrixTemplateService s, [FromQuery] int? gradeLevelId, CancellationToken ct) =>
            Results.Ok(await s.GetAllAsync(gradeLevelId, ct)));
        g.MapGet("/{id:int}", async (int id, IExamMatrixTemplateService s, CancellationToken ct) =>
            Results.Ok(await s.GetAsync(id, ct)));
        g.MapPost("", async (ExamMatrixTemplateSaveRequest r, IExamMatrixTemplateService s, CancellationToken ct) =>
        {
            var d = await s.CreateAsync(r, ct);
            return Results.Created($"/api/exam-matrix-templates/{d.Id}", d);
        });
        g.MapPut("/{id:int}", async (int id, ExamMatrixTemplateSaveRequest r, IExamMatrixTemplateService s, CancellationToken ct) =>
            Results.Ok(await s.UpdateAsync(id, r, ct)));
        g.MapDelete("/{id:int}", async (int id, IExamMatrixTemplateService s, CancellationToken ct) =>
        {
            await s.DeleteAsync(id, ct);
            return Results.NoContent();
        });
    }

    // ---------- Mã nguồn ----------
    private static void MapSnippets(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/snippets");
        g.MapGet("", async ([AsParameters] SnippetQuery q, ICodeSnippetService s, CancellationToken ct) => Results.Ok(await s.QueryAsync(q, ct)));
        g.MapGet("/{id:int}", async (int id, ICodeSnippetService s, CancellationToken ct) => Results.Ok(await s.GetAsync(id, ct)));
        g.MapPost("", async (SnippetSaveRequest r, ICodeSnippetService s, CancellationToken ct) =>
        { var d = await s.CreateAsync(r, ct); return Results.Created($"/api/snippets/{d.Id}", d); });
        g.MapPut("/{id:int}", async (int id, SnippetSaveRequest r, ICodeSnippetService s, CancellationToken ct) => Results.Ok(await s.UpdateAsync(id, r, ct)));
        g.MapDelete("/{id:int}", async (int id, ICodeSnippetService s, CancellationToken ct) => { await s.DeleteAsync(id, ct); return Results.NoContent(); });
    }

    // ---------- Dashboard, tìm kiếm, cài đặt ----------
    private static void MapMisc(RouteGroupBuilder api)
    {
        api.MapGet("/dashboard", async (IDashboardService s, CancellationToken ct) => Results.Ok(await s.GetAsync(ct)));
        api.MapGet("/search", async (string? q, int? take, ISearchService s, CancellationToken ct) => Results.Ok(await s.SearchAsync(q, take ?? 10, ct)));
        api.MapGet("/settings", async (ISettingsService s, CancellationToken ct) => Results.Ok(await s.GetAllAsync(ct)));
        api.MapPut("/settings", async (SettingsUpdateRequest r, ISettingsService s, CancellationToken ct) => Results.Ok(await s.UpdateAsync(r, ct)));
        api.MapPost("/maintenance/clean-orphans", async (IDocumentService s, CancellationToken ct) => Results.Ok(await s.CleanOrphanFilesAsync(ct)));
    }

    // ---------- Kế hoạch dạy học (PPCT) ----------
    private static void MapTeachingPlans(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/teaching-plan");
        g.MapGet("", async (int? gradeLevelId, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.GetPlanItemsAsync(gradeLevelId, ct)));
        g.MapPost("/generate-from-lessons", async (int gradeLevelId, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.GenerateFromLessonsAsync(gradeLevelId, ct)));
        g.MapPost("/item", async (TeachingPlanItemSaveRequest r, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.SavePlanItemAsync(null, r, ct)));
        g.MapPut("/item/{id:int}", async (int id, TeachingPlanItemSaveRequest r, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.SavePlanItemAsync(id, r, ct)));
        g.MapDelete("/item/{id:int}", async (int id, ITeachingPlanService s, CancellationToken ct) =>
        {
            await s.DeletePlanItemAsync(id, ct);
            return Results.NoContent();
        });
    }

    // ---------- Lớp học & Tiến độ giảng dạy ----------
    private static void MapTeachingClasses(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/teaching-classes");
        g.MapGet("", async (int? gradeLevelId, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.GetClassesAsync(gradeLevelId, ct)));
        g.MapPost("", async (TeachingClassSaveRequest r, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.SaveClassAsync(null, r, ct)));
        g.MapPut("/{id:int}", async (int id, TeachingClassSaveRequest r, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.SaveClassAsync(id, r, ct)));
        g.MapDelete("/{id:int}", async (int id, ITeachingPlanService s, CancellationToken ct) =>
        {
            await s.DeleteClassAsync(id, ct);
            return Results.NoContent();
        });
        g.MapGet("/{classId:int}/schedule", async (int classId, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.GetClassScheduleAsync(classId, ct)));
        g.MapPost("/{classId:int}/toggle-status/{planItemId:int}", async (int classId, int planItemId, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.ToggleStatusAsync(classId, planItemId, ct)));
        g.MapPut("/{classId:int}/progress/{planItemId:int}", async (int classId, int planItemId, UpdateProgressRequest r, ITeachingPlanService s, CancellationToken ct) =>
            Results.Ok(await s.UpdateProgressAsync(classId, planItemId, r, ct)));
    }

    // ---------- Sao lưu / phục hồi ----------
    private static void MapBackups(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/backups");
        g.MapGet("", async (IBackupService s, CancellationToken ct) => Results.Ok(await s.HistoryAsync(ct)));
        g.MapPost("", async (BackupRequest r, IBackupService s, CancellationToken ct) => Results.Ok(await s.CreateAsync(r.DestinationFolder, ct)));
        g.MapPost("/validate", async (RestoreRequest r, IBackupService s, CancellationToken ct) => Results.Ok(await s.ValidateAsync(r.Path, ct)));
        g.MapPost("/restore", async (RestoreRequest r, IBackupService s, CancellationToken ct) => Results.Ok(await s.RestoreAsync(r.Path, r.Confirm, ct)));
        g.MapPost("/restore-upload", async (HttpRequest req, IBackupService s, IAppPaths paths, CancellationToken ct) =>
        {
            var form = await req.ReadFormAsync(ct);
            var file = form.Files.GetFile("file") ?? throw new ValidationAppException("file", "Vui lòng chọn tệp ZIP sao lưu.");
            var confirm = string.Equals(form["confirm"], "true", StringComparison.OrdinalIgnoreCase);
            var tmp = Path.Combine(paths.TempRoot, $"upload-{Guid.NewGuid():N}.zip");
            try
            {
                await using (var fs = File.Create(tmp)) await file.CopyToAsync(fs, ct);
                return Results.Ok(await s.RestoreAsync(tmp, confirm, ct));
            }
            finally { try { File.Delete(tmp); } catch { /* bỏ qua */ } }
        });
        g.MapGet("/{id:int}/download", async (int id, IAppDbContext db, CancellationToken ct) =>
        {
            var h = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                db.BackupHistories, x => x.Id == id && x.Success && x.Kind == GiaoAn.Domain.Enums.BackupKind.Backup, ct)
                ?? throw new NotFoundException("Không tìm thấy bản sao lưu.");
            if (!File.Exists(h.FilePath)) throw new NotFoundException("Tệp sao lưu không còn tồn tại.");
            return Results.File(h.FilePath, "application/zip", Path.GetFileName(h.FilePath));
        });
    }

    // ---------- Google Drive ----------
    private static void MapGoogleDrive(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/gdrive");
        g.MapGet("/status", async (IGoogleDriveService s, CancellationToken ct) => Results.Ok(await s.GetStatusAsync(ct)));
        g.MapPost("/config", async (GoogleDriveConfigureRequest r, IGoogleDriveService s, CancellationToken ct) =>
        {
            await s.ConfigureCredentialsAsync(r, ct);
            return Results.Ok(await s.GetStatusAsync(ct));
        });
        g.MapPost("/auth-url", async (HttpRequest req, IGoogleDriveService s, CancellationToken ct) =>
        {
            var port = req.Host.Port ?? 5080;
            var callbackUrl = $"http://127.0.0.1:{port}/api/gdrive/callback";
            return Results.Ok(await s.GetAuthUrlAsync(callbackUrl, ct));
        });
        g.MapPost("/open-browser", (OpenBrowserRequest r) =>
        {
            if (Uri.TryCreate(r.Url, UriKind.Absolute, out var uri) &&
                (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            {
                try
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
                    return Results.Ok(new { success = true });
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            }
            return Results.BadRequest(new { error = "Đường dẫn không hợp lệ." });
        });
        g.MapPost("/exchange", async (GoogleDriveExchangeCodeRequest r, IGoogleDriveService s, CancellationToken ct) =>
            Results.Ok(await s.ExchangeCodeAsync(r, ct)));
        g.MapPost("/disconnect", async (IGoogleDriveService s, CancellationToken ct) =>
        {
            await s.DisconnectAsync(ct);
            return Results.Ok(await s.GetStatusAsync(ct));
        });
        g.MapPut("/settings", async (GoogleDriveSyncSettingsRequest r, IGoogleDriveService s, CancellationToken ct) =>
        {
            await s.UpdateSyncSettingsAsync(r, ct);
            return Results.Ok(await s.GetStatusAsync(ct));
        });
        g.MapGet("/backups", async (IGoogleDriveService s, CancellationToken ct) => Results.Ok(await s.ListBackupsAsync(ct)));
        g.MapPost("/upload/{backupId:int}", async (int backupId, IGoogleDriveService gdrive, IAppDbContext db, CancellationToken ct) =>
        {
            var h = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                db.BackupHistories, x => x.Id == backupId && x.Success && x.Kind == GiaoAn.Domain.Enums.BackupKind.Backup, ct)
                ?? throw new NotFoundException("Không tìm thấy bản sao lưu.");
            if (!File.Exists(h.FilePath)) throw new NotFoundException("Tệp sao lưu không còn tồn tại trên máy.");
            var driveFileId = await gdrive.UploadBackupAsync(h.FilePath, ct);
            if (!h.Message.Contains("Đã đồng bộ lên Google Drive"))
            {
                h.Message += " (Đã đồng bộ lên Google Drive)";
                await db.SaveChangesAsync(ct);
            }
            return Results.Ok(new { driveFileId, message = "Đã tải tệp lên Google Drive thành công." });
        });
        g.MapPost("/restore/{fileId}", async (string fileId, IGoogleDriveService gdrive, IBackupService backup, CancellationToken ct) =>
        {
            var downloadedPath = await gdrive.DownloadBackupAsync(fileId, ct);
            var validation = await backup.ValidateAsync(downloadedPath, ct);
            return Results.Ok(new { path = downloadedPath, result = validation });
        });
        g.MapPost("/restore-confirm/{fileId}", async (string fileId, HttpRequest req, IGoogleDriveService gdrive, IBackupService backup, CancellationToken ct) =>
        {
            var body = await req.ReadFromJsonAsync<RestoreRequest>(ct);
            var downloadedPath = body?.Path;
            if (string.IsNullOrWhiteSpace(downloadedPath) || !File.Exists(downloadedPath))
            {
                downloadedPath = await gdrive.DownloadBackupAsync(fileId, ct);
            }
            try
            {
                var res = await backup.RestoreAsync(downloadedPath, true, ct);
                return Results.Ok(res);
            }
            finally
            {
                try { if (File.Exists(downloadedPath)) File.Delete(downloadedPath); } catch { /* ignore */ }
            }
        });
        g.MapGet("/download/{fileId}", async (string fileId, IGoogleDriveService gdrive, CancellationToken ct) =>
        {
            var downloadedPath = await gdrive.DownloadBackupAsync(fileId, ct);
            var fileName = Path.GetFileName(downloadedPath);
            return Results.File(downloadedPath, "application/zip", fileName, enableRangeProcessing: true);
        });
        g.MapGet("/callback", (string? code, string? error) =>
        {
            var html = string.IsNullOrEmpty(error) && !string.IsNullOrEmpty(code)
                ? $@"<!DOCTYPE html><html><head><meta charset='utf-8'><title>Đăng nhập Google thành công</title><style>body{{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b}}h2{{color:#16a34a}}code{{background:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:16px;display:inline-block;margin:15px 0}}</style></head><body><h2>Đăng nhập Google thành công!</h2><p>Mã xác thực của bạn:</p><br><code>{code}</code><p>Ứng dụng sẽ tự động kết nối trong giây lát, hoặc bạn có thể sao chép mã trên dán vào TeachStash.</p><script>if(window.opener){{window.opener.postMessage({{type:'gdrive_auth',code:'{code}'}},'*');setTimeout(()=>window.close(),1500);}}</script></body></html>"
                : $@"<!DOCTYPE html><html><head><meta charset='utf-8'><title>Lỗi xác thực</title><style>body{{font-family:sans-serif;text-align:center;padding:50px;background:#fff1f2;color:#9f1239}}</style></head><body><h2>Xác thực không thành công</h2><p>{error ?? "Không nhận được mã xác thực từ Google."}</p><script>if(window.opener){{window.opener.postMessage({{type:'gdrive_auth_error',error:'{error}'}},'*');}}</script></body></html>";
            return Results.Content(html, "text/html; charset=utf-8");
        });
    }
}
