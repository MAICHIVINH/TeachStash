using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using GiaoAn.Domain.Entities;
using GiaoAn.Domain.Enums;
using GiaoAn.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GiaoAn.Infrastructure.Services;

/// <summary>
/// Sao lưu = một tệp ZIP gồm manifest.json + giaoan.db (ảnh chụp nhất quán bằng VACUUM INTO) + files/**.
/// Phục hồi: kiểm tra → tạo bản sao lưu an toàn của dữ liệu hiện tại → giải nén ra temp → thay thế DB và files → hoàn tác nếu lỗi.
/// </summary>
public sealed class BackupService(
    AppDbContext db,
    IAppPaths paths,
    ISessionStore sessions,
    ILogger<BackupService> log,
    IGoogleDriveService? gdrive = null) : IBackupService
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    public sealed record Manifest(string App, int Version, DateTime CreatedAt, int DocumentCount, int FileCount, string DbSha256);
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<BackupInfoDto> CreateAsync(string? destinationFolder, CancellationToken ct)
    {
        await Gate.WaitAsync(ct);
        try { return await CreateCoreAsync(destinationFolder, ct, recordHistory: true); }
        finally { Gate.Release(); }
    }

    private async Task<BackupInfoDto> CreateCoreAsync(string? destinationFolder, CancellationToken ct, bool recordHistory, string prefix = "GiaoAn_Backup")
    {
        var destDir = string.IsNullOrWhiteSpace(destinationFolder) ? paths.BackupsRoot : Path.GetFullPath(destinationFolder);
        if (!Directory.Exists(destDir)) throw new ValidationAppException("destinationFolder", "Thư mục đích không tồn tại.");
        var finalPath = Path.Combine(destDir, $"{prefix}_{DateTime.Now:yyyyMMdd_HHmmss}.zip");
        var work = Path.Combine(paths.TempRoot, $"backup-{Guid.NewGuid():N}");
        Directory.CreateDirectory(work);
        var tmpZip = Path.Combine(work, "backup.zip");
        try
        {
            var snapshot = Path.Combine(work, "giaoan.db");
            var escapedSnapshot = snapshot.Replace("'", "''");
            await db.Database.ExecuteSqlRawAsync("VACUUM INTO '" + escapedSnapshot + "'", ct);
            var docCount = await db.Documents.CountAsync(ct);
            var fileCount = 0;
            string sha;
            await using (var s = File.OpenRead(snapshot)) sha = Convert.ToHexString(await SHA256.HashDataAsync(s, ct));

            await using (var zipStream = new FileStream(tmpZip, FileMode.CreateNew, System.IO.FileAccess.ReadWrite))
            using (var zip = new ZipArchive(zipStream, ZipArchiveMode.Create))
            {
                zip.CreateEntryFromFile(snapshot, "giaoan.db", CompressionLevel.Fastest);
                foreach (var rel in new LocalFileLister(paths).All())
                {
                    ct.ThrowIfCancellationRequested();
                    zip.CreateEntryFromFile(Path.Combine(paths.FilesRoot, rel.Replace('/', Path.DirectorySeparatorChar)), "files/" + rel, CompressionLevel.Fastest);
                    fileCount++;
                }
                var entry = zip.CreateEntry("manifest.json");
                await using var ms = entry.Open();
                await JsonSerializer.SerializeAsync(ms, new Manifest("GiaoAnTin", 1, DateTime.UtcNow, docCount, fileCount, sha), Json, ct);
            }
            File.Move(tmpZip, finalPath);
            var size = new FileInfo(finalPath).Length;
            log.LogInformation("Đã sao lưu {Path} ({Size} bytes)", finalPath, size);

            var message = $"{docCount} tài liệu, {fileCount} tệp";
            if (gdrive != null && recordHistory)
            {
                try
                {
                    var status = await gdrive.GetStatusAsync(ct);
                    if (status.IsConnected && status.AutoUpload)
                    {
                        var driveFileId = await gdrive.UploadBackupAsync(finalPath, ct);
                        message += " (Đã đồng bộ lên Google Drive)";
                        log.LogInformation("Đã tự động tải sao lưu lên Google Drive ID={DriveId}", driveFileId);
                    }
                }
                catch (Exception ex)
                {
                    log.LogWarning(ex, "Lỗi tải tự động lên Google Drive");
                    message += $" (Chưa đồng bộ Drive: {ex.Message})";
                }
            }

            var h = new BackupHistory { Kind = BackupKind.Backup, FilePath = finalPath, SizeBytes = size, Success = true, Message = message, CreatedAt = DateTime.UtcNow };
            if (recordHistory) { db.BackupHistories.Add(h); await db.SaveChangesAsync(ct); }
            return ToDto(h);
        }
        catch (Exception ex) when (ex is not AppException)
        {
            log.LogError(ex, "Sao lưu thất bại");
            if (recordHistory)
            {
                db.BackupHistories.Add(new BackupHistory { Kind = BackupKind.Backup, FilePath = finalPath, Success = false, Message = ex.Message, CreatedAt = DateTime.UtcNow });
                try { await db.SaveChangesAsync(CancellationToken.None); } catch { /* bỏ qua */ }
            }
            throw;
        }
        finally { TryDeleteDir(work); }
    }

    public async Task<IReadOnlyList<BackupInfoDto>> HistoryAsync(CancellationToken ct) =>
        (await db.BackupHistories.AsNoTracking().OrderByDescending(b => b.CreatedAt).Take(50).ToListAsync(ct)).Select(ToDto).ToList();

    public Task<BackupValidationDto> ValidateAsync(string zipPath, CancellationToken ct) => Task.FromResult(ValidateCore(zipPath));

    private static BackupValidationDto ValidateCore(string zipPath)
    {
        if (string.IsNullOrWhiteSpace(zipPath) || !File.Exists(zipPath)) return Bad("Không tìm thấy tệp sao lưu.");
        try
        {
            using var zip = ZipFile.OpenRead(zipPath);
            if (zip.Entries.Count > 500_000) return Bad("Tệp sao lưu có quá nhiều mục.");
            foreach (var e in zip.Entries)
            {
                var n = e.FullName;
                if (n.Contains("..") || n.StartsWith('/') || n.StartsWith('\\') || n.Contains(':') || n.Contains('\\'))
                    return Bad("Tệp sao lưu chứa đường dẫn không an toàn.");
                if (n != "manifest.json" && n != "giaoan.db" && !n.StartsWith("files/")) return Bad($"Mục không hợp lệ trong tệp sao lưu: {n}");
            }
            var m = zip.GetEntry("manifest.json");
            var d = zip.GetEntry("giaoan.db");
            if (m == null || d == null) return Bad("Thiếu manifest.json hoặc giaoan.db.");
            Manifest? mf;
            using (var ms = m.Open()) mf = JsonSerializer.Deserialize<Manifest>(ms, Json);
            if (mf == null || mf.App != "GiaoAnTin") return Bad("Đây không phải bản sao lưu của Kho giáo án Tin học.");
            using (var ds = d.Open())
            {
                var header = new byte[16];
                var read = 0; while (read < 16) { var n = ds.Read(header, read, 16 - read); if (n == 0) break; read += n; }
                if (read < 16 || System.Text.Encoding.ASCII.GetString(header, 0, 15) != "SQLite format 3") return Bad("Cơ sở dữ liệu trong bản sao lưu không hợp lệ.");
            }
            using (var ds = d.Open())
                if (!string.Equals(Convert.ToHexString(SHA256.HashData(ds)), mf.DbSha256, StringComparison.OrdinalIgnoreCase))
                    return Bad("Mã kiểm tra (SHA-256) của cơ sở dữ liệu không khớp — tệp có thể đã bị hỏng.");
            var fileEntries = zip.Entries.Count(e => e.FullName.StartsWith("files/") && !e.FullName.EndsWith("/"));
            if (fileEntries != mf.FileCount) return Bad($"Số tệp đính kèm không khớp (khai báo {mf.FileCount}, thực tế {fileEntries}).");
            return new BackupValidationDto(true, "Bản sao lưu hợp lệ.", mf.CreatedAt, mf.DocumentCount, mf.FileCount);
        }
        catch (InvalidDataException) { return Bad("Tệp không phải ZIP hợp lệ."); }
        catch (Exception ex) { return Bad("Không đọc được bản sao lưu: " + ex.Message); }
        static BackupValidationDto Bad(string msg) => new(false, msg, null, 0, 0);
    }

    public async Task<BackupInfoDto> RestoreAsync(string zipPath, bool confirm, CancellationToken ct)
    {
        if (!confirm) throw new ValidationAppException("confirm", "Cần xác nhận trước khi phục hồi.");
        var check = ValidateCore(zipPath);
        if (!check.Valid) throw new ValidationAppException("path", check.Message);

        await Gate.WaitAsync(ct);
        var work = Path.Combine(paths.TempRoot, $"restore-{Guid.NewGuid():N}");
        var filesOld = paths.FilesRoot + ".before-restore";
        string? safety = null;
        var dbReplaced = false; var filesSwapped = false;
        try
        {
            Directory.CreateDirectory(work);
            ZipFile.ExtractToDirectory(zipPath, work);
            // kiểm tra tính toàn vẹn của DB trước khi thay thế
            var newDb = Path.Combine(work, "giaoan.db");
            await using (var cn = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = newDb, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString()))
            {
                await cn.OpenAsync(ct);
                await using var cmd = cn.CreateCommand(); cmd.CommandText = "PRAGMA integrity_check";
                if ((string?)await cmd.ExecuteScalarAsync(ct) != "ok") throw new ValidationAppException("path", "Cơ sở dữ liệu trong bản sao lưu bị lỗi toàn vẹn.");
            }

            // bản sao lưu an toàn của dữ liệu hiện tại
            safety = (await CreateCoreAsync(null, ct, recordHistory: false, prefix: "GiaoAn_TruocKhiPhucHoi")).FilePath;

            db.ChangeTracker.Clear();
            await db.Database.CloseConnectionAsync();
            SqliteConnection.ClearAllPools();

            if (Directory.Exists(filesOld)) Directory.Delete(filesOld, true);
            Directory.Move(paths.FilesRoot, filesOld); filesSwapped = true;
            var newFiles = Path.Combine(work, "files");
            if (Directory.Exists(newFiles)) Directory.Move(newFiles, paths.FilesRoot); else Directory.CreateDirectory(paths.FilesRoot);
            foreach (var sub in new[] { "documents", "code", "exercises" }) Directory.CreateDirectory(Path.Combine(paths.FilesRoot, sub));

            File.Copy(newDb, paths.DbPath, true); dbReplaced = true;
            foreach (var ext in new[] { "-wal", "-shm", "-journal" }) { var f = paths.DbPath + ext; if (File.Exists(f)) File.Delete(f); }

            await DbInitializer.InitializeAsync(db, ct); // nâng cấp schema nếu bản sao lưu cũ hơn
            sessions.RevokeAll();
            var size = new FileInfo(zipPath).Length;
            var h = new BackupHistory { Kind = BackupKind.Restore, FilePath = zipPath, SizeBytes = size, Success = true,
                Message = $"Đã phục hồi {check.DocumentCount} tài liệu, {check.FileCount} tệp. Bản an toàn: {safety}", CreatedAt = DateTime.UtcNow };
            db.BackupHistories.Add(h);
            await db.SaveChangesAsync(ct);
            try { Directory.Delete(filesOld, true); } catch (Exception ex) { log.LogWarning(ex, "Không xóa được {Dir}", filesOld); }
            log.LogInformation("Đã phục hồi từ {Zip}", zipPath);
            return ToDto(h);
        }
        catch
        {
            log.LogError("Phục hồi thất bại, đang hoàn tác");
            try
            {
                SqliteConnection.ClearAllPools();
                if (filesSwapped) { if (Directory.Exists(paths.FilesRoot)) Directory.Delete(paths.FilesRoot, true); Directory.Move(filesOld, paths.FilesRoot); }
                if (dbReplaced && safety != null) RestoreDbFromSafety(safety);
            }
            catch (Exception ex) { log.LogCritical(ex, "Hoàn tác thất bại. Bản sao lưu an toàn: {Safety}", safety); }
            throw;
        }
        finally { TryDeleteDir(work); Gate.Release(); }
    }

    private void RestoreDbFromSafety(string safetyZip)
    {
        using var zip = ZipFile.OpenRead(safetyZip);
        zip.GetEntry("giaoan.db")!.ExtractToFile(paths.DbPath, true);
    }

    private static BackupInfoDto ToDto(BackupHistory h) => new(h.Id, h.Kind.ToString(), h.FilePath, h.SizeBytes, h.Success, h.Message, h.CreatedAt);
    private static void TryDeleteDir(string dir) { try { if (Directory.Exists(dir)) Directory.Delete(dir, true); } catch { /* bỏ qua */ } }

    private sealed class LocalFileLister(IAppPaths p)
    {
        public IEnumerable<string> All() =>
            Directory.Exists(p.FilesRoot)
                ? Directory.EnumerateFiles(p.FilesRoot, "*", SearchOption.AllDirectories).Select(f => Path.GetRelativePath(p.FilesRoot, f).Replace('\\', '/')).ToList()
                : Enumerable.Empty<string>();
    }
}
