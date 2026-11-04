using FluentValidation;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using GiaoAn.Application.Validators;
using GiaoAn.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.ExamMatrices;

public sealed class ExamMatrixTemplateService(IAppDbContext db, IValidator<ExamMatrixTemplateSaveRequest> validator) : IExamMatrixTemplateService
{
    private IQueryable<ExamMatrixTemplate> WithAll(IQueryable<ExamMatrixTemplate> q) =>
        q.Include(t => t.GradeLevel);

    public async Task<IReadOnlyList<ExamMatrixTemplateDto>> GetAllAsync(int? gradeLevelId, CancellationToken ct)
    {
        IQueryable<ExamMatrixTemplate> q = db.ExamMatrixTemplates.AsNoTracking();
        if (gradeLevelId.HasValue) q = q.Where(t => t.GradeLevelId == gradeLevelId.Value);
        var items = await WithAll(q.OrderByDescending(t => t.UpdatedAt)).ToListAsync(ct);
        return items.Select(Mapper.ToDto).ToList();
    }

    public async Task<ExamMatrixTemplateDto> GetAsync(int id, CancellationToken ct)
    {
        var item = await WithAll(db.ExamMatrixTemplates).FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy mẫu ma trận đề thi.");
        return Mapper.ToDto(item);
    }

    public async Task<ExamMatrixTemplateDto> CreateAsync(ExamMatrixTemplateSaveRequest req, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);
        var now = DateTime.UtcNow;
        var entity = new ExamMatrixTemplate
        {
            Name = req.Name.Trim(),
            GradeLevelId = req.GradeLevelId,
            DurationMinutes = req.DurationMinutes,
            TotalScore = req.TotalScore,
            HeaderSchool = req.HeaderSchool?.Trim() ?? "",
            HeaderExamName = req.HeaderExamName?.Trim() ?? "",
            MatrixDataJson = string.IsNullOrWhiteSpace(req.MatrixDataJson) ? "[]" : req.MatrixDataJson.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };
        db.ExamMatrixTemplates.Add(entity);
        await db.SaveChangesAsync(ct);
        return await GetAsync(entity.Id, ct);
    }

    public async Task<ExamMatrixTemplateDto> UpdateAsync(int id, ExamMatrixTemplateSaveRequest req, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);
        var entity = await db.ExamMatrixTemplates.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy mẫu ma trận đề thi.");
        entity.Name = req.Name.Trim();
        entity.GradeLevelId = req.GradeLevelId;
        entity.DurationMinutes = req.DurationMinutes;
        entity.TotalScore = req.TotalScore;
        entity.HeaderSchool = req.HeaderSchool?.Trim() ?? "";
        entity.HeaderExamName = req.HeaderExamName?.Trim() ?? "";
        entity.MatrixDataJson = string.IsNullOrWhiteSpace(req.MatrixDataJson) ? "[]" : req.MatrixDataJson.Trim();
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        var entity = await db.ExamMatrixTemplates.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy mẫu ma trận đề thi.");
        db.ExamMatrixTemplates.Remove(entity);
        await db.SaveChangesAsync(ct);
    }
}

