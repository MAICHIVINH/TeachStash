namespace GiaoAn.Application.DTOs;

public record LookupItem(int Id, string Name);
public record TopicDto(int Id, string Name, int? GradeLevelId, int SortOrder);
public record LessonDto(int Id, string Name, int TopicId, int SortOrder);
public record TagDto(int Id, string Name, int Count);
public record LookupsDto(IReadOnlyList<LookupItem> DocumentTypes, IReadOnlyList<LookupItem> GradeLevels,
    IReadOnlyList<TopicDto> Topics, IReadOnlyList<LessonDto> Lessons, IReadOnlyList<string> Languages);

public class TopicSaveRequest { public string Name { get; set; } = ""; public int? GradeLevelId { get; set; } public int SortOrder { get; set; } }
public class LessonSaveRequest { public string Name { get; set; } = ""; public int TopicId { get; set; } public int SortOrder { get; set; } }

public record FileDto(int Id, string OriginalName, string Extension, string MimeType, long SizeBytes, bool Exists, string PreviewKind);

public record DocumentDto(int Id, string Title, int DocumentTypeId, string DocumentTypeName, int? GradeLevelId,
    int? TopicId, string? TopicName, int? LessonId, string? LessonName, string? ProgrammingLanguage,
    string Description, string? ContentText, bool IsFavorite, DateTime CreatedAt, DateTime UpdatedAt,
    DateTime? LastAccessedAt, DateTime? DeletedAt, FileDto? File, IReadOnlyList<string> Tags);

public class DocumentSaveRequest
{
    public string Title { get; set; } = "";
    public int DocumentTypeId { get; set; }
    public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; }
    public int? LessonId { get; set; }
    public string? ProgrammingLanguage { get; set; }
    public string? Description { get; set; }
    public string? ContentText { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool RemoveFile { get; set; }
}

public class DocumentQuery
{
    public string? Q { get; set; }
    public int? TypeId { get; set; }
    public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; }
    public int? LessonId { get; set; }
    public string? Tag { get; set; }
    public string? Language { get; set; }
    public DateTime? CreatedFrom { get; set; }
    public DateTime? CreatedTo { get; set; }
    public bool? Favorite { get; set; }
    public string? Sort { get; set; }
    public int? Page { get; set; } = 1;
    public int? PageSize { get; set; } = 20;
}

public record FacetItem(string Key, string Name, int Count);
public record DocumentFacets(IReadOnlyList<FacetItem> Types, IReadOnlyList<FacetItem> Grades,
    IReadOnlyList<FacetItem> Topics, IReadOnlyList<FacetItem> Tags, IReadOnlyList<FacetItem> Languages);
public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize, DocumentFacets? Facets = null);

public record IdsRequest(List<int> Ids);
public record FavoriteRequest(bool IsFavorite);
public record FileTextDto(string Text, bool Truncated);
public record OrphanCleanupDto(int FilesDeleted, long BytesFreed);

public record ExerciseDto(int Id, string Title, string Statement, int? GradeLevelId, int? TopicId, string? TopicName,
    int? LessonId, string? LessonName, int Difficulty, string? Language, string Hint, string Solution, string SampleCode,
    DateTime CreatedAt, DateTime UpdatedAt, IReadOnlyList<string> Tags,
    int ExerciseType = 1, string? OptionA = null, string? OptionB = null, string? OptionC = null, string? OptionD = null,
    string? CorrectAnswer = null);
public class ExerciseSaveRequest
{
    public string Title { get; set; } = "";
    public string Statement { get; set; } = "";
    public int ExerciseType { get; set; } = 1;
    public string? OptionA { get; set; }
    public string? OptionB { get; set; }
    public string? OptionC { get; set; }
    public string? OptionD { get; set; }
    public string? CorrectAnswer { get; set; }
    public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; }
    public int? LessonId { get; set; }
    public int Difficulty { get; set; } = 2;
    public string? Language { get; set; }
    public string? Hint { get; set; }
    public string? Solution { get; set; }
    public string? SampleCode { get; set; }
    public List<string> Tags { get; set; } = new();
}
public class ExerciseQuery
{
    public string? Q { get; set; } public int? GradeLevelId { get; set; } public int? TopicId { get; set; }
    public int? LessonId { get; set; } public int? Difficulty { get; set; } public int? ExerciseType { get; set; } public string? Language { get; set; }
    public string? Tag { get; set; } public int? Page { get; set; } = 1; public int? PageSize { get; set; } = 20;
}

public record SnippetDto(int Id, string Title, string Language, int? GradeLevelId, int? TopicId, string? TopicName,
    int? LessonId, string? LessonName, string Description, string Code, DateTime CreatedAt, DateTime UpdatedAt,
    IReadOnlyList<string> Tags);
public class SnippetSaveRequest
{
    public string Title { get; set; } = "";
    public string Language { get; set; } = "Python";
    public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; }
    public int? LessonId { get; set; }
    public string? Description { get; set; }
    public string Code { get; set; } = "";
    public List<string> Tags { get; set; } = new();
}
public class SnippetQuery
{
    public string? Q { get; set; } public string? Language { get; set; } public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; } public int? LessonId { get; set; } public string? Tag { get; set; }
    public int? Page { get; set; } = 1; public int? PageSize { get; set; } = 20;
}

public record DashboardDto(int TotalDocuments, int LessonPlans, int Lectures, int Exercises, int Exams, int CodeSnippets,
    IReadOnlyList<DocumentDto> RecentlyAdded, IReadOnlyList<DocumentDto> RecentlyAccessed, IReadOnlyList<DocumentDto> Favorites);

public record SearchResultDto(string Query, IReadOnlyList<DocumentDto> Documents, int DocumentTotal,
    IReadOnlyList<ExerciseDto> Exercises, int ExerciseTotal, IReadOnlyList<SnippetDto> Snippets, int SnippetTotal);

public record BackupInfoDto(int Id, string Kind, string FilePath, long SizeBytes, bool Success, string Message, DateTime CreatedAt);
public class BackupRequest { public string? DestinationFolder { get; set; } }
public class RestoreRequest { public string Path { get; set; } = ""; public bool Confirm { get; set; } }
public record BackupValidationDto(bool Valid, string Message, DateTime? CreatedAt, int DocumentCount, int FileCount);

public record AuthStatusDto(bool PasswordEnabled, bool IsAuthenticated, int AutoLockMinutes);
public class PasswordRequest { public string Password { get; set; } = ""; }
public class ChangePasswordRequest { public string CurrentPassword { get; set; } = ""; public string NewPassword { get; set; } = ""; }

public record SettingsDto(string Theme, int AutoLockMinutes, string ExtraExtensions, string DataRoot,
    IReadOnlyList<string> AllowedExtensions, int MaxFileSizeMb);
public class SettingsUpdateRequest { public string? Theme { get; set; } public int? AutoLockMinutes { get; set; } public string? ExtraExtensions { get; set; } }

public record ExamMatrixTemplateDto(int Id, string Name, int? GradeLevelId, string? GradeLevelName,
    int DurationMinutes, double TotalScore, string HeaderSchool, string HeaderExamName,
    string MatrixDataJson, DateTime CreatedAt, DateTime UpdatedAt);

public class ExamMatrixTemplateSaveRequest
{
    public string Name { get; set; } = "";
    public int? GradeLevelId { get; set; }
    public int DurationMinutes { get; set; } = 45;
    public double TotalScore { get; set; } = 10.0;
    public string? HeaderSchool { get; set; }
    public string? HeaderExamName { get; set; }
    public string MatrixDataJson { get; set; } = "[]";
}
