using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using GiaoAn.Domain.Entities;

namespace GiaoAn.Application.Common;

public static class Mapper
{
    public static FileDto? ToDto(DocumentFile? f, IFileStorage storage) => f == null ? null :
        new FileDto(f.Id, f.OriginalName, f.Extension, f.MimeType, f.SizeBytes,
            storage.Exists(f.RelativePath), FileTypes.PreviewKind(f.Extension));

    public static DocumentDto ToDto(Document d, IFileStorage storage, bool includeContent) =>
        new(d.Id, d.Title, d.DocumentTypeId, d.DocumentType?.Name ?? "", d.GradeLevelId, d.TopicId, d.Topic?.Name,
            d.LessonId, d.Lesson?.Name, d.ProgrammingLanguage, d.Description, includeContent ? d.ContentText : null,
            d.IsFavorite, d.CreatedAt, d.UpdatedAt, d.LastAccessedAt, d.DeletedAt, ToDto(d.File, storage),
            d.DocumentTags.Select(t => t.Tag!.Name).OrderBy(n => n).ToList());

    public static ExerciseDto ToDto(Exercise e) =>
        new(e.Id, e.Title, e.Statement, e.GradeLevelId, e.TopicId, e.Topic?.Name, e.LessonId, e.Lesson?.Name,
            (int)e.Difficulty, e.Language, e.Hint, e.Solution, e.SampleCode, e.CreatedAt, e.UpdatedAt,
            e.Tags.Select(t => t.Tag!.Name).OrderBy(n => n).ToList());

    public static SnippetDto ToDto(CodeSnippet s) =>
        new(s.Id, s.Title, s.Language, s.GradeLevelId, s.TopicId, s.Topic?.Name, s.LessonId, s.Lesson?.Name,
            s.Description, s.Code, s.CreatedAt, s.UpdatedAt, s.Tags.Select(t => t.Tag!.Name).OrderBy(n => n).ToList());
}
