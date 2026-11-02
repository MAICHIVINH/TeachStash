using FluentValidation;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using GiaoAn.Application.Validators;
using GiaoAn.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.Categories;

public sealed class CategoryService(IAppDbContext db, IValidator<TopicSaveRequest> topicValidator,
    IValidator<LessonSaveRequest> lessonValidator) : ICategoryService
{
    public async Task<LookupsDto> GetLookupsAsync(CancellationToken ct)
    {
        var types = await db.DocumentTypes.AsNoTracking().OrderBy(t => t.SortOrder).Select(t => new LookupItem(t.Id, t.Name)).ToListAsync(ct);
        var grades = await db.GradeLevels.AsNoTracking().OrderBy(t => t.Id).Select(t => new LookupItem(t.Id, t.Name)).ToListAsync(ct);
        var topics = await db.Topics.AsNoTracking().OrderBy(t => t.SortOrder).ThenBy(t => t.Name)
            .Select(t => new TopicDto(t.Id, t.Name, t.GradeLevelId, t.SortOrder)).ToListAsync(ct);
        var lessons = await db.Lessons.AsNoTracking().OrderBy(t => t.SortOrder).ThenBy(t => t.Name)
            .Select(t => new LessonDto(t.Id, t.Name, t.TopicId, t.SortOrder)).ToListAsync(ct);
        return new LookupsDto(types, grades, topics, lessons, Languages.All);
    }

    public async Task<TopicDto> SaveTopicAsync(int? id, TopicSaveRequest req, CancellationToken ct)
    {
        await topicValidator.ValidateOrThrowAsync(req, ct);
        var name = req.Name.Trim();
        if (req.GradeLevelId != null && !await db.GradeLevels.AnyAsync(g => g.Id == req.GradeLevelId, ct))
            throw new ValidationAppException("gradeLevelId", "Khối lớp không tồn tại.");
        var gradeId = req.GradeLevelId;
        var topicExists = id == null
            ? await db.Topics.AnyAsync(t => t.Name == name && t.GradeLevelId == gradeId, ct)
            : await db.Topics.AnyAsync(t => t.Name == name && t.GradeLevelId == gradeId && t.Id != id.Value, ct);
        if (topicExists)
            throw new ConflictException("Chủ đề này đã tồn tại.");
        Topic topic;
        if (id == null) { topic = new Topic(); db.Topics.Add(topic); }
        else topic = await db.Topics.FindAsync(new object[] { id.Value }, ct) ?? throw new NotFoundException("Không tìm thấy chủ đề.");
        topic.Name = name; topic.GradeLevelId = req.GradeLevelId; topic.SortOrder = req.SortOrder;
        await db.SaveChangesAsync(ct);
        return new TopicDto(topic.Id, topic.Name, topic.GradeLevelId, topic.SortOrder);
    }

    public async Task DeleteTopicAsync(int id, CancellationToken ct)
    {
        var topic = await db.Topics.Include(t => t.Lessons).FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy chủ đề.");
        var lessonIds = topic.Lessons.Select(l => l.Id).ToList();
        var used = await CountUsageAsync(id, lessonIds, ct);
        if (used > 0) throw new ConflictException($"Không thể xóa: chủ đề đang được dùng bởi {used} mục (tài liệu, bài tập hoặc mã nguồn). Hãy gỡ chủ đề khỏi các mục đó trước.");
        db.Topics.Remove(topic);
        await db.SaveChangesAsync(ct);
    }

    public async Task<LessonDto> SaveLessonAsync(int? id, LessonSaveRequest req, CancellationToken ct)
    {
        await lessonValidator.ValidateOrThrowAsync(req, ct);
        if (!await db.Topics.AnyAsync(t => t.Id == req.TopicId, ct))
            throw new ValidationAppException("topicId", "Chủ đề không tồn tại.");
        var name = req.Name.Trim();
        var topicId = req.TopicId;
        var lessonExists = id == null
            ? await db.Lessons.AnyAsync(l => l.Name == name && l.TopicId == topicId, ct)
            : await db.Lessons.AnyAsync(l => l.Name == name && l.TopicId == topicId && l.Id != id.Value, ct);
        if (lessonExists)
            throw new ConflictException("Bài học này đã tồn tại trong chủ đề.");
        Lesson lesson;
        if (id == null) { lesson = new Lesson(); db.Lessons.Add(lesson); }
        else
        {
            lesson = await db.Lessons.FindAsync(new object[] { id.Value }, ct) ?? throw new NotFoundException("Không tìm thấy bài học.");
            if (lesson.TopicId != req.TopicId && await CountUsageAsync(null, new List<int> { id.Value }, ct) > 0)
                throw new ConflictException("Không thể chuyển bài học sang chủ đề khác vì đang được sử dụng.");
        }
        lesson.Name = name; lesson.TopicId = req.TopicId; lesson.SortOrder = req.SortOrder;
        await db.SaveChangesAsync(ct);
        return new LessonDto(lesson.Id, lesson.Name, lesson.TopicId, lesson.SortOrder);
    }

    public async Task DeleteLessonAsync(int id, CancellationToken ct)
    {
        var lesson = await db.Lessons.FindAsync(new object[] { id }, ct) ?? throw new NotFoundException("Không tìm thấy bài học.");
        var used = await CountUsageAsync(null, new List<int> { id }, ct);
        if (used > 0) throw new ConflictException($"Không thể xóa: bài học đang được dùng bởi {used} mục.");
        db.Lessons.Remove(lesson);
        await db.SaveChangesAsync(ct);
    }

    private async Task<int> CountUsageAsync(int? topicId, List<int> lessonIds, CancellationToken ct)
    {
        var d = await db.Documents.CountAsync(x => (topicId != null && x.TopicId == topicId) || (x.LessonId != null && lessonIds.Contains(x.LessonId.Value)), ct);
        var e = await db.Exercises.CountAsync(x => (topicId != null && x.TopicId == topicId) || (x.LessonId != null && lessonIds.Contains(x.LessonId.Value)), ct);
        var s = await db.CodeSnippets.CountAsync(x => (topicId != null && x.TopicId == topicId) || (x.LessonId != null && lessonIds.Contains(x.LessonId.Value)), ct);
        return d + e + s;
    }
}
