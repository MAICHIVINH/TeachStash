using GiaoAn.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Infrastructure.Persistence;

public static class DbInitializer
{
    public static readonly string[] TypeNames =
        { "Giáo án", "Bài giảng", "Bài tập", "Đề kiểm tra", "Mã nguồn", "Tài liệu tham khảo", "Phiếu học tập", "Tài liệu khác" };

    public static async Task InitializeAsync(AppDbContext db, CancellationToken ct = default)
    {
        // Có migration thì dùng migration; chưa tạo migration thì tạo schema trực tiếp từ model.
        if (db.Database.GetMigrations().Any()) await db.Database.MigrateAsync(ct);
        else await db.Database.EnsureCreatedAsync(ct);

        if (!await db.DocumentTypes.AnyAsync(ct))
            for (var i = 0; i < TypeNames.Length; i++)
                db.DocumentTypes.Add(new DocumentType { Id = i + 1, Name = TypeNames[i], SortOrder = i + 1 });
        if (!await db.GradeLevels.AnyAsync(ct))
            foreach (var g in new[] { 10, 11, 12 }) db.GradeLevels.Add(new GradeLevel { Id = g, Name = $"Lớp {g}" });
        await db.SaveChangesAsync(ct);
    }
}
