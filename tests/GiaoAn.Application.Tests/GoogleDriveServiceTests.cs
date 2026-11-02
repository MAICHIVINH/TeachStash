using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Features.Auth;
using GiaoAn.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GiaoAn.Application.Tests;

public class GoogleDriveServiceTests
{
    [Fact]
    public async Task Status_DefaultIsUnconfiguredAndDisconnected()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var gdrive = scope.ServiceProvider.GetRequiredService<IGoogleDriveService>();

        var status = await gdrive.GetStatusAsync();
        Assert.False(status.IsConfigured);
        Assert.False(status.IsConnected);
        Assert.Null(status.UserEmail);
        Assert.True(status.AutoUpload);
        Assert.Equal(10, status.MaxBackups);
    }

    [Fact]
    public async Task ConfigureCredentials_SavesValuesCorrectly()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var gdrive = scope.ServiceProvider.GetRequiredService<IGoogleDriveService>();

        await Assert.ThrowsAsync<ValidationAppException>(() =>
            gdrive.ConfigureCredentialsAsync(new GoogleDriveConfigureRequest("", "secret")));

        await Assert.ThrowsAsync<ValidationAppException>(() =>
            gdrive.ConfigureCredentialsAsync(new GoogleDriveConfigureRequest("client_id", "")));

        await gdrive.ConfigureCredentialsAsync(new GoogleDriveConfigureRequest("my-client-id", "my-client-secret"));

        var status = await gdrive.GetStatusAsync();
        Assert.True(status.IsConfigured);
        Assert.False(status.IsConnected);
    }

    [Fact]
    public async Task UpdateSyncSettings_UpdatesAutoUploadAndMaxBackups()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var gdrive = scope.ServiceProvider.GetRequiredService<IGoogleDriveService>();

        await gdrive.UpdateSyncSettingsAsync(new GoogleDriveSyncSettingsRequest(false, 5));

        var status = await gdrive.GetStatusAsync();
        Assert.False(status.AutoUpload);
        Assert.Equal(5, status.MaxBackups);
    }

    [Fact]
    public async Task Disconnect_ClearsStoredTokenAndEmail()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var settings = scope.ServiceProvider.GetRequiredService<ISettingsService>();
        var gdrive = scope.ServiceProvider.GetRequiredService<IGoogleDriveService>();

        await settings.SetAsync(SettingKeys.GoogleDriveRefreshToken, "mock-refresh-token");
        await settings.SetAsync(SettingKeys.GoogleDriveUserEmail, "teacher@gmail.com");
        await settings.SetAsync(SettingKeys.GoogleDriveUserName, "Cô Giáo");

        await gdrive.DisconnectAsync();

        Assert.Null(await settings.GetAsync(SettingKeys.GoogleDriveRefreshToken));
        Assert.Null(await settings.GetAsync(SettingKeys.GoogleDriveUserEmail));
        Assert.Null(await settings.GetAsync(SettingKeys.GoogleDriveUserName));
    }

    [Fact]
    public async Task UploadBackup_ThrowsWhenFileDoesNotExist()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var gdrive = scope.ServiceProvider.GetRequiredService<IGoogleDriveService>();

        await Assert.ThrowsAsync<ValidationAppException>(() =>
            gdrive.UploadBackupAsync("C:\\non_existent_backup_file.zip"));
    }
}
