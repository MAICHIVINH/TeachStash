using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using GiaoAn.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.Dashboard;

public sealed class DashboardService(IAppDbContext db, IFileStorage storage) : IDashboardService
{
    public async Task<DashboardDto> GetAsync(CancellationToken ct)
    {
        var live = db.Documents.AsNoTracking().Where(d => !d.IsDeleted);
        var total = await live.CountAsync(ct);
        var plans = await live.CountAsync(d => d.DocumentTypeId == 1, ct);
        var lectures = await live.CountAsync(d => d.DocumentTypeId == 2, ct);
        var exams = await live.CountAsync(d => d.DocumentTypeId == 4, ct);
        var exercises = await db.Exercises.CountAsync(ct);
        var snippets = await db.CodeSnippets.CountAsync(ct);

        IQueryable<Document> Full(IQueryable<Document> q) =>
            q.Include(d => d.DocumentType).Include(d => d.Topic).Include(d => d.Lesson).Include(d => d.File)
             .Include(d => d.DocumentTags).ThenInclude(t => t.Tag);

        var added = await Full(live.OrderByDescending(d => d.CreatedAt)).Take(8).ToListAsync(ct);
        var accessed = await Full(live.Where(d => d.LastAccessedAt != null).OrderByDescending(d => d.LastAccessedAt)).Take(8).ToListAsync(ct);
        var favs = await Full(live.Where(d => d.IsFavorite).OrderByDescending(d => d.UpdatedAt)).Take(8).ToListAsync(ct);
        List<DocumentDto> Map(List<Document> l) => l.Select(d => Mapper.ToDto(d, storage, false)).ToList();
        return new DashboardDto(total, plans, lectures, exercises, exams, snippets, Map(added), Map(accessed), Map(favs));
    }
}
