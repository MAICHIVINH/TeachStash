using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using GiaoAn.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.Auth;

public static class SettingKeys
{
    public const string Theme = "Theme";
    public const string AutoLockMinutes = "AutoLockMinutes";
    public const string ExtraExtensions = "ExtraExtensions";
    public const string PasswordHash = "PasswordHash";

    public const string GoogleDriveClientId = "GoogleDrive_ClientId";
    public const string GoogleDriveClientSecret = "GoogleDrive_ClientSecret";
    public const string GoogleDriveRefreshToken = "GoogleDrive_RefreshToken";
    public const string GoogleDriveUserEmail = "GoogleDrive_UserEmail";
    public const string GoogleDriveUserName = "GoogleDrive_UserName";
    public const string GoogleDriveAutoUpload = "GoogleDrive_AutoUpload";
    public const string GoogleDriveMaxBackups = "GoogleDrive_MaxBackups";
    public const string GoogleDriveRedirectUri = "GoogleDrive_RedirectUri";

    public const string GeminiApiKey = "Gemini_ApiKey";
    public const string GeminiModel = "Gemini_Model";
}

public sealed class SettingsService(IAppDbContext db, IAppPaths paths, IFilePolicy policy) : ISettingsService
{
    public async Task<string?> GetAsync(string key, CancellationToken ct = default) =>
        (await db.AppSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == key, ct))?.Value;

    public async Task SetAsync(string key, string? value, CancellationToken ct = default)
    {
        var row = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (value == null) { if (row != null) db.AppSettings.Remove(row); }
        else if (row == null) db.AppSettings.Add(new AppSetting { Key = key, Value = value });
        else row.Value = value;
        await db.SaveChangesAsync(ct);
    }

    public async Task<SettingsDto> GetAllAsync(CancellationToken ct)
    {
        var theme = await GetAsync(SettingKeys.Theme, ct) ?? "system";
        var lockMin = int.TryParse(await GetAsync(SettingKeys.AutoLockMinutes, ct), out var m) ? m : 0;
        var extra = await GetAsync(SettingKeys.ExtraExtensions, ct) ?? "";
        return new SettingsDto(theme, lockMin, extra, paths.DataRoot, await policy.AllowedAsync(ct), (int)(FileTypes.MaxFileSizeBytes / 1024 / 1024));
    }

    public async Task<SettingsDto> UpdateAsync(SettingsUpdateRequest req, CancellationToken ct)
    {
        if (req.Theme != null)
        {
            if (req.Theme is not ("system" or "light" or "dark")) throw new ValidationAppException("theme", "Chế độ giao diện không hợp lệ.");
            await SetAsync(SettingKeys.Theme, req.Theme, ct);
        }
        if (req.AutoLockMinutes != null)
        {
            if (req.AutoLockMinutes is < 0 or > 720) throw new ValidationAppException("autoLockMinutes", "Thời gian tự khóa từ 0 đến 720 phút.");
            await SetAsync(SettingKeys.AutoLockMinutes, req.AutoLockMinutes.Value.ToString(), ct);
        }
        if (req.ExtraExtensions != null)
        {
            var list = req.ExtraExtensions.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(e => e.Trim().TrimStart('.').ToLowerInvariant()).Where(e => e.Length is > 0 and <= 10 && e.All(char.IsLetterOrDigit)).Distinct().ToList();
            var blocked = list.FirstOrDefault(e => FileTypes.Blocked.Contains(e));
            if (blocked != null) throw new ValidationAppException("extraExtensions", $"Định dạng .{blocked} bị chặn vì lý do an toàn.");
            await SetAsync(SettingKeys.ExtraExtensions, string.Join(",", list), ct);
        }
        return await GetAllAsync(ct);
    }
}

public sealed class FilePolicy(IAppDbContext db) : IFilePolicy
{
    public async Task<IReadOnlyList<string>> AllowedAsync(CancellationToken ct)
    {
        var extra = (await db.AppSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == SettingKeys.ExtraExtensions, ct))?.Value ?? "";
        return FileTypes.DefaultAllowed.Concat(extra.Split(',', StringSplitOptions.RemoveEmptyEntries))
            .Where(e => !FileTypes.Blocked.Contains(e)).Distinct().OrderBy(e => e).ToList();
    }

    public async Task ValidateAsync(string fileName, long length, CancellationToken ct)
    {
        var name = Path.GetFileName(fileName ?? "");
        if (string.IsNullOrWhiteSpace(name)) throw new ValidationAppException("file", "Tên tệp không hợp lệ.");
        var ext = FileTypes.ExtensionOf(name);
        if (string.IsNullOrEmpty(ext)) throw new ValidationAppException("file", "Tệp phải có phần mở rộng.");
        if (FileTypes.Blocked.Contains(ext)) throw new ValidationAppException("file", $"Định dạng .{ext} bị chặn vì lý do an toàn.");
        if (!(await AllowedAsync(ct)).Contains(ext))
            throw new ValidationAppException("file", $"Định dạng .{ext} chưa được cho phép. Bạn có thể thêm trong Cài đặt.");
        if (length <= 0) throw new ValidationAppException("file", "Tệp rỗng.");
        if (length > FileTypes.MaxFileSizeBytes) throw new ValidationAppException("file", "Tệp vượt quá 500 MB.");
    }
}
