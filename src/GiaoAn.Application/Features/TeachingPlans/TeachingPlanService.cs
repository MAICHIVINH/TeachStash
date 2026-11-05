using System.Text.Json;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using GiaoAn.Domain.Entities;
using GiaoAn.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.TeachingPlans;

public sealed class TeachingPlanService(IAppDbContext db) : ITeachingPlanService
{
    // ==================== KHUNG PPCT ====================

    public async Task<IReadOnlyList<TeachingPlanItemDto>> GetPlanItemsAsync(int? gradeLevelId, CancellationToken ct)
    {
        var query = db.TeachingPlanItems
            .AsNoTracking()
            .Include(x => x.Topic)
            .Include(x => x.Lesson)
            .AsQueryable();

        if (gradeLevelId.HasValue && gradeLevelId.Value > 0)
        {
            query = query.Where(x => x.GradeLevelId == gradeLevelId.Value);
        }

        var items = await query
            .OrderBy(x => x.GradeLevelId)
            .ThenBy(x => x.WeekNumber)
            .ThenBy(x => x.PeriodNumber)
            .ThenBy(x => x.SortOrder)
            .ToListAsync(ct);

        return items.Select(Mapper.ToDto).ToList();
    }

    public async Task<int> GenerateFromLessonsAsync(int gradeLevelId, CancellationToken ct)
    {
        // Lấy danh sách các chủ đề và bài học thuộc khối lớp này
        var topics = await db.Topics
            .AsNoTracking()
            .Include(t => t.Lessons)
            .Where(t => t.GradeLevelId == gradeLevelId)
            .OrderBy(t => t.SortOrder)
            .ToListAsync(ct);

        if (topics.Count == 0) return 0;

        // Xóa khung cũ nếu người dùng muốn khởi tạo lại
        var existing = await db.TeachingPlanItems.Where(x => x.GradeLevelId == gradeLevelId).ToListAsync(ct);
        if (existing.Count > 0)
        {
            db.TeachingPlanItems.RemoveRange(existing);
        }

        var newItems = new List<TeachingPlanItem>();
        int period = 1;
        int week = 1;

        foreach (var topic in topics)
        {
            var lessons = topic.Lessons.OrderBy(l => l.SortOrder).ToList();
            if (lessons.Count == 0)
            {
                newItems.Add(new TeachingPlanItem
                {
                    GradeLevelId = gradeLevelId,
                    WeekNumber = week,
                    PeriodNumber = period,
                    PeriodName = $"{period}, {period + 1}",
                    Title = topic.Name,
                    NumberOfPeriods = "2LT",
                    Equipment = "SGK, SGV, Máy tính nối mạng, tivi, các clip minh họa.",
                    Location = "Phòng học/Phòng máy",
                    TopicId = topic.Id,
                    LessonId = null,
                    SortOrder = period,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                period += 2;
                week = Math.Min(35, week + 1);
            }
            else
            {
                foreach (var lesson in lessons)
                {
                    bool isThucHanh = lesson.Name.Contains("thực hành", StringComparison.OrdinalIgnoreCase);
                    newItems.Add(new TeachingPlanItem
                    {
                        GradeLevelId = gradeLevelId,
                        WeekNumber = week,
                        PeriodNumber = period,
                        PeriodName = $"{period}, {period + 1}",
                        Title = lesson.Name,
                        NumberOfPeriods = isThucHanh ? "2TH" : "2LT",
                        Equipment = isThucHanh
                            ? "SGK, SGV, Máy tính nối mạng, tivi, phòng máy."
                            : "SGK, SGV, Máy tính nối mạng, tivi, các clip minh họa.",
                        Location = "Phòng học/Phòng máy",
                        TopicId = topic.Id,
                        LessonId = lesson.Id,
                        SortOrder = period,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    period += 2;
                    week = Math.Min(35, week + 1);
                }
            }
        }

        db.TeachingPlanItems.AddRange(newItems);
        await db.SaveChangesAsync(ct);
        return newItems.Count;
    }

    public async Task<TeachingPlanItemDto> SavePlanItemAsync(int? id, TeachingPlanItemSaveRequest req, CancellationToken ct)
    {
        TeachingPlanItem entity;
        var now = DateTime.UtcNow;

        if (id.HasValue && id.Value > 0)
        {
            entity = await db.TeachingPlanItems.FirstOrDefaultAsync(x => x.Id == id.Value, ct)
                ?? throw new NotFoundException("Không tìm thấy tiết trong kế hoạch.");
        }
        else
        {
            entity = new TeachingPlanItem { CreatedAt = now };
            db.TeachingPlanItems.Add(entity);
        }

        entity.GradeLevelId = req.GradeLevelId;
        entity.WeekNumber = Math.Clamp(req.WeekNumber, 1, 52);
        entity.PeriodNumber = Math.Max(1, req.PeriodNumber);
        entity.PeriodName = !string.IsNullOrWhiteSpace(req.PeriodName) ? req.PeriodName.Trim() : $"{req.PeriodNumber}";
        entity.Title = req.Title.Trim();
        entity.NumberOfPeriods = !string.IsNullOrWhiteSpace(req.NumberOfPeriods) ? req.NumberOfPeriods.Trim() : "2LT";
        entity.Equipment = req.Equipment?.Trim() ?? "";
        entity.Location = !string.IsNullOrWhiteSpace(req.Location) ? req.Location.Trim() : "Phòng học/Phòng máy";
        entity.TopicId = req.TopicId;
        entity.LessonId = req.LessonId;
        entity.Notes = req.Notes?.Trim() ?? "";
        entity.SortOrder = req.SortOrder;
        entity.UpdatedAt = now;

        await db.SaveChangesAsync(ct);

        return Mapper.ToDto(await db.TeachingPlanItems
            .Include(x => x.Topic)
            .Include(x => x.Lesson)
            .FirstAsync(x => x.Id == entity.Id, ct));
    }

    public async Task DeletePlanItemAsync(int id, CancellationToken ct)
    {
        var entity = await db.TeachingPlanItems.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy tiết trong kế hoạch.");

        db.TeachingPlanItems.Remove(entity);
        await db.SaveChangesAsync(ct);
    }

    // ==================== LỚP HỌC ====================

    public async Task<IReadOnlyList<TeachingClassDto>> GetClassesAsync(int? gradeLevelId, CancellationToken ct)
    {
        IQueryable<TeachingClass> q = db.TeachingClasses.AsNoTracking();
        if (gradeLevelId.HasValue) q = q.Where(x => x.GradeLevelId == gradeLevelId.Value);

        var classes = await q.OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(ct);
        var result = new List<TeachingClassDto>();

        foreach (var c in classes)
        {
            var totalPeriods = await db.TeachingPlanItems.CountAsync(x => x.GradeLevelId == c.GradeLevelId, ct);
            var taughtPeriods = await db.TeachingProgresses.CountAsync(x => x.ClassId == c.Id && x.Status == TeachingStatus.Taught, ct);
            double pct = totalPeriods > 0 ? Math.Round((double)taughtPeriods * 100.0 / totalPeriods, 1) : 0.0;

            result.Add(new TeachingClassDto(
                c.Id,
                c.Name,
                c.GradeLevelId,
                c.AcademicYear,
                c.SortOrder,
                totalPeriods,
                taughtPeriods,
                pct));
        }

        return result;
    }

    public async Task<TeachingClassDto> SaveClassAsync(int? id, TeachingClassSaveRequest req, CancellationToken ct)
    {
        TeachingClass entity;
        var now = DateTime.UtcNow;

        if (id.HasValue && id.Value > 0)
        {
            entity = await db.TeachingClasses.FirstOrDefaultAsync(x => x.Id == id.Value, ct)
                ?? throw new NotFoundException("Không tìm thấy lớp học.");
        }
        else
        {
            entity = new TeachingClass { CreatedAt = now };
            db.TeachingClasses.Add(entity);
        }

        entity.Name = req.Name.Trim();
        entity.GradeLevelId = req.GradeLevelId;
        entity.AcademicYear = string.IsNullOrWhiteSpace(req.AcademicYear) ? "2026-2027" : req.AcademicYear.Trim();
        entity.SortOrder = req.SortOrder;
        entity.UpdatedAt = now;

        await db.SaveChangesAsync(ct);

        var totalPeriods = await db.TeachingPlanItems.CountAsync(x => x.GradeLevelId == entity.GradeLevelId, ct);
        var taughtPeriods = await db.TeachingProgresses.CountAsync(x => x.ClassId == entity.Id && x.Status == TeachingStatus.Taught, ct);
        double pct = totalPeriods > 0 ? Math.Round((double)taughtPeriods * 100.0 / totalPeriods, 1) : 0.0;

        return new TeachingClassDto(entity.Id, entity.Name, entity.GradeLevelId, entity.AcademicYear, entity.SortOrder, totalPeriods, taughtPeriods, pct);
    }

    public async Task DeleteClassAsync(int id, CancellationToken ct)
    {
        var entity = await db.TeachingClasses.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy lớp học.");

        db.TeachingClasses.Remove(entity);
        await db.SaveChangesAsync(ct);
    }

    // ==================== TIẾN ĐỘ THEO LỚP ====================

    public async Task<IReadOnlyList<TeachingScheduleItemDto>> GetClassScheduleAsync(int classId, CancellationToken ct)
    {
        var cls = await db.TeachingClasses.AsNoTracking().FirstOrDefaultAsync(x => x.Id == classId, ct)
            ?? throw new NotFoundException("Không tìm thấy lớp học.");

        var planItems = await db.TeachingPlanItems
            .AsNoTracking()
            .Include(x => x.Topic)
            .Include(x => x.Lesson)
            .Where(x => x.GradeLevelId == cls.GradeLevelId)
            .OrderBy(x => x.WeekNumber)
            .ThenBy(x => x.PeriodNumber)
            .ThenBy(x => x.SortOrder)
            .ToListAsync(ct);

        var progresses = await db.TeachingProgresses
            .AsNoTracking()
            .Where(x => x.ClassId == classId)
            .ToDictionaryAsync(x => x.PlanItemId, ct);

        // Lấy toàn bộ tài liệu active của khối lớp để kết nối nhanh
        var docs = await db.Documents
            .AsNoTracking()
            .Include(d => d.DocumentType)
            .Include(d => d.File)
            .Where(d => !d.IsDeleted && d.GradeLevelId == cls.GradeLevelId)
            .ToListAsync(ct);

        var result = new List<TeachingScheduleItemDto>();

        foreach (var item in planItems)
        {
            progresses.TryGetValue(item.Id, out var prog);

            // Tìm tài liệu tự động theo LessonId hoặc TopicId
            var linkedDocs = new List<DocumentBriefDto>();

            var matchedDocs = docs.Where(d =>
                (item.LessonId.HasValue && d.LessonId == item.LessonId.Value) ||
                (!item.LessonId.HasValue && item.TopicId.HasValue && d.TopicId == item.TopicId.Value)
            ).Take(4).Select(Mapper.ToBriefDto);

            linkedDocs.AddRange(matchedDocs);

            // Tìm thêm tài liệu ghim thủ công
            var customIds = new List<int>();
            if (prog != null && !string.IsNullOrWhiteSpace(prog.CustomDocumentIdsJson))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<List<int>>(prog.CustomDocumentIdsJson);
                    if (parsed != null)
                    {
                        customIds = parsed;
                        var customDocs = docs.Where(d => customIds.Contains(d.Id) && !linkedDocs.Any(ld => ld.Id == d.Id))
                            .Select(Mapper.ToBriefDto);
                        linkedDocs.AddRange(customDocs);
                    }
                }
                catch { /* ignore */ }
            }

            result.Add(new TeachingScheduleItemDto(
                item.Id,
                item.WeekNumber,
                item.PeriodNumber,
                !string.IsNullOrWhiteSpace(item.PeriodName) ? item.PeriodName : $"{item.PeriodNumber}",
                item.Title,
                !string.IsNullOrWhiteSpace(item.NumberOfPeriods) ? item.NumberOfPeriods : "2LT",
                item.Equipment ?? "",
                !string.IsNullOrWhiteSpace(item.Location) ? item.Location : "Phòng học/Phòng máy",
                item.Notes,
                item.TopicId,
                item.Topic?.Name,
                item.LessonId,
                item.Lesson?.Name,
                prog != null ? (int)prog.Status : 0,
                prog?.ActualDate,
                prog?.TeacherNotes ?? "",
                linkedDocs,
                customIds
            ));
        }

        return result;
    }

    public async Task<TeachingScheduleItemDto> ToggleStatusAsync(int classId, int planItemId, CancellationToken ct)
    {
        var prog = await db.TeachingProgresses.FirstOrDefaultAsync(x => x.ClassId == classId && x.PlanItemId == planItemId, ct);

        if (prog == null)
        {
            prog = new TeachingProgress
            {
                ClassId = classId,
                PlanItemId = planItemId,
                Status = TeachingStatus.Taught,
                ActualDate = DateTime.Today,
                UpdatedAt = DateTime.UtcNow
            };
            db.TeachingProgresses.Add(prog);
        }
        else
        {
            if (prog.Status == TeachingStatus.Taught)
            {
                prog.Status = TeachingStatus.Untaught;
            }
            else
            {
                prog.Status = TeachingStatus.Taught;
                if (!prog.ActualDate.HasValue) prog.ActualDate = DateTime.Today;
            }
            prog.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        var list = await GetClassScheduleAsync(classId, ct);
        return list.First(x => x.PlanItemId == planItemId);
    }

    public async Task<TeachingScheduleItemDto> UpdateProgressAsync(int classId, int planItemId, UpdateProgressRequest req, CancellationToken ct)
    {
        var prog = await db.TeachingProgresses.FirstOrDefaultAsync(x => x.ClassId == classId && x.PlanItemId == planItemId, ct);

        if (prog == null)
        {
            prog = new TeachingProgress
            {
                ClassId = classId,
                PlanItemId = planItemId,
                Status = (TeachingStatus)req.Status,
                ActualDate = req.ActualDate,
                TeacherNotes = req.TeacherNotes?.Trim() ?? "",
                CustomDocumentIdsJson = req.CustomDocIds != null ? JsonSerializer.Serialize(req.CustomDocIds) : "[]",
                UpdatedAt = DateTime.UtcNow
            };
            db.TeachingProgresses.Add(prog);
        }
        else
        {
            prog.Status = (TeachingStatus)req.Status;
            prog.ActualDate = req.ActualDate;
            prog.TeacherNotes = req.TeacherNotes?.Trim() ?? "";
            if (req.CustomDocIds != null)
            {
                prog.CustomDocumentIdsJson = JsonSerializer.Serialize(req.CustomDocIds);
            }
            prog.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        var list = await GetClassScheduleAsync(classId, ct);
        return list.First(x => x.PlanItemId == planItemId);
    }
}
