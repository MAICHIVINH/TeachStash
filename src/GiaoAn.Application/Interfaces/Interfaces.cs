using GiaoAn.Application.DTOs;
using GiaoAn.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace GiaoAn.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<Document> Documents { get; }
    DbSet<DocumentType> DocumentTypes { get; }
    DbSet<GradeLevel> GradeLevels { get; }
    DbSet<Topic> Topics { get; }
    DbSet<Lesson> Lessons { get; }
    DbSet<DocumentFile> DocumentFiles { get; }
    DbSet<Tag> Tags { get; }
    DbSet<DocumentTag> DocumentTags { get; }
    DbSet<ExerciseTag> ExerciseTags { get; }
    DbSet<CodeSnippetTag> CodeSnippetTags { get; }
    DbSet<CodeSnippet> CodeSnippets { get; }
    DbSet<Exercise> Exercises { get; }
    DbSet<AppSetting> AppSettings { get; }
    DbSet<BackupHistory> BackupHistories { get; }
    DatabaseFacade Database { get; }
    ChangeTracker ChangeTracker { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IAppPaths
{
    string DataRoot { get; }
    string DbPath { get; }
    string FilesRoot { get; }
    string BackupsRoot { get; }
    string TempRoot { get; }
    string LogsRoot { get; }
}

public sealed record StoredFile(string StoredName, string RelativePath, long SizeBytes);
public sealed record UploadedFile(Stream Content, string FileName, long Length);
public sealed record StoredFileAccess(DocumentFile File, string FullPath);

public interface IFileStorage
{
    Task<StoredFile> SaveAsync(Stream content, string originalName, string subFolder, long maxBytes, CancellationToken ct);
    void Delete(string relativePath);
    bool Exists(string relativePath);
    string GetFullPath(string relativePath);
    Stream OpenRead(string relativePath);
    IEnumerable<string> EnumerateAll();
}

public interface IFileOpener { void OpenCopy(string relativePath, string originalName); }

public interface IPasswordHasher { string Hash(string password); bool Verify(string password, string hash); }

public interface ISessionStore
{
    bool PasswordEnabled { get; set; }
    string Create();
    bool IsValid(string? token);
    void Revoke(string? token);
    void RevokeAll();
}

public interface IFilePolicy { Task ValidateAsync(string fileName, long length, CancellationToken ct); Task<IReadOnlyList<string>> AllowedAsync(CancellationToken ct); }

public interface ISettingsService
{
    Task<string?> GetAsync(string key, CancellationToken ct = default);
    Task SetAsync(string key, string? value, CancellationToken ct = default);
    Task<SettingsDto> GetAllAsync(CancellationToken ct);
    Task<SettingsDto> UpdateAsync(SettingsUpdateRequest req, CancellationToken ct);
}

public interface IAuthService
{
    Task InitializeAsync(CancellationToken ct);
    Task<AuthStatusDto> StatusAsync(string? token, CancellationToken ct);
    Task<string> SetPasswordAsync(string password, CancellationToken ct);
    Task<string> LoginAsync(string password, CancellationToken ct);
    Task ChangePasswordAsync(ChangePasswordRequest req, CancellationToken ct);
    Task DisablePasswordAsync(string password, CancellationToken ct);
}

public interface ITagService
{
    Task<List<Tag>> ResolveAsync(IEnumerable<string>? names, CancellationToken ct);
    Task CleanupOrphansAsync(CancellationToken ct);
    Task<IReadOnlyList<TagDto>> ListAsync(CancellationToken ct);
}

public interface ICategoryService
{
    Task<LookupsDto> GetLookupsAsync(CancellationToken ct);
    Task<TopicDto> SaveTopicAsync(int? id, TopicSaveRequest req, CancellationToken ct);
    Task DeleteTopicAsync(int id, CancellationToken ct);
    Task<LessonDto> SaveLessonAsync(int? id, LessonSaveRequest req, CancellationToken ct);
    Task DeleteLessonAsync(int id, CancellationToken ct);
}

public interface IDocumentService
{
    Task<PagedResult<DocumentDto>> QueryAsync(DocumentQuery q, CancellationToken ct);
    Task<PagedResult<DocumentDto>> QueryTrashAsync(string? q, int page, int pageSize, CancellationToken ct);
    Task<DocumentDto> GetAsync(int id, bool markAccessed, CancellationToken ct);
    Task<DocumentDto> CreateAsync(DocumentSaveRequest req, UploadedFile? upload, CancellationToken ct);
    Task<DocumentDto> UpdateAsync(int id, DocumentSaveRequest req, UploadedFile? upload, CancellationToken ct);
    Task<DocumentDto> RemoveFileAsync(int id, CancellationToken ct);
    Task SetFavoriteAsync(int id, bool value, CancellationToken ct);
    Task TrashAsync(IEnumerable<int> ids, CancellationToken ct);
    Task RestoreAsync(IEnumerable<int> ids, CancellationToken ct);
    Task PurgeAsync(IEnumerable<int> ids, CancellationToken ct);
    Task<StoredFileAccess> GetFileAccessAsync(int documentId, CancellationToken ct);
    Task<FileTextDto> ReadTextAsync(int documentId, int maxBytes, CancellationToken ct);
    Task OpenWithDefaultAppAsync(int documentId, CancellationToken ct);
    Task<OrphanCleanupDto> CleanOrphanFilesAsync(CancellationToken ct);
}

public interface IExerciseService
{
    Task<PagedResult<ExerciseDto>> QueryAsync(ExerciseQuery q, CancellationToken ct);
    Task<ExerciseDto> GetAsync(int id, CancellationToken ct);
    Task<ExerciseDto> CreateAsync(ExerciseSaveRequest req, CancellationToken ct);
    Task<ExerciseDto> UpdateAsync(int id, ExerciseSaveRequest req, CancellationToken ct);
    Task DeleteAsync(int id, CancellationToken ct);
}

public interface ICodeSnippetService
{
    Task<PagedResult<SnippetDto>> QueryAsync(SnippetQuery q, CancellationToken ct);
    Task<SnippetDto> GetAsync(int id, CancellationToken ct);
    Task<SnippetDto> CreateAsync(SnippetSaveRequest req, CancellationToken ct);
    Task<SnippetDto> UpdateAsync(int id, SnippetSaveRequest req, CancellationToken ct);
    Task DeleteAsync(int id, CancellationToken ct);
}

public interface IDashboardService { Task<DashboardDto> GetAsync(CancellationToken ct); }
public interface ISearchService { Task<SearchResultDto> SearchAsync(string? q, int take, CancellationToken ct); }

public interface IBackupService
{
    Task<BackupInfoDto> CreateAsync(string? destinationFolder, CancellationToken ct);
    Task<IReadOnlyList<BackupInfoDto>> HistoryAsync(CancellationToken ct);
    Task<BackupValidationDto> ValidateAsync(string zipPath, CancellationToken ct);
    Task<BackupInfoDto> RestoreAsync(string zipPath, bool confirm, CancellationToken ct);
}

public interface IGoogleDriveService
{
    Task<GoogleDriveStatusDto> GetStatusAsync(CancellationToken ct = default);
    Task ConfigureCredentialsAsync(GoogleDriveConfigureRequest req, CancellationToken ct = default);
    Task<GoogleDriveAuthUrlDto> GetAuthUrlAsync(string? callbackUrl = null, CancellationToken ct = default);
    Task<GoogleDriveStatusDto> ExchangeCodeAsync(GoogleDriveExchangeCodeRequest req, CancellationToken ct = default);
    Task DisconnectAsync(CancellationToken ct = default);
    Task UpdateSyncSettingsAsync(GoogleDriveSyncSettingsRequest req, CancellationToken ct = default);
    Task<string> UploadBackupAsync(string zipPath, CancellationToken ct = default);
    Task<IReadOnlyList<GoogleDriveFileDto>> ListBackupsAsync(CancellationToken ct = default);
    Task<string> DownloadBackupAsync(string fileId, CancellationToken ct = default);
}
