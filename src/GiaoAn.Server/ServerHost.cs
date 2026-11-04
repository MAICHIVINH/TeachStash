using GiaoAn.Application;
using GiaoAn.Application.Interfaces;
using GiaoAn.Infrastructure;
using GiaoAn.Infrastructure.Persistence;
using GiaoAn.Infrastructure.Services;
using GiaoAn.Server.Endpoints;
using GiaoAn.Server.Middleware;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;

namespace GiaoAn.Server;

public sealed class ServerOptions
{
    public required string DataRoot { get; init; }
    /// <summary>0 = cổng ngẫu nhiên. Chỉ dùng cổng cố định khi phát triển (Vite proxy).</summary>
    public int Port { get; init; }
    public string? WebRootPath { get; init; }
    /// <summary>Origin bổ sung được phép (chỉ dùng khi phát triển, ví dụ http://localhost:5174).</summary>
    public IReadOnlyList<string> AllowedOrigins { get; init; } = Array.Empty<string>();
}

public sealed class RunningServer(WebApplication app, Uri address) : IAsyncDisposable
{
    public Uri Address { get; } = address;
    public IServiceProvider Services => app.Services;
    public async ValueTask DisposeAsync()
    {
        try { await app.StopAsync(TimeSpan.FromSeconds(5)); } catch { /* đang đóng */ }
        await app.DisposeAsync();
    }
}

public static class ServerHost
{
    public const long MaxBodyBytes = 600L * 1024 * 1024;

    public static async Task<RunningServer> StartAsync(ServerOptions options, CancellationToken ct = default)
    {
        var app = await BuildAsync(options, ct);
        await app.StartAsync(ct);
        var url = app.Urls.First().Replace("[::1]", "127.0.0.1");
        return new RunningServer(app, new Uri(url));
    }

    public static async Task<WebApplication> BuildAsync(ServerOptions o, CancellationToken ct = default)
    {
        var webRoot = o.WebRootPath != null && Directory.Exists(o.WebRootPath) ? o.WebRootPath : null;
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ContentRootPath = AppContext.BaseDirectory,
            WebRootPath = webRoot,
            ApplicationName = typeof(ServerHost).Assembly.GetName().Name
        });

        // Chỉ lắng nghe loopback — không bao giờ mở ra LAN.
        builder.WebHost.UseUrls($"http://127.0.0.1:{o.Port}");
        builder.WebHost.ConfigureKestrel(k => { k.AddServerHeader = false; k.Limits.MaxRequestBodySize = MaxBodyBytes; });
        builder.Services.Configure<FormOptions>(f => { f.MultipartBodyLengthLimit = MaxBodyBytes; f.ValueLengthLimit = int.MaxValue; });

        var paths = Infrastructure.DependencyInjection.CreatePaths(o.DataRoot);
        builder.Logging.ClearProviders();
        builder.Services.AddSingleton(o);
        builder.Services.AddInfrastructure(paths).AddApplication();

        var app = builder.Build();

        using (var scope = app.Services.CreateScope())
        {
            await DbInitializer.InitializeAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), ct);
            await scope.ServiceProvider.GetRequiredService<IAuthService>().InitializeAsync(ct);
        }
        ShellFileOpener.CleanTempOpenFolder(paths);

        app.UseMiddleware<ExceptionHandlingMiddleware>();
        app.UseMiddleware<HostFilterMiddleware>();
        app.UseMiddleware<CsrfMiddleware>();
        app.UseMiddleware<SecurityHeadersMiddleware>();
        if (webRoot != null)
        {
            var fp = new PhysicalFileProvider(webRoot);
            var staticOptions = new StaticFileOptions
            {
                FileProvider = fp,
                OnPrepareResponse = ctx =>
                {
                    if (ctx.File.Name.Equals("index.html", StringComparison.OrdinalIgnoreCase))
                    {
                        ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
                        ctx.Context.Response.Headers.Pragma = "no-cache";
                        ctx.Context.Response.Headers.Expires = "0";
                    }
                }
            };
            app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fp });
            app.UseStaticFiles(staticOptions);
        }
        app.UseMiddleware<SessionAuthMiddleware>();

        app.MapApi();
        app.Map("/api/{**rest}", () => Results.Json(new { message = "Không tìm thấy API." }, statusCode: 404));
        if (webRoot != null)
        {
            app.MapFallbackToFile("index.html", new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(webRoot),
                OnPrepareResponse = ctx =>
                {
                    ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
                    ctx.Context.Response.Headers.Pragma = "no-cache";
                    ctx.Context.Response.Headers.Expires = "0";
                }
            });
        }
        return app;
    }
}
