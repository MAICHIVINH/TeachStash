using System.IO;
using System.Windows;
using GiaoAn.Desktop.Services;
using GiaoAn.Desktop.Views;
using Microsoft.Web.WebView2.Core;

namespace GiaoAn.Desktop;

public partial class App : System.Windows.Application
{
    private readonly ServerLauncher _server = new();
    private static Mutex? _single;

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        _single = new Mutex(true, "Global\\TeachStash.SingleInstance", out var first);
        if (!first)
        {
            MessageBox.Show("TeachStash đang chạy.", "TeachStash", MessageBoxButton.OK, MessageBoxImage.Information);
            Shutdown();
            return;
        }

        SplashWindow? splash = null;
        try
        {
            splash = new SplashWindow();
            splash.Show();

            splash.ViewModel.Status = "Kiểm tra WebView2 Runtime...";
            try { CoreWebView2Environment.GetAvailableBrowserVersionString(); }
            catch (WebView2RuntimeNotFoundException)
            {
                throw new InvalidOperationException("Máy chưa cài Microsoft Edge WebView2 Runtime. Hãy cài từ https://go.microsoft.com/fwlink/p/?LinkId=2124703 (cần Internet một lần) rồi mở lại ứng dụng.");
            }

            splash.ViewModel.Status = "Xác định thư mục dữ liệu...";
            var dataRoot = DataLocationService.Resolve();
            if (dataRoot == null) { Shutdown(); return; }

            splash.ViewModel.Status = "Khởi động máy chủ nội bộ...";
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
            await _server.StartAsync(dataRoot, cts.Token);

            splash.ViewModel.Status = "Mở giao diện...";
            splash.Topmost = true;
            var main = new MainWindow();
            MainWindow = main;
            ShutdownMode = ShutdownMode.OnMainWindowClose;
            main.Show();

            var ui = ServerLauncher.IsDev ? new Uri(ServerLauncher.DevUiUrl) : _server.Address!;
            await main.NavigateAsync(ui, _server.Address!, dataRoot);
            splash.Close();
            main.Activate();
        }
        catch (Exception ex)
        {
            splash?.Close();
            LogStartupError(ex);
            MessageBox.Show($"Không thể khởi động ứng dụng.\n\n{ex.Message}", "TeachStash", MessageBoxButton.OK, MessageBoxImage.Error);
            await _server.DisposeAsync();
            Shutdown(1);
        }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        // Đóng server và giải phóng tài nguyên khi thoát.
        try { _server.DisposeAsync().AsTask().Wait(TimeSpan.FromSeconds(8)); } catch { /* đang thoát */ }
        _single?.Dispose();
        base.OnExit(e);
    }

    private static void LogStartupError(Exception ex)
    {
        try
        {
            var dir = Path.Combine(DataLocationService.DefaultPath, "logs");
            Directory.CreateDirectory(dir);
            File.AppendAllText(Path.Combine(dir, "startup-errors.log"), $"{DateTime.Now:O}\n{ex}\n\n");
        }
        catch
        {
            try
            {
                var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "KhoGiaoAnTinHoc");
                Directory.CreateDirectory(dir);
                File.AppendAllText(Path.Combine(dir, "startup-errors.log"), $"{DateTime.Now:O}\n{ex}\n\n");
            }
            catch { /* bỏ qua */ }
        }
    }
}
