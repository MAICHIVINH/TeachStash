using FluentValidation;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Features.Categories;
using GiaoAn.Application.Interfaces;
using GiaoAn.Application.Validators;
using GiaoAn.Domain.Common;
using GiaoAn.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.CodeSnippets;

public sealed class CodeSnippetService(IAppDbContext db, ITagService tags, IValidator<SnippetSaveRequest> validator) : ICodeSnippetService
{
    private IQueryable<CodeSnippet> WithAll(IQueryable<CodeSnippet> q) =>
        q.Include(e => e.Topic).Include(e => e.Lesson).Include(e => e.Tags).ThenInclude(t => t.Tag);

    public async Task<PagedResult<SnippetDto>> QueryAsync(SnippetQuery q, CancellationToken ct)
    {
        var page = Math.Max(1, q.Page ?? 1); var size = Math.Clamp((q.PageSize ?? 20) <= 0 ? 20 : (q.PageSize ?? 20), 1, 100);
        var search = SearchScoring.Build<CodeSnippet>(e => e.SearchIndex, q.Q);
        IQueryable<CodeSnippet> query = db.CodeSnippets.AsNoTracking();
        if (search != null) query = query.Where(search.Filter);
        if (!string.IsNullOrWhiteSpace(q.Language)) { var l = q.Language; query = query.Where(e => e.Language == l); }
        if (q.GradeLevelId != null) query = query.Where(e => e.GradeLevelId == q.GradeLevelId);
        if (q.TopicId != null) query = query.Where(e => e.TopicId == q.TopicId);
        if (q.LessonId != null) query = query.Where(e => e.LessonId == q.LessonId);
        if (!string.IsNullOrWhiteSpace(q.Tag)) { var key = q.Tag.Trim().ToLowerInvariant(); query = query.Where(e => e.Tags.Any(t => t.Tag!.Key == key)); }
        var total = await query.CountAsync(ct);
        IOrderedQueryable<CodeSnippet> ordered = search != null
            ? query.OrderByDescending(search.Score).ThenByDescending(e => e.UpdatedAt)
            : query.OrderByDescending(e => e.UpdatedAt);
        var items = await WithAll(ordered).Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return new PagedResult<SnippetDto>(items.Select(x => Mapper.ToDto(x)).ToList(), total, page, size);
    }

    public async Task<SnippetDto> GetAsync(int id, CancellationToken ct) =>
        Mapper.ToDto(await WithAll(db.CodeSnippets).FirstOrDefaultAsync(e => e.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy đoạn mã."));

    public async Task<SnippetDto> CreateAsync(SnippetSaveRequest req, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);
        var now = DateTime.UtcNow;
        var s = new CodeSnippet { CreatedAt = now, UpdatedAt = now };
        await ApplyAsync(s, req, ct);
        db.CodeSnippets.Add(s);
        await db.SaveChangesAsync(ct);
        return await GetAsync(s.Id, ct);
    }

    public async Task<SnippetDto> UpdateAsync(int id, SnippetSaveRequest req, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);
        var s = await WithAll(db.CodeSnippets).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy đoạn mã.");
        await ApplyAsync(s, req, ct);
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await tags.CleanupOrphansAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        var s = await db.CodeSnippets.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Không tìm thấy đoạn mã.");
        db.CodeSnippets.Remove(s);
        await db.SaveChangesAsync(ct);
        await tags.CleanupOrphansAsync(ct);
    }

    private async Task ApplyAsync(CodeSnippet s, SnippetSaveRequest req, CancellationToken ct)
    {
        s.TopicId = await CategoryGuard.ResolveTopicAsync(db, req.GradeLevelId, req.TopicId, req.LessonId, ct);
        s.LessonId = req.LessonId; s.GradeLevelId = req.GradeLevelId;
        s.Title = req.Title.Trim(); s.Language = req.Language; s.Description = (req.Description ?? "").Trim();
        s.Code = req.Code; // giữ nguyên thụt lề và định dạng
        var resolved = await tags.ResolveAsync(req.Tags, ct);
        s.Tags.RemoveAll(x => !resolved.Contains(x.Tag!));
        foreach (var t in resolved) if (!s.Tags.Any(x => x.Tag == t)) s.Tags.Add(new CodeSnippetTag { Tag = t });
        s.SearchIndex = TextNormalizer.BuildIndex(s.Title, s.Description, s.Code, s.Language, string.Join(' ', resolved.Select(t => t.Name)));
    }
}
