using System.Text.Json;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Features.Auth;
using GiaoAn.Application.Interfaces;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Microsoft.Extensions.Logging;

namespace GiaoAn.Infrastructure.Services;

public sealed class GoogleDriveService(
    ISettingsService settings,
    IAppPaths paths,
    ILogger<GoogleDriveService> log) : IGoogleDriveService
{
    private const string FolderName = "TeachStash_Backups";
    private static readonly string[] Scopes =
    [
        DriveService.Scope.DriveFile,
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
    ];

    public async Task<GoogleDriveStatusDto> GetStatusAsync(CancellationToken ct = default)
    {
        var clientId = await settings.GetAsync(SettingKeys.GoogleDriveClientId, ct);
        var clientSecret = await settings.GetAsync(SettingKeys.GoogleDriveClientSecret, ct);
        var refreshToken = await settings.GetAsync(SettingKeys.GoogleDriveRefreshToken, ct);
        var email = await settings.GetAsync(SettingKeys.GoogleDriveUserEmail, ct);
        var name = await settings.GetAsync(SettingKeys.GoogleDriveUserName, ct);
        var autoUploadStr = await settings.GetAsync(SettingKeys.GoogleDriveAutoUpload, ct);
        var maxBackupsStr = await settings.GetAsync(SettingKeys.GoogleDriveMaxBackups, ct);

        var isConfigured = !string.IsNullOrWhiteSpace(clientId) && !string.IsNullOrWhiteSpace(clientSecret);
        var isConnected = isConfigured && !string.IsNullOrWhiteSpace(refreshToken);
        var autoUpload = autoUploadStr != "false";
        var maxBackups = int.TryParse(maxBackupsStr, out var mb) ? mb : 10;

        return new GoogleDriveStatusDto(isConfigured, isConnected, email, name, autoUpload, maxBackups);
    }

    public async Task ConfigureCredentialsAsync(GoogleDriveConfigureRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.ClientId))
            throw new ValidationAppException("clientId", "Client ID không được để trống.");
        if (string.IsNullOrWhiteSpace(req.ClientSecret))
            throw new ValidationAppException("clientSecret", "Client Secret không được để trống.");

        await settings.SetAsync(SettingKeys.GoogleDriveClientId, req.ClientId.Trim(), ct);
        await settings.SetAsync(SettingKeys.GoogleDriveClientSecret, req.ClientSecret.Trim(), ct);
        log.LogInformation("Đã cập nhật thông tin cấu hình Google Drive Client ID.");
    }

    public async Task<GoogleDriveAuthUrlDto> GetAuthUrlAsync(string? callbackUrl = null, CancellationToken ct = default)
    {
        var clientId = await settings.GetAsync(SettingKeys.GoogleDriveClientId, ct);
        var clientSecret = await settings.GetAsync(SettingKeys.GoogleDriveClientSecret, ct);

        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            throw new ValidationAppException("credentials", "Vui lòng cấu hình Google Client ID và Client Secret trước.");

        var state = Guid.NewGuid().ToString("N");
        var redirectUri = !string.IsNullOrWhiteSpace(callbackUrl)
            ? callbackUrl
            : "http://127.0.0.1:5080/api/gdrive/callback";

        await settings.SetAsync(SettingKeys.GoogleDriveRedirectUri, redirectUri, ct);

        var authReq = new Google.Apis.Auth.OAuth2.Requests.GoogleAuthorizationCodeRequestUrl(new Uri(GoogleAuthConsts.AuthorizationUrl))
        {
            ClientId = clientId,
            RedirectUri = redirectUri,
            Scope = string.Join(" ", Scopes),
            State = state,
            AccessType = "offline",
            Prompt = "consent"
        };

        return new GoogleDriveAuthUrlDto(authReq.Build().AbsoluteUri, state);
    }

    public async Task<GoogleDriveStatusDto> ExchangeCodeAsync(GoogleDriveExchangeCodeRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Code))
            throw new ValidationAppException("code", "Mã xác thực (authorization code) không được để trống.");

        var clientId = await settings.GetAsync(SettingKeys.GoogleDriveClientId, ct);
        var clientSecret = await settings.GetAsync(SettingKeys.GoogleDriveClientSecret, ct);
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            throw new ValidationAppException("credentials", "Chưa cấu hình Google Client ID và Client Secret.");

        var savedRedirectUri = await settings.GetAsync(SettingKeys.GoogleDriveRedirectUri, ct);
        var flow = CreateFlow(clientId, clientSecret);
        TokenResponse? token = null;

        var redirectUrisToTry = new List<string>();
        if (!string.IsNullOrWhiteSpace(savedRedirectUri)) redirectUrisToTry.Add(savedRedirectUri);
        redirectUrisToTry.Add("http://127.0.0.1:5080/api/gdrive/callback");
        redirectUrisToTry.Add("postmessage");
        redirectUrisToTry.Add("urn:ietf:wg:oauth:2.0:oob");

        Exception? lastEx = null;
        foreach (var uri in redirectUrisToTry.Distinct())
        {
            try
            {
                token = await flow.ExchangeCodeForTokenAsync("user", req.Code.Trim(), uri, ct);
                if (token != null) break;
            }
            catch (Exception ex)
            {
                lastEx = ex;
                log.LogWarning("Đổi token với redirect URI {Uri} không thành công: {Msg}", uri, ex.Message);
            }
        }

        if (token == null)
            throw new ValidationAppException("code", $"Không thể xác thực mã từ Google: {lastEx?.Message}");

        if (!string.IsNullOrEmpty(token.RefreshToken))
        {
            await settings.SetAsync(SettingKeys.GoogleDriveRefreshToken, token.RefreshToken, ct);
        }

        // Lấy thông tin user bằng DriveService.About
        var credential = new UserCredential(flow, "user", token);
        var driveService = new DriveService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "TeachStash"
        });

        try
        {
            var aboutReq = driveService.About.Get();
            aboutReq.Fields = "user(displayName,emailAddress)";
            var about = await aboutReq.ExecuteAsync(ct);
            if (about.User != null)
            {
                await settings.SetAsync(SettingKeys.GoogleDriveUserEmail, about.User.EmailAddress, ct);
                await settings.SetAsync(SettingKeys.GoogleDriveUserName, about.User.DisplayName, ct);
            }
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Không thể lấy thông tin profile Google User, tiếp tục với quyền Drive.");
        }

        await settings.SetAsync(SettingKeys.GoogleDriveAutoUpload, "true", ct);
        log.LogInformation("Kết nối Google Drive thành công.");

        return await GetStatusAsync(ct);
    }

    public async Task DisconnectAsync(CancellationToken ct = default)
    {
        await settings.SetAsync(SettingKeys.GoogleDriveRefreshToken, null, ct);
        await settings.SetAsync(SettingKeys.GoogleDriveUserEmail, null, ct);
        await settings.SetAsync(SettingKeys.GoogleDriveUserName, null, ct);
        log.LogInformation("Đã ngắt kết nối Google Drive.");
    }

    public async Task UpdateSyncSettingsAsync(GoogleDriveSyncSettingsRequest req, CancellationToken ct = default)
    {
        await settings.SetAsync(SettingKeys.GoogleDriveAutoUpload, req.AutoUpload ? "true" : "false", ct);
        await settings.SetAsync(SettingKeys.GoogleDriveMaxBackups, Math.Max(0, req.MaxBackups).ToString(), ct);
        log.LogInformation("Cập nhật cài đặt Google Drive sync: AutoUpload={AutoUpload}, MaxBackups={MaxBackups}", req.AutoUpload, req.MaxBackups);
    }

    public async Task<string> UploadBackupAsync(string zipPath, CancellationToken ct = default)
    {
        if (!File.Exists(zipPath))
            throw new ValidationAppException("zipPath", "Không tìm thấy tệp sao lưu để tải lên.");

        var service = await GetDriveServiceAsync(ct);
        var folderId = await EnsureFolderExistsAsync(service, ct);

        var fileName = Path.GetFileName(zipPath);
        var fileMeta = new Google.Apis.Drive.v3.Data.File
        {
            Name = fileName,
            Parents = new List<string> { folderId },
            Description = "TeachStash automated backup archive"
        };

        log.LogInformation("Bắt đầu tải tệp sao lưu {File} lên Google Drive...", fileName);
        await using var stream = File.OpenRead(zipPath);
        var uploadReq = service.Files.Create(fileMeta, stream, "application/zip");
        uploadReq.Fields = "id, name, size, createdTime";

        var progress = await uploadReq.UploadAsync(ct);
        if (progress.Status != Google.Apis.Upload.UploadStatus.Completed)
        {
            throw new InvalidOperationException($"Tải lên Google Drive thất bại: {progress.Exception?.Message ?? progress.Status.ToString()}");
        }

        var uploadedFile = uploadReq.ResponseBody;
        log.LogInformation("Đã tải tệp lên Google Drive thành công: ID={Id}, Name={Name}", uploadedFile.Id, uploadedFile.Name);

        // Kiểm tra và dọn dẹp theo hạn mức MaxBackups
        var status = await GetStatusAsync(ct);
        if (status.MaxBackups > 0)
        {
            await PruneOldBackupsAsync(service, folderId, status.MaxBackups, ct);
        }

        return uploadedFile.Id;
    }

    public async Task<IReadOnlyList<GoogleDriveFileDto>> ListBackupsAsync(CancellationToken ct = default)
    {
        var service = await GetDriveServiceAsync(ct);
        var folderId = await FindFolderIdAsync(service, ct);
        if (string.IsNullOrEmpty(folderId))
            return Array.Empty<GoogleDriveFileDto>();

        var listReq = service.Files.List();
        listReq.Q = $"'{folderId}' in parents and trashed = false and name contains '.zip'";
        listReq.Fields = "files(id, name, size, createdTime)";
        listReq.OrderBy = "createdTime desc";
        listReq.PageSize = 50;

        var result = await listReq.ExecuteAsync(ct);
        return result.Files.Select(f => new GoogleDriveFileDto(
            f.Id,
            f.Name,
            f.Size ?? 0,
            f.CreatedTimeDateTimeOffset?.UtcDateTime ?? DateTime.UtcNow
        )).ToList();
    }

    public async Task<string> DownloadBackupAsync(string fileId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            throw new ValidationAppException("fileId", "File ID không được để trống.");

        var service = await GetDriveServiceAsync(ct);
        var fileMetaReq = service.Files.Get(fileId);
        fileMetaReq.Fields = "id, name";
        var meta = await fileMetaReq.ExecuteAsync(ct);

        var tempDir = Path.Combine(paths.TempRoot, $"gdrive-restore-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        var destZip = Path.Combine(tempDir, meta.Name ?? "backup.zip");

        log.LogInformation("Bắt đầu tải tệp {Name} (ID={Id}) từ Google Drive về {Dest}...", meta.Name, fileId, destZip);
        await using (var outStream = new FileStream(destZip, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            var getReq = service.Files.Get(fileId);
            await getReq.DownloadAsync(outStream, ct);
        }

        log.LogInformation("Tải tệp từ Google Drive hoàn tất: {Dest}", destZip);
        return destZip;
    }

    private async Task<DriveService> GetDriveServiceAsync(CancellationToken ct)
    {
        var clientId = await settings.GetAsync(SettingKeys.GoogleDriveClientId, ct);
        var clientSecret = await settings.GetAsync(SettingKeys.GoogleDriveClientSecret, ct);
        var refreshToken = await settings.GetAsync(SettingKeys.GoogleDriveRefreshToken, ct);

        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret) || string.IsNullOrWhiteSpace(refreshToken))
            throw new ValidationAppException("gdrive", "Google Drive chưa được liên kết. Vui lòng kết nối tài khoản trước.");

        var flow = CreateFlow(clientId, clientSecret);
        var token = new TokenResponse { RefreshToken = refreshToken };
        var credential = new UserCredential(flow, "user", token);

        return new DriveService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "TeachStash"
        });
    }

    private static GoogleAuthorizationCodeFlow CreateFlow(string clientId, string clientSecret) =>
        new(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets
            {
                ClientId = clientId,
                ClientSecret = clientSecret
            },
            Scopes = Scopes
        });

    private static async Task<string?> FindFolderIdAsync(DriveService service, CancellationToken ct)
    {
        var listReq = service.Files.List();
        listReq.Q = $"mimeType = 'application/vnd.google-apps.folder' and name = '{FolderName}' and trashed = false";
        listReq.Fields = "files(id, name)";
        listReq.PageSize = 1;
        var res = await listReq.ExecuteAsync(ct);
        return res.Files.FirstOrDefault()?.Id;
    }

    private static async Task<string> EnsureFolderExistsAsync(DriveService service, CancellationToken ct)
    {
        var existing = await FindFolderIdAsync(service, ct);
        if (!string.IsNullOrEmpty(existing))
            return existing;

        var folderMeta = new Google.Apis.Drive.v3.Data.File
        {
            Name = FolderName,
            MimeType = "application/vnd.google-apps.folder",
            Description = "TeachStash Backups Directory"
        };
        var createReq = service.Files.Create(folderMeta);
        createReq.Fields = "id";
        var created = await createReq.ExecuteAsync(ct);
        return created.Id;
    }

    private async Task PruneOldBackupsAsync(DriveService service, string folderId, int maxBackups, CancellationToken ct)
    {
        try
        {
            var listReq = service.Files.List();
            listReq.Q = $"'{folderId}' in parents and trashed = false and name contains '.zip'";
            listReq.Fields = "files(id, name, createdTime)";
            listReq.OrderBy = "createdTime desc";
            listReq.PageSize = 100;

            var res = await listReq.ExecuteAsync(ct);
            var files = res.Files;
            if (files != null && files.Count > maxBackups)
            {
                var toDelete = files.Skip(maxBackups).ToList();
                foreach (var f in toDelete)
                {
                    try
                    {
                        log.LogInformation("Xóa bản sao lưu cũ trên Google Drive vượt hạn mức: {Name} (ID={Id})", f.Name, f.Id);
                        await service.Files.Delete(f.Id).ExecuteAsync(ct);
                    }
                    catch (Exception ex)
                    {
                        log.LogWarning(ex, "Lỗi khi xóa bản sao lưu cũ trên Drive: {Id}", f.Id);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Lỗi khi kiểm tra hạn mức sao lưu Google Drive.");
        }
    }
}
