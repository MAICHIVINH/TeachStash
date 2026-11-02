using GiaoAn.Application.Interfaces;

namespace GiaoAn.Infrastructure.FileStorage;

public sealed class AppPaths : IAppPaths
{
    public AppPaths(string dataRoot)
    {
        DataRoot = Path.GetFullPath(dataRoot);
        DbPath = Path.Combine(DataRoot, "giaoan.db");
        FilesRoot = Path.Combine(DataRoot, "files");
        BackupsRoot = Path.Combine(DataRoot, "backups");
        TempRoot = Path.Combine(DataRoot, "temp");
        LogsRoot = Path.Combine(DataRoot, "logs");
        foreach (var d in new[] { DataRoot, FilesRoot, Path.Combine(FilesRoot, "documents"), Path.Combine(FilesRoot, "code"),
                                  Path.Combine(FilesRoot, "exercises"), BackupsRoot, TempRoot, LogsRoot })
            Directory.CreateDirectory(d);
        var probe = Path.Combine(DataRoot, $".write-test-{Guid.NewGuid():N}");
        File.WriteAllText(probe, "ok");
        File.Delete(probe);
    }
    public string DataRoot { get; }
    public string DbPath { get; }
    public string FilesRoot { get; }
    public string BackupsRoot { get; }
    public string TempRoot { get; }
    public string LogsRoot { get; }
}

public sealed class LocalFileStorage(IAppPaths paths) : IFileStorage
{
    private static readonly HashSet<string> SubFolders = new() { "documents", "code", "exercises" };

    public async Task<StoredFile> SaveAsync(Stream content, string originalName, string subFolder, long maxBytes, CancellationToken ct)
    {
        if (!SubFolders.Contains(subFolder)) throw new ArgumentException("Thư mục lưu trữ không hợp lệ.", nameof(subFolder));
        var ext = Path.GetExtension(Path.GetFileName(originalName)).TrimStart('.').ToLowerInvariant();
        var stored = $"{Guid.NewGuid():N}{(ext.Length > 0 ? "." + ext : "")}";
        var relative = $"{subFolder}/{stored}";
        var finalPath = GetFullPath(relative);
        var tmp = Path.Combine(paths.TempRoot, $"{Guid.NewGuid():N}.part");
        long total = 0;
        try
        {
            await using (var fs = new FileStream(tmp, FileMode.CreateNew, System.IO.FileAccess.Write, FileShare.None, 81920, true))
            {
                var buffer = new byte[81920];
                int n;
                while ((n = await content.ReadAsync(buffer, ct)) > 0)
                {
                    total += n;
                    if (total > maxBytes) throw new GiaoAn.Application.Common.ValidationAppException("file", "Tệp vượt quá 500 MB.");
                    await fs.WriteAsync(buffer.AsMemory(0, n), ct);
                }
                await fs.FlushAsync(ct);
            }
            Directory.CreateDirectory(Path.GetDirectoryName(finalPath)!);
            File.Move(tmp, finalPath);
            return new StoredFile(stored, relative, total);
        }
        catch
        {
            try { if (File.Exists(tmp)) File.Delete(tmp); } catch { /* bỏ qua */ }
            throw;
        }
    }

    public void Delete(string relativePath)
    {
        var full = GetFullPath(relativePath);
        if (File.Exists(full)) File.Delete(full);
    }

    public bool Exists(string relativePath)
    {
        try { return File.Exists(GetFullPath(relativePath)); } catch { return false; }
    }

    public Stream OpenRead(string relativePath) =>
        new FileStream(GetFullPath(relativePath), FileMode.Open, System.IO.FileAccess.Read, FileShare.Read, 81920, true);

    /// <summary>Chuyển đường dẫn tương đối thành tuyệt đối và đảm bảo không thoát khỏi thư mục files (chống path traversal).</summary>
    public string GetFullPath(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath) || Path.IsPathRooted(relativePath))
            throw new UnauthorizedAccessException("Đường dẫn tệp không hợp lệ.");
        var root = Path.GetFullPath(paths.FilesRoot).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var full = Path.GetFullPath(Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Đường dẫn tệp nằm ngoài thư mục lưu trữ.");
        return full;
    }

    public IEnumerable<string> EnumerateAll()
    {
        var root = Path.GetFullPath(paths.FilesRoot);
        if (!Directory.Exists(root)) yield break;
        foreach (var f in Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories))
            yield return Path.GetRelativePath(root, f).Replace('\\', '/');
    }
}
