using FluentValidation;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.Auth;

public sealed class AuthService(ISettingsService settings, IPasswordHasher hasher, ISessionStore sessions) : IAuthService
{
    public async Task InitializeAsync(CancellationToken ct) =>
        sessions.PasswordEnabled = !string.IsNullOrEmpty(await settings.GetAsync(SettingKeys.PasswordHash, ct));

    public async Task<AuthStatusDto> StatusAsync(string? token, CancellationToken ct)
    {
        var enabled = !string.IsNullOrEmpty(await settings.GetAsync(SettingKeys.PasswordHash, ct));
        sessions.PasswordEnabled = enabled;
        var lockMin = int.TryParse(await settings.GetAsync(SettingKeys.AutoLockMinutes, ct), out var m) ? m : 0;
        return new AuthStatusDto(enabled, !enabled || sessions.IsValid(token), lockMin);
    }

    public async Task<string> SetPasswordAsync(string password, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(await settings.GetAsync(SettingKeys.PasswordHash, ct)))
            throw new ConflictException("Đã có mật khẩu. Hãy dùng chức năng đổi mật khẩu.");
        if (password.Length < 4) throw new ValidationAppException("password", "Mật khẩu tối thiểu 4 ký tự.");
        await settings.SetAsync(SettingKeys.PasswordHash, hasher.Hash(password), ct);
        sessions.PasswordEnabled = true;
        return sessions.Create();
    }

    public async Task<string> LoginAsync(string password, CancellationToken ct)
    {
        var hash = await settings.GetAsync(SettingKeys.PasswordHash, ct);
        if (string.IsNullOrEmpty(hash)) return sessions.Create();
        if (!hasher.Verify(password, hash))
        {
            await Task.Delay(700, ct); // làm chậm dò mật khẩu
            throw new UnauthorizedAppException("Mật khẩu không đúng.");
        }
        return sessions.Create();
    }

    public async Task ChangePasswordAsync(ChangePasswordRequest req, CancellationToken ct)
    {
        var hash = await settings.GetAsync(SettingKeys.PasswordHash, ct);
        if (string.IsNullOrEmpty(hash) || !hasher.Verify(req.CurrentPassword, hash))
            throw new ValidationAppException("currentPassword", "Mật khẩu hiện tại không đúng.");
        await settings.SetAsync(SettingKeys.PasswordHash, hasher.Hash(req.NewPassword), ct);
        sessions.RevokeAll();
    }

    public async Task DisablePasswordAsync(string password, CancellationToken ct)
    {
        var hash = await settings.GetAsync(SettingKeys.PasswordHash, ct);
        if (string.IsNullOrEmpty(hash)) return;
        if (!hasher.Verify(password, hash)) throw new ValidationAppException("password", "Mật khẩu không đúng.");
        await settings.SetAsync(SettingKeys.PasswordHash, null, ct);
        sessions.PasswordEnabled = false;
        sessions.RevokeAll();
    }
}
