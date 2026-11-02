using GiaoAn.Server;

// Chạy server độc lập (dùng khi phát triển frontend với Vite). Bản đóng gói dùng GiaoAn.Desktop để khởi chạy server nội bộ.
var dataRoot = Environment.GetEnvironmentVariable("GIAOAN_DATA") ?? @"D:\DCOPY\MAICHIVINH\DataApp";
var port = int.TryParse(Environment.GetEnvironmentVariable("GIAOAN_PORT"), out var p) ? p : 5080;
var dev = Environment.GetEnvironmentVariable("GIAOAN_DEV") == "1";

await using var server = await ServerHost.StartAsync(new ServerOptions
{
    DataRoot = dataRoot,
    Port = port,
    WebRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot"),
    AllowedOrigins = dev ? new[] { "http://localhost:5174", "http://127.0.0.1:5174" } : Array.Empty<string>()
});
Console.WriteLine($"Kho giáo án Tin học — server nội bộ tại {server.Address} (dữ liệu: {dataRoot})");
Console.WriteLine("Nhấn Ctrl+C để dừng.");
var tcs = new TaskCompletionSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; tcs.TrySetResult(); };
await tcs.Task;
