using System.IO;
using System.Windows;
using GiaoAn.Desktop.WebView;

namespace GiaoAn.Desktop.Views;

public partial class MainWindow : Window
{
    private readonly WebViewBridge _bridge;

    public MainWindow()
    {
        InitializeComponent();
        _bridge = new WebViewBridge(this, Web);
    }

    public async Task NavigateAsync(Uri uiUri, Uri serverUri, string dataRoot)
    {
        var userData = Path.Combine(dataRoot, "webview2");
        await _bridge.InitializeAsync(userData, uiUri, serverUri);
        Web.Source = uiUri;
    }

    protected override void OnClosed(EventArgs e)
    {
        Web.Dispose(); // giải phóng WebView2 trước khi thoát
        base.OnClosed(e);
    }
}
