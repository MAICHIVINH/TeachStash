using GiaoAn.Domain.Common;
using GiaoAn.Domain.Enums;
using GiaoAn.Domain.Interfaces;

namespace GiaoAn.Domain.Entities;

public class DocumentType : Entity { public string Name { get; set; } = ""; public int SortOrder { get; set; } }

public class GradeLevel : Entity { public string Name { get; set; } = ""; }

public class Topic : Entity
{
    public string Name { get; set; } = "";
    public int? GradeLevelId { get; set; }
    public GradeLevel? GradeLevel { get; set; }
    public int SortOrder { get; set; }
    public List<Lesson> Lessons { get; set; } = new();
}

public class Lesson : Entity
{
    public string Name { get; set; } = "";
    public int TopicId { get; set; }
    public Topic? Topic { get; set; }
    public int SortOrder { get; set; }
}

public class Tag : Entity { public string Name { get; set; } = ""; public string Key { get; set; } = ""; }

public class Document : Entity, ISoftDeletable, ISearchable
{
    public string Title { get; set; } = "";
    public int DocumentTypeId { get; set; }
    public DocumentType? DocumentType { get; set; }
    public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; }
    public Topic? Topic { get; set; }
    public int? LessonId { get; set; }
    public Lesson? Lesson { get; set; }
    public string? ProgrammingLanguage { get; set; }
    public string Description { get; set; } = "";
    public string ContentText { get; set; } = "";
    public string SearchIndex { get; set; } = "";
    public bool IsFavorite { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastAccessedAt { get; set; }
    public DocumentFile? File { get; set; }
    public List<DocumentTag> DocumentTags { get; set; } = new();
}

public class DocumentFile : Entity
{
    public int DocumentId { get; set; }
    public Document? Document { get; set; }
    public string StoredName { get; set; } = "";
    /// <summary>Đường dẫn tương đối so với thư mục files/, dùng dấu '/'.</summary>
    public string RelativePath { get; set; } = "";
    public string OriginalName { get; set; } = "";
    public string Extension { get; set; } = "";
    public string MimeType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class DocumentTag { public int DocumentId { get; set; } public Document? Document { get; set; } public int TagId { get; set; } public Tag? Tag { get; set; } }
public class ExerciseTag { public int ExerciseId { get; set; } public Exercise? Exercise { get; set; } public int TagId { get; set; } public Tag? Tag { get; set; } }
public class CodeSnippetTag { public int CodeSnippetId { get; set; } public CodeSnippet? CodeSnippet { get; set; } public int TagId { get; set; } public Tag? Tag { get; set; } }

public class CodeSnippet : Entity, ISearchable
{
    public string Title { get; set; } = "";
    public string Language { get; set; } = "Python";
    public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; }
    public Topic? Topic { get; set; }
    public int? LessonId { get; set; }
    public Lesson? Lesson { get; set; }
    public string Description { get; set; } = "";
    public string Code { get; set; } = "";
    public string SearchIndex { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<CodeSnippetTag> Tags { get; set; } = new();
}

public class Exercise : Entity, ISearchable
{
    public string Title { get; set; } = "";
    public string Statement { get; set; } = "";
    public ExerciseType ExerciseType { get; set; } = ExerciseType.MultipleChoice;
    public string? OptionA { get; set; }
    public string? OptionB { get; set; }
    public string? OptionC { get; set; }
    public string? OptionD { get; set; }
    public string? CorrectAnswer { get; set; }
    public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; }
    public Topic? Topic { get; set; }
    public int? LessonId { get; set; }
    public Lesson? Lesson { get; set; }
    public Difficulty Difficulty { get; set; } = Difficulty.Understand;
    public string? Language { get; set; }
    public string Hint { get; set; } = "";
    public string Solution { get; set; } = "";
    public string SampleCode { get; set; } = "";
    public string SearchIndex { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ExerciseTag> Tags { get; set; } = new();
}

public class ExamMatrixTemplate : Entity
{
    public string Name { get; set; } = "";
    public int? GradeLevelId { get; set; }
    public GradeLevel? GradeLevel { get; set; }
    public int DurationMinutes { get; set; } = 45;
    public double TotalScore { get; set; } = 10.0;
    public string HeaderSchool { get; set; } = "";
    public string HeaderExamName { get; set; } = "";
    public string MatrixDataJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class TeachingPlanItem : Entity
{
    public int GradeLevelId { get; set; }
    public GradeLevel? GradeLevel { get; set; }
    public int WeekNumber { get; set; }
    public int PeriodNumber { get; set; }
    public string PeriodName { get; set; } = "";
    public string Title { get; set; } = "";
    public string NumberOfPeriods { get; set; } = "2LT";
    public string Equipment { get; set; } = "";
    public string Location { get; set; } = "Phòng học/Phòng máy";
    public int? TopicId { get; set; }
    public Topic? Topic { get; set; }
    public int? LessonId { get; set; }
    public Lesson? Lesson { get; set; }
    public string Notes { get; set; } = "";
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class TeachingClass : Entity
{
    public string Name { get; set; } = "";
    public int GradeLevelId { get; set; }
    public GradeLevel? GradeLevel { get; set; }
    public string AcademicYear { get; set; } = "2026-2027";
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class TeachingProgress : Entity
{
    public int ClassId { get; set; }
    public TeachingClass? Class { get; set; }
    public int PlanItemId { get; set; }
    public TeachingPlanItem? PlanItem { get; set; }
    public TeachingStatus Status { get; set; } = TeachingStatus.Untaught;
    public DateTime? ActualDate { get; set; }
    public string TeacherNotes { get; set; } = "";
    public string CustomDocumentIdsJson { get; set; } = "[]";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class AppSetting { public string Key { get; set; } = ""; public string Value { get; set; } = ""; }

public class BackupHistory
{
    public int Id { get; set; }
    public BackupKind Kind { get; set; }
    public string FilePath { get; set; } = "";
    public long SizeBytes { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
