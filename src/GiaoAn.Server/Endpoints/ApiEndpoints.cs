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
        MapSnippets(api);
        MapMisc(api);
        MapBackups(api);
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
}
