using System.IO;
using System.Text.Json;
using System.Windows;
using Microsoft.Win32;

namespace GiaoAn.Desktop.Services;

/// <summary>
/// Xác định thư mục dữ liệu. Mặc định D:\DCOPY\MAICHIVINH\DataApp; nếu ổ D không tồn tại thì cho người dùng chọn vị trí khác và ghi nhớ.
/// </summary>
public static class DataLocationService
{
    public const string DefaultPath = @"D:\DCOPY\MAICHIVINH\DataApp";
    private static readonly string ConfigFile = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "KhoGiaoAnTinHoc", "location.json");

    private sealed record Config(string DataRoot);

    public static string? Resolve()
    {
        if (TryPrepare(DefaultPath)) return DefaultPath;
        var saved = Load();
        if (saved != null && TryPrepare(saved)) return saved;

        var driveOk = Directory.Exists(Path.GetPathRoot(DefaultPath));
        var reason = driveOk
            ? $"Không thể tạo hoặc ghi vào thư mục dữ liệu mặc định:\n{DefaultPath}"
            : $"Ổ đĩa của thư mục dữ liệu mặc định không tồn tại:\n{DefaultPath}";
        MessageBox.Show(reason + "\n\nHãy chọn một thư mục khác để lưu dữ liệu.", "Kho giáo án Tin học", MessageBoxButton.OK, MessageBoxImage.Warning);

        while (true)
        {
            var dlg = new OpenFolderDialog { Title = "Chọn thư mục lưu dữ liệu Kho giáo án Tin học" };
            if (dlg.ShowDialog() != true) return null;
            var chosen = Path.Combine(dlg.FolderName, "DataApp");
            if (TryPrepare(chosen)) { Save(chosen); return chosen; }
            MessageBox.Show($"Không thể ghi vào:\n{chosen}\nHãy chọn thư mục khác.", "Kho giáo án Tin học", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private static bool TryPrepare(string path)
    {
        try
        {
            Directory.CreateDirectory(path);
            var probe = Path.Combine(path, $".probe-{Guid.NewGuid():N}");
            File.WriteAllText(probe, "ok");
            File.Delete(probe);
            return true;
        }
        catch { return false; }
    }

    private static string? Load()
    {
        try { return File.Exists(ConfigFile) ? JsonSerializer.Deserialize<Config>(File.ReadAllText(ConfigFile))?.DataRoot : null; }
        catch { return null; }
    }

    private static void Save(string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(ConfigFile)!);
        File.WriteAllText(ConfigFile, JsonSerializer.Serialize(new Config(path)));
    }
}
