using System.IO;
using System.Net.Http;
using GiaoAn.Server;

namespace GiaoAn.Desktop.Services;

/// <summary>Khởi chạy server ASP.NET Core nội bộ trong cùng tiến trình, trên 127.0.0.1 với cổng ngẫu nhiên.</summary>
public sealed class ServerLauncher : IAsyncDisposable
{
    private RunningServer? _server;
    public Uri? Address => _server?.Address;

    public static bool IsDev => Environment.GetEnvironmentVariable("GIAOAN_DEV") == "1";
    public static string DevUiUrl => "http://localhost:5174";

    public async Task StartAsync(string dataRoot, CancellationToken ct)
    {
        var dev = IsDev;
        var preferredPort = int.TryParse(Environment.GetEnvironmentVariable("GIAOAN_PORT"), out var p) ? p : 5080;
        try
        {
            _server = await ServerHost.StartAsync(new ServerOptions
            {
                DataRoot = dataRoot,
                Port = preferredPort,
                WebRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot"),
                AllowedOrigins = dev ? new[] { DevUiUrl, "http://127.0.0.1:5174" } : Array.Empty<string>()
            }, ct);
        }
        catch
        {
            _server = await ServerHost.StartAsync(new ServerOptions
            {
                DataRoot = dataRoot,
                Port = 0,
                WebRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot"),
                AllowedOrigins = dev ? new[] { DevUiUrl, "http://127.0.0.1:5174" } : Array.Empty<string>()
            }, ct);
        }
        await WaitUntilReadyAsync(ct);
    }

    private async Task WaitUntilReadyAsync(CancellationToken ct)
    {
        using var http = new HttpClient { BaseAddress = _server!.Address, Timeout = TimeSpan.FromSeconds(3) };
        for (var i = 0; i < 50; i++)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                using var res = await http.GetAsync("/api/health", ct);
                if (res.IsSuccessStatusCode) return;
            }
            catch (HttpRequestException) { }
            catch (TaskCanceledException) when (!ct.IsCancellationRequested) { }
            await Task.Delay(200, ct);
        }
        throw new TimeoutException("Server nội bộ không phản hồi sau 10 giây.");
    }

    public async ValueTask DisposeAsync()
    {
        if (_server != null) { await _server.DisposeAsync(); _server = null; }
    }
}
