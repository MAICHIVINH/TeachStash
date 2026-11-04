using FluentValidation;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Features.Categories;
using GiaoAn.Application.Interfaces;
using GiaoAn.Application.Validators;
using GiaoAn.Domain.Common;
using GiaoAn.Domain.Entities;
using GiaoAn.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.Exercises;

public sealed class ExerciseService(IAppDbContext db, ITagService tags, IValidator<ExerciseSaveRequest> validator) : IExerciseService
{
    private IQueryable<Exercise> WithAll(IQueryable<Exercise> q) =>
        q.Include(e => e.Topic).Include(e => e.Lesson).Include(e => e.Tags).ThenInclude(t => t.Tag);

    public async Task<PagedResult<ExerciseDto>> QueryAsync(ExerciseQuery q, CancellationToken ct)
    {
        var page = Math.Max(1, q.Page ?? 1); var size = Math.Clamp((q.PageSize ?? 20) <= 0 ? 20 : (q.PageSize ?? 20), 1, 100);
        var search = SearchScoring.Build<Exercise>(e => e.SearchIndex, q.Q);
        IQueryable<Exercise> query = db.Exercises.AsNoTracking();
        if (search != null) query = query.Where(search.Filter);
        if (q.GradeLevelId != null) query = query.Where(e => e.GradeLevelId == q.GradeLevelId);
        if (q.TopicId != null) query = query.Where(e => e.TopicId == q.TopicId);
        if (q.LessonId != null) query = query.Where(e => e.LessonId == q.LessonId);
        if (q.Difficulty != null) { var d = (Difficulty)q.Difficulty.Value; query = query.Where(e => e.Difficulty == d); }
        if (q.ExerciseType != null) { var et = (ExerciseType)q.ExerciseType.Value; query = query.Where(e => e.ExerciseType == et); }
        if (!string.IsNullOrWhiteSpace(q.Language)) { var l = q.Language; query = query.Where(e => e.Language == l); }
        if (!string.IsNullOrWhiteSpace(q.Tag)) { var key = q.Tag.Trim().ToLowerInvariant(); query = query.Where(e => e.Tags.Any(t => t.Tag!.Key == key)); }
        var total = await query.CountAsync(ct);
        IOrderedQueryable<Exercise> ordered = search != null
            ? query.OrderByDescending(search.Score).ThenByDescending(e => e.UpdatedAt)
            : query.OrderByDescending(e => e.UpdatedAt);
        var items = await WithAll(ordered).Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return new PagedResult<ExerciseDto>(items.Select(x => Mapper.ToDto(x)).ToList(), total, page, size);
    }

    public async Task<ExerciseDto> GetAsync(int id, CancellationToken ct) =>
        Mapper.ToDto(await WithAll(db.Exercises).FirstOrDefaultAsync(e => e.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy bài tập."));

    public async Task<ExerciseDto> CreateAsync(ExerciseSaveRequest req, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);
        var now = DateTime.UtcNow;
        var e = new Exercise { CreatedAt = now, UpdatedAt = now };
        await ApplyAsync(e, req, ct);
        db.Exercises.Add(e);
        await db.SaveChangesAsync(ct);
        return await GetAsync(e.Id, ct);
    }

    public async Task<ExerciseDto> UpdateAsync(int id, ExerciseSaveRequest req, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);
        var e = await WithAll(db.Exercises).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy bài tập.");
        await ApplyAsync(e, req, ct);
        e.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await tags.CleanupOrphansAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        var e = await db.Exercises.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy bài tập.");
        db.Exercises.Remove(e);
        await db.SaveChangesAsync(ct);
        await tags.CleanupOrphansAsync(ct);
    }

    private async Task ApplyAsync(Exercise e, ExerciseSaveRequest req, CancellationToken ct)
    {
        e.TopicId = await CategoryGuard.ResolveTopicAsync(db, req.GradeLevelId, req.TopicId, req.LessonId, ct);
        e.LessonId = req.LessonId; e.GradeLevelId = req.GradeLevelId;
        e.Title = req.Title.Trim(); e.Statement = req.Statement; e.Difficulty = (Difficulty)req.Difficulty;
        e.ExerciseType = (ExerciseType)req.ExerciseType;
        e.OptionA = string.IsNullOrWhiteSpace(req.OptionA) ? null : req.OptionA.Trim();
        e.OptionB = string.IsNullOrWhiteSpace(req.OptionB) ? null : req.OptionB.Trim();
        e.OptionC = string.IsNullOrWhiteSpace(req.OptionC) ? null : req.OptionC.Trim();
        e.OptionD = string.IsNullOrWhiteSpace(req.OptionD) ? null : req.OptionD.Trim();
        e.CorrectAnswer = string.IsNullOrWhiteSpace(req.CorrectAnswer) ? null : req.CorrectAnswer.Trim().ToUpperInvariant();
        e.Language = string.IsNullOrWhiteSpace(req.Language) ? null : req.Language.Trim();
        e.Hint = req.Hint ?? ""; e.Solution = req.Solution ?? ""; e.SampleCode = req.SampleCode ?? "";
        var resolved = await tags.ResolveAsync(req.Tags, ct);
        e.Tags.RemoveAll(x => !resolved.Contains(x.Tag!));
        foreach (var t in resolved) if (!e.Tags.Any(x => x.Tag == t)) e.Tags.Add(new ExerciseTag { Tag = t });
        e.SearchIndex = TextNormalizer.BuildIndex(e.Title, e.Statement, e.OptionA, e.OptionB, e.OptionC, e.OptionD, e.Hint, e.Solution, e.SampleCode, e.Language,
            string.Join(' ', resolved.Select(t => t.Name)));
    }
}
