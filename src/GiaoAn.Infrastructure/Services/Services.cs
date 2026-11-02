using System.Collections.Concurrent;
using System.Diagnostics;
using System.Security.Cryptography;
using GiaoAn.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace GiaoAn.Infrastructure.Services;

public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const int Iterations = 210_000;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, 32);
        return $"v1.{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(key)}";
    }

    public bool Verify(string password, string hash)
    {
        try
        {
            var p = hash.Split('.');
            if (p.Length != 4 || p[0] != "v1") return false;
            var expected = Convert.FromBase64String(p[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, Convert.FromBase64String(p[2]), int.Parse(p[1]), HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(expected, actual);
        }
        catch { return false; }
    }
}

public sealed class InMemorySessionStore : ISessionStore
{
    private readonly ConcurrentDictionary<string, DateTime> _tokens = new();
    public bool PasswordEnabled { get; set; }
    public string Create()
    {
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        _tokens[token] = DateTime.UtcNow;
        return token;
    }
    public bool IsValid(string? token) => !string.IsNullOrEmpty(token) && _tokens.ContainsKey(token);
    public void Revoke(string? token) { if (token != null) _tokens.TryRemove(token, out _); }
    public void RevokeAll() => _tokens.Clear();
}

/// <summary>Mở tệp bằng ứng dụng mặc định của Windows. Luôn mở bản sao chỉ-đọc trong thư mục temp để không sửa tệp gốc.</summary>
public sealed class ShellFileOpener(IAppPaths paths, IFileStorage storage, ILogger<ShellFileOpener> log) : IFileOpener
{
    public void OpenCopy(string relativePath, string originalName)
    {
        var dir = Path.Combine(paths.TempRoot, "open", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        var safe = string.Concat(Path.GetFileName(originalName).Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
        var target = Path.Combine(dir, string.IsNullOrWhiteSpace(safe) ? "tep" : safe);
        File.Copy(storage.GetFullPath(relativePath), target);
        File.SetAttributes(target, FileAttributes.ReadOnly);
        log.LogInformation("Mở bản sao tạm {Target}", target);
        Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
    }

    public static void CleanTempOpenFolder(IAppPaths paths)
    {
        var dir = Path.Combine(paths.TempRoot, "open");
        if (!Directory.Exists(dir)) return;
        foreach (var d in Directory.EnumerateDirectories(dir))
        {
            try
            {
                foreach (var f in Directory.EnumerateFiles(d)) File.SetAttributes(f, FileAttributes.Normal);
                Directory.Delete(d, true);
            }
            catch { /* tệp có thể đang được mở, bỏ qua */ }
        }
    }
}
