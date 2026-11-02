using System.Text.Encodings.Web;
using System.Text.Json;
using GiaoAn.Application.Common;
using GiaoAn.Application.Interfaces;

namespace GiaoAn.Server.Middleware;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> log)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (OperationCanceledException) when (ctx.RequestAborted.IsCancellationRequested) { /* client đã hủy */ }
        catch (Exception ex)
        {
            if (ctx.Response.HasStarted) { log.LogError(ex, "Lỗi sau khi bắt đầu phản hồi"); return; }
            int status; string message; object? errors = null;
            switch (ex)
            {
                case ValidationAppException v: status = 400; message = v.Message; errors = v.Errors; break;
                case AppException a: status = a.StatusCode; message = a.Message; break;
                case UnauthorizedAccessException: status = 403; message = "Truy cập bị từ chối."; break;
                case BadHttpRequestException b: status = b.StatusCode; message = "Yêu cầu không hợp lệ hoặc quá lớn."; break;
                case InvalidDataException: status = 400; message = "Dữ liệu gửi lên không hợp lệ."; break;
                case IOException io: status = 500; message = "Lỗi đọc/ghi tệp: " + io.Message; log.LogError(ex, "IO"); break;
                default: status = 500; message = "Đã xảy ra lỗi không mong muốn. Chi tiết được ghi trong thư mục logs."; log.LogError(ex, "Lỗi không xử lý {Path}", ctx.Request.Path); break;
            }
            ctx.Response.Clear();
            ctx.Response.StatusCode = status;
            ctx.Response.ContentType = "application/json; charset=utf-8";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(new { message, errors }, JsonOptions));
        }
    }
}

/// <summary>Chỉ chấp nhận Host là localhost/127.0.0.1 với đúng cổng đang lắng nghe (chống DNS rebinding).</summary>
public sealed class HostFilterMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var host = ctx.Request.Host;
        var name = host.Host;
        var ok = (name == "127.0.0.1" || name.Equals("localhost", StringComparison.OrdinalIgnoreCase))
                 && (host.Port ?? 80) == ctx.Connection.LocalPort;
        if (!ok)
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsync("Host không hợp lệ.");
            return;
        }
        await next(ctx);
    }
}

/// <summary>Chống CSRF: yêu cầu ghi phải có header tùy chỉnh và Origin hợp lệ; chặn yêu cầu cross-site; không có CORS.</summary>
public sealed class CsrfMiddleware(RequestDelegate next, ServerOptions options)
{
    public const string HeaderName = "X-Requested-With";
    public const string HeaderValue = "GiaoAnTin";

    public async Task InvokeAsync(HttpContext ctx)
    {
        var r = ctx.Request;
        if (r.Path.StartsWithSegments("/api/gdrive/callback"))
        {
            await next(ctx);
            return;
        }

        if (r.Headers.TryGetValue("Sec-Fetch-Site", out var site) && site == "cross-site") { await Deny(ctx); return; }

        var safe = HttpMethods.IsGet(r.Method) || HttpMethods.IsHead(r.Method) || HttpMethods.IsOptions(r.Method);
        if (!safe)
        {
            if (r.Headers[HeaderName] != HeaderValue) { await Deny(ctx); return; }
            if (r.Headers.TryGetValue("Origin", out var origin))
            {
                var self = $"{r.Scheme}://{r.Host}";
                var o = origin.ToString();
                if (!o.Equals(self, StringComparison.OrdinalIgnoreCase) && !options.AllowedOrigins.Contains(o, StringComparer.OrdinalIgnoreCase))
                { await Deny(ctx); return; }
            }
        }
        await next(ctx);
    }

    private static async Task Deny(HttpContext ctx)
    {
        ctx.Response.StatusCode = 403;
        await ctx.Response.WriteAsJsonAsync(new { message = "Yêu cầu bị từ chối (CSRF)." });
    }
}

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext ctx)
    {
        ctx.Response.OnStarting(() =>
        {
            var h = ctx.Response.Headers;
            h["X-Content-Type-Options"] = "nosniff";
            h["Referrer-Policy"] = "no-referrer";
            if (!ctx.Request.Path.StartsWithSegments("/api") && !h.ContainsKey("Content-Security-Policy"))
                h["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'";
            return Task.CompletedTask;
        });
        return next(ctx);
    }
}

public sealed class SessionAuthMiddleware(RequestDelegate next, ISessionStore sessions)
{
    public const string CookieName = "gat_session";
    private static readonly HashSet<string> Public = new(StringComparer.OrdinalIgnoreCase)
        { "/api/health", "/api/auth/status", "/api/auth/login", "/api/auth/setup", "/api/auth/logout" };

    public async Task InvokeAsync(HttpContext ctx)
    {
        var path = ctx.Request.Path;
        if (path.StartsWithSegments("/api") && !Public.Contains(path.Value ?? "") && sessions.PasswordEnabled
            && !sessions.IsValid(ctx.Request.Cookies[CookieName]))
        {
            ctx.Response.StatusCode = 401;
            await ctx.Response.WriteAsJsonAsync(new { message = "Ứng dụng đang bị khóa. Vui lòng đăng nhập.", code = "locked" });
            return;
        }
        await next(ctx);
    }
}
