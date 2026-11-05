using GiaoAn.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Infrastructure.Persistence;

public static class DbInitializer
{
    public static readonly string[] TypeNames =
        { "Giáo án", "Bài giảng", "Bài tập", "Đề kiểm tra", "Mã nguồn", "Tài liệu tham khảo", "Phiếu học tập", "Tài liệu khác" };

    public static async Task InitializeAsync(AppDbContext db, CancellationToken ct = default)
    {
        try
        {
            // Bật chế độ WAL (Write-Ahead Logging) cho SQLite để hỗ trợ đọc/ghi đồng thời
            // và tăng thời gian chờ khóa (busy timeout) tránh lỗi "database is locked"
            await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode = 'WAL';", ct);
            await db.Database.ExecuteSqlRawAsync("PRAGMA busy_timeout = 30000;", ct);
            await db.Database.ExecuteSqlRawAsync("PRAGMA synchronous = NORMAL;", ct);
        }
        catch
        {
            // Bỏ qua nếu SQLite provider hoặc môi trường không cho phép thay đổi PRAGMA
        }

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
                );

                CREATE TABLE IF NOT EXISTS ""TeachingPlanItems"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_TeachingPlanItems"" PRIMARY KEY AUTOINCREMENT,
                    ""GradeLevelId"" INTEGER NOT NULL,
                    ""WeekNumber"" INTEGER NOT NULL,
                    ""PeriodNumber"" INTEGER NOT NULL,
                    ""Title"" TEXT NOT NULL,
                    ""TopicId"" INTEGER NULL,
                    ""LessonId"" INTEGER NULL,
                    ""Notes"" TEXT NOT NULL DEFAULT '',
                    ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
                    ""CreatedAt"" TEXT NOT NULL,
                    ""UpdatedAt"" TEXT NOT NULL,
                    CONSTRAINT ""FK_TeachingPlanItems_GradeLevels_GradeLevelId"" FOREIGN KEY (""GradeLevelId"") REFERENCES ""GradeLevels"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_TeachingPlanItems_Topics_TopicId"" FOREIGN KEY (""TopicId"") REFERENCES ""Topics"" (""Id"") ON DELETE SET NULL,
                    CONSTRAINT ""FK_TeachingPlanItems_Lessons_LessonId"" FOREIGN KEY (""LessonId"") REFERENCES ""Lessons"" (""Id"") ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS ""TeachingClasses"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_TeachingClasses"" PRIMARY KEY AUTOINCREMENT,
                    ""Name"" TEXT NOT NULL,
                    ""GradeLevelId"" INTEGER NOT NULL,
                    ""AcademicYear"" TEXT NOT NULL DEFAULT '2026-2027',
                    ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
                    ""CreatedAt"" TEXT NOT NULL,
                    ""UpdatedAt"" TEXT NOT NULL,
                    CONSTRAINT ""FK_TeachingClasses_GradeLevels_GradeLevelId"" FOREIGN KEY (""GradeLevelId"") REFERENCES ""GradeLevels"" (""Id"") ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ""TeachingProgresses"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_TeachingProgresses"" PRIMARY KEY AUTOINCREMENT,
                    ""ClassId"" INTEGER NOT NULL,
                    ""PlanItemId"" INTEGER NOT NULL,
                    ""Status"" INTEGER NOT NULL DEFAULT 0,
                    ""ActualDate"" TEXT NULL,
                    ""TeacherNotes"" TEXT NOT NULL DEFAULT '',
                    ""CustomDocumentIdsJson"" TEXT NOT NULL DEFAULT '[]',
                    ""UpdatedAt"" TEXT NOT NULL,
                    CONSTRAINT ""FK_TeachingProgresses_TeachingClasses_ClassId"" FOREIGN KEY (""ClassId"") REFERENCES ""TeachingClasses"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_TeachingProgresses_TeachingPlanItems_PlanItemId"" FOREIGN KEY (""PlanItemId"") REFERENCES ""TeachingPlanItems"" (""Id"") ON DELETE CASCADE
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

            var planColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var command = db.Database.GetDbConnection().CreateCommand())
            {
                command.CommandText = "PRAGMA table_info(\"TeachingPlanItems\");";
                using var reader = await command.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    planColumns.Add(reader.GetString(1));
                }
            }

            if (!planColumns.Contains("PeriodName"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"TeachingPlanItems\" ADD COLUMN \"PeriodName\" TEXT NOT NULL DEFAULT '';", ct);
            if (!planColumns.Contains("NumberOfPeriods"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"TeachingPlanItems\" ADD COLUMN \"NumberOfPeriods\" TEXT NOT NULL DEFAULT '';", ct);
            if (!planColumns.Contains("Equipment"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"TeachingPlanItems\" ADD COLUMN \"Equipment\" TEXT NOT NULL DEFAULT '';", ct);
            if (!planColumns.Contains("Location"))
                await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"TeachingPlanItems\" ADD COLUMN \"Location\" TEXT NOT NULL DEFAULT 'Phòng học/Phòng máy';", ct);
        }
        catch
        {
            // Bỏ qua nếu có lỗi ngoại lệ không nghiêm trọng
        }
    }
}
