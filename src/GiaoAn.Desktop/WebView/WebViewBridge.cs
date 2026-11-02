using System.IO;
using System.Text.Json;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using Microsoft.Win32;

namespace GiaoAn.Desktop.WebView;

/// <summary>
/// Cấu hình WebView2 và cầu nối JS ↔ WPF (chọn thư mục / chọn tệp bằng hộp thoại gốc của Windows).
/// Không bao giờ mở trình duyệt ngoài: mọi cửa sổ mới đều bị chặn, điều hướng ra ngoài ứng dụng bị hủy.
/// </summary>
public sealed class WebViewBridge(Window owner, WebView2 web)
{
    private Uri _allowedUi = null!;
    private Uri _allowedServer = null!;

    public async Task InitializeAsync(string userDataFolder, Uri uiUri, Uri serverUri)
    {
        _allowedUi = uiUri; _allowedServer = serverUri;
        Directory.CreateDirectory(userDataFolder);
        var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
        await web.EnsureCoreWebView2Async(env);
        var core = web.CoreWebView2;
        var dev = Environment.GetEnvironmentVariable("GIAOAN_DEV") == "1";

        core.Settings.AreDevToolsEnabled = dev;
        core.Settings.AreDefaultContextMenusEnabled = dev;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.IsZoomControlEnabled = true;
        core.Settings.AreBrowserAcceleratorKeysEnabled = dev;
        core.Settings.IsGeneralAutofillEnabled = false;
        core.Settings.IsPasswordAutosaveEnabled = false;

        core.NewWindowRequested += (_, e) =>
        {
            e.Handled = true;
            if (Uri.TryCreate(e.Uri, UriKind.Absolute, out var targetUri) &&
                (targetUri.Scheme == Uri.UriSchemeHttp || targetUri.Scheme == Uri.UriSchemeHttps))
            {
                try
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(targetUri.AbsoluteUri) { UseShellExecute = true });
                }
                catch { /* ignore */ }
            }
        };
        core.NavigationStarting += (_, e) =>
        {
            if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var u) || !IsAllowed(u)) e.Cancel = true;
        };
        core.PermissionRequested += (_, e) => e.State = CoreWebView2PermissionState.Deny;
        core.WebMessageReceived += OnWebMessage;
    }

    private bool IsAllowed(Uri u) =>
        u.Scheme is "about" or "blob" or "data"
        || (u.Host == _allowedUi.Host && u.Port == _allowedUi.Port)
        || (u.Host == _allowedServer.Host && u.Port == _allowedServer.Port);

    private void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            var type = root.GetProperty("type").GetString();
            var requestId = root.GetProperty("requestId").GetString();
            string? path = type switch
            {
                "pickFolder" => PickFolder(),
                "pickZip" => PickZip(),
                _ => null
            };
            web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "pickResult", requestId, path }));
        }
        catch { /* thông điệp không hợp lệ: bỏ qua */ }
    }

    private string? PickFolder()
    {
        var dlg = new OpenFolderDialog { Title = "Chọn thư mục lưu bản sao lưu" };
        return dlg.ShowDialog(owner) == true ? dlg.FolderName : null;
    }

    private string? PickZip()
    {
        var dlg = new OpenFileDialog { Title = "Chọn tệp sao lưu", Filter = "Tệp sao lưu (*.zip)|*.zip" };
        return dlg.ShowDialog(owner) == true ? dlg.FileName : null;
    }
}
