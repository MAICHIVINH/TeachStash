using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using GiaoAn.Domain.Entities;
using GiaoAn.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.Tags;

public sealed class TagService(IAppDbContext db) : ITagService
{
    public async Task<List<Tag>> ResolveAsync(IEnumerable<string>? names, CancellationToken ct)
    {
        var parsed = TagName.ParseMany(names);
        var keys = parsed.Select(p => p.Key).ToList();
        var existing = await db.Tags.Where(t => keys.Contains(t.Key)).ToListAsync(ct);
        foreach (var p in parsed)
        {
            if (existing.Any(t => t.Key == p.Key)) continue;
            var tag = new Tag { Name = p.Display, Key = p.Key };
            db.Tags.Add(tag);
            existing.Add(tag);
        }
        return parsed.Select(p => existing.First(t => t.Key == p.Key)).ToList();
    }

    /// <summary>Xóa các thẻ không còn được tài liệu / bài tập / mã nguồn nào sử dụng (kể cả mục trong thùng rác vẫn được tính là đang dùng).</summary>
    public async Task CleanupOrphansAsync(CancellationToken ct)
    {
        var orphans = await db.Tags
            .Where(t => !db.DocumentTags.Any(x => x.TagId == t.Id)
                     && !db.ExerciseTags.Any(x => x.TagId == t.Id)
                     && !db.CodeSnippetTags.Any(x => x.TagId == t.Id))
            .ToListAsync(ct);
        if (orphans.Count == 0) return;
        db.Tags.RemoveRange(orphans);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<TagDto>> ListAsync(CancellationToken ct)
    {
        var tags = await db.Tags.AsNoTracking().Select(t => new
        {
            t.Id, t.Name,
            Count = db.DocumentTags.Count(x => x.TagId == t.Id && !x.Document!.IsDeleted)
                  + db.ExerciseTags.Count(x => x.TagId == t.Id)
                  + db.CodeSnippetTags.Count(x => x.TagId == t.Id)
        }).ToListAsync(ct);
        return tags.OrderByDescending(t => t.Count).ThenBy(t => t.Name).Select(t => new TagDto(t.Id, t.Name, t.Count)).ToList();
    }
}
