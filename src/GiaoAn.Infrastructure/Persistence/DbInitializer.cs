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

        await EnsureExamColumnsAndTablesAsync(db, ct);
    }

    private static async Task EnsureExamColumnsAndTablesAsync(AppDbContext db, CancellationToken ct)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS ""ExamMatrixTemplates"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_ExamMatrixTemplates"" PRIMARY KEY AUTOINCREMENT,
                    ""Name"" TEXT NOT NULL,
                    ""GradeLevelId"" INTEGER NULL,
                    ""DurationMinutes"" INTEGER NOT NULL DEFAULT 45,
                    ""TotalScore"" REAL NOT NULL DEFAULT 10.0,
                    ""HeaderSchool"" TEXT NOT NULL DEFAULT '',
                    ""HeaderExamName"" TEXT NOT NULL DEFAULT '',
                    ""MatrixDataJson"" TEXT NOT NULL DEFAULT '[]',
                    ""CreatedAt"" TEXT NOT NULL,
                    ""UpdatedAt"" TEXT NOT NULL,
                    CONSTRAINT ""FK_ExamMatrixTemplates_GradeLevels_GradeLevelId"" FOREIGN KEY (""GradeLevelId"") REFERENCES ""GradeLevels"" (""Id"") ON DELETE SET NULL
                );", ct);

            var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var command = db.Database.GetDbConnection().CreateCommand())
            {
                command.CommandText = "PRAGMA table_info(\"Exercises\");";
                if (db.Database.GetDbConnection().State != System.Data.ConnectionState.Open)
                    await db.Database.OpenConnectionAsync(ct);
                using var reader = await command.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    columns.Add(reader.GetString(1));
                }
            }

            if (!columns.Contains("ExerciseType"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Exercises\" ADD COLUMN \"ExerciseType\" INTEGER NOT NULL DEFAULT 1;", ct);
            if (!columns.Contains("OptionA"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Exercises\" ADD COLUMN \"OptionA\" TEXT NULL;", ct);
            if (!columns.Contains("OptionB"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Exercises\" ADD COLUMN \"OptionB\" TEXT NULL;", ct);
            if (!columns.Contains("OptionC"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Exercises\" ADD COLUMN \"OptionC\" TEXT NULL;", ct);
            if (!columns.Contains("OptionD"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Exercises\" ADD COLUMN \"OptionD\" TEXT NULL;", ct);
            if (!columns.Contains("CorrectAnswer"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Exercises\" ADD COLUMN \"CorrectAnswer\" TEXT NULL;", ct);
        }
        catch
        {
            // Bỏ qua nếu có lỗi ngoại lệ không nghiêm trọng
        }
    }
}
