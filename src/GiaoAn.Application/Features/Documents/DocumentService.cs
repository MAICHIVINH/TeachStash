using System.Text;
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
using Microsoft.Extensions.Logging;

namespace GiaoAn.Application.Features.Documents;

public sealed class DocumentService(IAppDbContext db, IFileStorage storage, IFileOpener opener, ITagService tags,
    IFilePolicy policy, IValidator<DocumentSaveRequest> validator, ILogger<DocumentService> log) : IDocumentService
{
    private static IQueryable<Document> WithAll(IQueryable<Document> q) =>
        q.Include(d => d.DocumentType).Include(d => d.Topic).Include(d => d.Lesson).Include(d => d.File)
         .Include(d => d.DocumentTags).ThenInclude(t => t.Tag);

    private static (int page, int size) Paging(int page, int size) =>
        (Math.Max(1, page), Math.Clamp(size <= 0 ? 20 : size, 1, 100));

    public async Task<PagedResult<DocumentDto>> QueryAsync(DocumentQuery q, CancellationToken ct)
    {
        var (page, size) = Paging(q.Page ?? 1, q.PageSize ?? 20);
        var search = SearchScoring.Build<Document>(d => d.SearchIndex, q.Q);

        IQueryable<Document> scopeNoType = db.Documents.AsNoTracking().Where(d => !d.IsDeleted);
        if (search != null) scopeNoType = scopeNoType.Where(search.Filter);
        if (q.Favorite == true) scopeNoType = scopeNoType.Where(d => d.IsFavorite);

        var scope = q.TypeId != null ? scopeNoType.Where(d => d.DocumentTypeId == q.TypeId) : scopeNoType;
        var filtered = scope;
        if (q.GradeLevelId != null) filtered = filtered.Where(d => d.GradeLevelId == q.GradeLevelId);
        if (q.TopicId != null) filtered = filtered.Where(d => d.TopicId == q.TopicId);
        if (q.LessonId != null) filtered = filtered.Where(d => d.LessonId == q.LessonId);
        if (!string.IsNullOrWhiteSpace(q.Language)) { var lang = q.Language; filtered = filtered.Where(d => d.ProgrammingLanguage == lang); }
        if (!string.IsNullOrWhiteSpace(q.Tag)) { var key = q.Tag.Trim().ToLowerInvariant(); filtered = filtered.Where(d => d.DocumentTags.Any(t => t.Tag!.Key == key)); }
        if (q.CreatedFrom != null) { var from = q.CreatedFrom.Value.ToUniversalTime(); filtered = filtered.Where(d => d.CreatedAt >= from); }
        if (q.CreatedTo != null) { var to = q.CreatedTo.Value.ToUniversalTime().Date.AddDays(1); filtered = filtered.Where(d => d.CreatedAt < to); }

        var total = await filtered.CountAsync(ct);
        IOrderedQueryable<Document> ordered = search != null
            ? filtered.OrderByDescending(search.Score).ThenByDescending(d => d.UpdatedAt)
            : q.Sort switch
            {
                "title" => filtered.OrderBy(d => d.Title),
                "created" => filtered.OrderByDescending(d => d.CreatedAt),
                _ => filtered.OrderByDescending(d => d.UpdatedAt)
            };
        var items = await WithAll(ordered).Skip((page - 1) * size).Take(size).ToListAsync(ct);
        var facets = await BuildFacetsAsync(scopeNoType, scope, ct);
        return new PagedResult<DocumentDto>(items.Select(d => Mapper.ToDto(d, storage, false)).ToList(), total, page, size, facets);
    }

    private async Task<DocumentFacets> BuildFacetsAsync(IQueryable<Document> scopeNoType, IQueryable<Document> scope, CancellationToken ct)
    {
        var typeNames = await db.DocumentTypes.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Name, ct);
        var topicNames = await db.Topics.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Name, ct);

        var types = (await scopeNoType.GroupBy(d => d.DocumentTypeId).Select(g => new { g.Key, C = g.Count() }).ToListAsync(ct))
            .OrderBy(x => x.Key).Select(x => new FacetItem(x.Key.ToString(), typeNames.GetValueOrDefault(x.Key, "?"), x.C)).ToList();

        var grades = (await scope.GroupBy(d => d.GradeLevelId).Select(g => new { g.Key, C = g.Count() }).ToListAsync(ct))
            .OrderBy(x => x.Key ?? 99).Select(x => new FacetItem(x.Key?.ToString() ?? "", x.Key == null ? "Không xác định" : $"Lớp {x.Key}", x.C)).ToList();

        var topics = (await scope.Where(d => d.TopicId != null).GroupBy(d => d.TopicId!.Value).Select(g => new { g.Key, C = g.Count() }).ToListAsync(ct))
            .Select(x => new FacetItem(x.Key.ToString(), topicNames.GetValueOrDefault(x.Key, "?"), x.C)).OrderBy(f => f.Name).ToList();

        var langs = (await scope.Where(d => d.ProgrammingLanguage != null && d.ProgrammingLanguage != "")
            .GroupBy(d => d.ProgrammingLanguage!).Select(g => new { g.Key, C = g.Count() }).ToListAsync(ct))
            .Select(x => new FacetItem(x.Key, x.Key, x.C)).OrderBy(f => f.Name).ToList();

        var tagRows = await db.DocumentTags.AsNoTracking().Where(dt => scope.Any(d => d.Id == dt.DocumentId))
            .GroupBy(dt => new { dt.Tag!.Key, dt.Tag.Name }).Select(g => new { g.Key.Key, g.Key.Name, C = g.Count() })
            .OrderByDescending(x => x.C).Take(40).ToListAsync(ct);
        var tagItems = tagRows.Select(x => new FacetItem(x.Key, x.Name, x.C)).ToList();

        return new DocumentFacets(types, grades, topics, tagItems, langs);
    }

    public async Task<PagedResult<DocumentDto>> QueryTrashAsync(string? q, int page, int pageSize, CancellationToken ct)
    {
        var (p, size) = Paging(page, pageSize);
        var search = SearchScoring.Build<Document>(d => d.SearchIndex, q);
        var query = db.Documents.AsNoTracking().Where(d => d.IsDeleted);
        if (search != null) query = query.Where(search.Filter);
        var total = await query.CountAsync(ct);
        var items = await WithAll(query.OrderByDescending(d => d.DeletedAt)).Skip((p - 1) * size).Take(size).ToListAsync(ct);
        return new PagedResult<DocumentDto>(items.Select(d => Mapper.ToDto(d, storage, false)).ToList(), total, p, size);
    }

    public async Task<DocumentDto> GetAsync(int id, bool markAccessed, CancellationToken ct)
    {
        var doc = await WithAll(db.Documents).FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy tài liệu.");
        if (markAccessed && !doc.IsDeleted)
        {
            doc.LastAccessedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        return Mapper.ToDto(doc, storage, true);
    }

    public async Task<DocumentDto> CreateAsync(DocumentSaveRequest req, UploadedFile? upload, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);
        if (upload != null) await policy.ValidateAsync(upload.FileName, upload.Length, ct);
        var now = DateTime.UtcNow;
        var doc = new Document { CreatedAt = now, UpdatedAt = now };
        await ApplyFieldsAsync(doc, req, ct);

        StoredFile? stored = null;
        try
        {
            if (upload != null) { stored = await SaveToStorageAsync(upload, doc.DocumentTypeId, ct); doc.File = NewFile(stored, upload.FileName); }
            doc.SearchIndex = BuildIndex(doc);
            db.Documents.Add(doc);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            if (stored != null) storage.Delete(stored.RelativePath);
            throw;
        }
        return await GetAsync(doc.Id, false, ct);
    }

    public async Task<DocumentDto> UpdateAsync(int id, DocumentSaveRequest req, UploadedFile? upload, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);
        if (upload != null) await policy.ValidateAsync(upload.FileName, upload.Length, ct);
        var doc = await WithAll(db.Documents).FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, ct)
            ?? throw new NotFoundException("Không tìm thấy tài liệu.");
        await ApplyFieldsAsync(doc, req, ct);
        doc.UpdatedAt = DateTime.UtcNow;

        StoredFile? stored = null; string? oldPath = null;
        try
        {
            if (upload != null)
            {
                stored = await SaveToStorageAsync(upload, doc.DocumentTypeId, ct);
                oldPath = doc.File?.RelativePath;
                if (doc.File == null) doc.File = NewFile(stored, upload.FileName);
                else Fill(doc.File, stored, upload.FileName);
            }
            else if (req.RemoveFile && doc.File != null)
            {
                oldPath = doc.File.RelativePath;
                db.DocumentFiles.Remove(doc.File);
                doc.File = null;
            }
            doc.SearchIndex = BuildIndex(doc);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            if (stored != null) storage.Delete(stored.RelativePath);
            throw;
        }
        TryDelete(oldPath);
        await tags.CleanupOrphansAsync(ct);
        return await GetAsync(id, false, ct);
    }

    public async Task<DocumentDto> RemoveFileAsync(int id, CancellationToken ct)
    {
        var doc = await WithAll(db.Documents).FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, ct)
            ?? throw new NotFoundException("Không tìm thấy tài liệu.");
        if (doc.File == null) return Mapper.ToDto(doc, storage, true);
        var old = doc.File.RelativePath;
        db.DocumentFiles.Remove(doc.File);
        doc.File = null;
        doc.UpdatedAt = DateTime.UtcNow;
        doc.SearchIndex = BuildIndex(doc);
        await db.SaveChangesAsync(ct);
        TryDelete(old);
        return Mapper.ToDto(doc, storage, true);
    }

    public async Task SetFavoriteAsync(int id, bool value, CancellationToken ct)
    {
        var doc = await db.Documents.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, ct)
            ?? throw new NotFoundException("Không tìm thấy tài liệu.");
        doc.IsFavorite = value;
        await db.SaveChangesAsync(ct);
    }

    public async Task TrashAsync(IEnumerable<int> ids, CancellationToken ct)
    {
        var list = ids.Distinct().ToList();
        var docs = await db.Documents.Where(d => list.Contains(d.Id) && !d.IsDeleted).ToListAsync(ct);
        if (docs.Count == 0) throw new NotFoundException("Không tìm thấy tài liệu cần xóa.");
        var now = DateTime.UtcNow;
        foreach (var d in docs) { d.IsDeleted = true; d.DeletedAt = now; }
        await db.SaveChangesAsync(ct);
    }

    public async Task RestoreAsync(IEnumerable<int> ids, CancellationToken ct)
    {
        var list = ids.Distinct().ToList();
        var docs = await db.Documents.Where(d => list.Contains(d.Id) && d.IsDeleted).ToListAsync(ct);
        if (docs.Count == 0) throw new NotFoundException("Không tìm thấy tài liệu trong thùng rác.");
        foreach (var d in docs) { d.IsDeleted = false; d.DeletedAt = null; }
        await db.SaveChangesAsync(ct);
    }

    public async Task PurgeAsync(IEnumerable<int> ids, CancellationToken ct)
    {
        var list = ids.Distinct().ToList();
        var docs = await db.Documents.Include(d => d.File).Where(d => list.Contains(d.Id) && d.IsDeleted).ToListAsync(ct);
        if (docs.Count == 0) throw new NotFoundException("Chỉ có thể xóa vĩnh viễn tài liệu đang nằm trong thùng rác.");
        var paths = docs.Where(d => d.File != null).Select(d => d.File!.RelativePath).ToList();
        db.Documents.RemoveRange(docs);
        await db.SaveChangesAsync(ct);
        foreach (var p in paths) TryDelete(p);
        await tags.CleanupOrphansAsync(ct);
    }

    public async Task<StoredFileAccess> GetFileAccessAsync(int documentId, CancellationToken ct)
    {
        var file = await db.DocumentFiles.AsNoTracking().FirstOrDefaultAsync(f => f.DocumentId == documentId && !f.Document!.IsDeleted, ct)
            ?? throw new NotFoundException("Tài liệu không có tệp đính kèm.");
        if (!storage.Exists(file.RelativePath))
            throw new NotFoundException("Tệp đính kèm không còn tồn tại trên ổ đĩa. Hãy thay thế hoặc gỡ tệp.");
        return new StoredFileAccess(file, storage.GetFullPath(file.RelativePath));
    }

    public async Task<FileTextDto> ReadTextAsync(int documentId, int maxBytes, CancellationToken ct)
    {
        var access = await GetFileAccessAsync(documentId, ct);
        if (FileTypes.PreviewKind(access.File.Extension) != "text")
            throw new ValidationAppException("file", "Tệp này không phải tệp văn bản.");
        await using var stream = storage.OpenRead(access.File.RelativePath);
        var buffer = new byte[Math.Min(maxBytes, (int)Math.Min(stream.Length, int.MaxValue))];
        var read = 0;
        while (read < buffer.Length)
        {
            var n = await stream.ReadAsync(buffer.AsMemory(read), ct);
            if (n == 0) break;
            read += n;
        }
        var text = new UTF8Encoding(false).GetString(buffer, 0, read);
        return new FileTextDto(text, stream.Length > read);
    }

    public async Task OpenWithDefaultAppAsync(int documentId, CancellationToken ct)
    {
        var access = await GetFileAccessAsync(documentId, ct);
        opener.OpenCopy(access.File.RelativePath, access.File.OriginalName);
    }

    public async Task<OrphanCleanupDto> CleanOrphanFilesAsync(CancellationToken ct)
    {
        var referenced = (await db.DocumentFiles.AsNoTracking().Select(f => f.RelativePath).ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        int count = 0; long bytes = 0;
        foreach (var rel in storage.EnumerateAll().ToList())
        {
            if (referenced.Contains(rel)) continue;
            try { bytes += new FileInfo(storage.GetFullPath(rel)).Length; storage.Delete(rel); count++; }
            catch (Exception ex) { log.LogWarning(ex, "Không xóa được tệp mồ côi {Path}", rel); }
        }
        return new OrphanCleanupDto(count, bytes);
    }

    // ---------- helpers ----------

    private async Task ApplyFieldsAsync(Document doc, DocumentSaveRequest req, CancellationToken ct)
    {
        if (!await db.DocumentTypes.AnyAsync(t => t.Id == req.DocumentTypeId, ct))
            throw new ValidationAppException("documentTypeId", "Loại tài liệu không tồn tại.");
        doc.TopicId = await CategoryGuard.ResolveTopicAsync(db, req.GradeLevelId, req.TopicId, req.LessonId, ct);
        doc.LessonId = req.LessonId;
        doc.GradeLevelId = req.GradeLevelId;
        doc.DocumentTypeId = req.DocumentTypeId;
        doc.Title = req.Title.Trim();
        doc.Description = (req.Description ?? "").Trim();
        doc.ContentText = req.ContentText ?? "";
        doc.ProgrammingLanguage = string.IsNullOrWhiteSpace(req.ProgrammingLanguage) ? null : req.ProgrammingLanguage.Trim();
        var resolved = await tags.ResolveAsync(req.Tags, ct);
        doc.DocumentTags.RemoveAll(dt => !resolved.Contains(dt.Tag!));
        foreach (var t in resolved)
            if (!doc.DocumentTags.Any(dt => dt.Tag == t)) doc.DocumentTags.Add(new DocumentTag { Tag = t });
    }

    private static string BuildIndex(Document d) =>
        TextNormalizer.BuildIndex(d.Title, d.Description, d.ContentText, d.File?.OriginalName,
            string.Join(' ', d.DocumentTags.Select(t => t.Tag!.Name)), d.ProgrammingLanguage);

    private static string SubFolder(int typeId) => (DocumentTypeKind)typeId switch
    {
        DocumentTypeKind.SourceCode => "code",
        DocumentTypeKind.Exercise => "exercises",
        _ => "documents"
    };

    private Task<StoredFile> SaveToStorageAsync(UploadedFile upload, int typeId, CancellationToken ct) =>
        storage.SaveAsync(upload.Content, upload.FileName, SubFolder(typeId), FileTypes.MaxFileSizeBytes, ct);

    private static DocumentFile NewFile(StoredFile s, string originalName) { var f = new DocumentFile(); Fill(f, s, originalName); return f; }

    private static void Fill(DocumentFile f, StoredFile s, string originalName)
    {
        var safeName = Path.GetFileName(originalName);
        var ext = FileTypes.ExtensionOf(safeName);
        f.StoredName = s.StoredName; f.RelativePath = s.RelativePath; f.OriginalName = safeName; f.Extension = ext;
        f.MimeType = FileTypes.MimeOf(ext); f.SizeBytes = s.SizeBytes; f.UploadedAt = DateTime.UtcNow;
    }

    private void TryDelete(string? rel)
    {
        if (string.IsNullOrEmpty(rel)) return;
        try { storage.Delete(rel); }
        catch (Exception ex) { log.LogWarning(ex, "Không xóa được tệp {Path}; có thể dọn bằng chức năng 'Dọn tệp mồ côi'.", rel); }
    }
}
