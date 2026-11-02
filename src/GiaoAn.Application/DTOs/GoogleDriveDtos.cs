namespace GiaoAn.Application.DTOs;

public record GoogleDriveStatusDto(
    bool IsConfigured,
    bool IsConnected,
    string? UserEmail,
    string? UserName,
    bool AutoUpload,
    int MaxBackups
);

public record GoogleDriveConfigureRequest(
    string ClientId,
    string ClientSecret
);

public record GoogleDriveAuthUrlDto(
    string AuthUrl,
    string State
);

public record GoogleDriveExchangeCodeRequest(
    string Code,
    string? State = null
);

public record GoogleDriveSyncSettingsRequest(
    bool AutoUpload,
    int MaxBackups
);

public record GoogleDriveFileDto(
    string Id,
    string Name,
    long SizeBytes,
    DateTime CreatedAt
);

public record OpenBrowserRequest(string Url);

