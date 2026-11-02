using GiaoAn.Application.Common;
using GiaoAn.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GiaoAn.Application.Features.Categories;

internal static class CategoryGuard
{
    /// <summary>Kiểm tra khối/chủ đề/bài học tồn tại và nhất quán; trả về TopicId đã suy ra từ bài học nếu thiếu.</summary>
    public static async Task<int?> ResolveTopicAsync(IAppDbContext db, int? gradeId, int? topicId, int? lessonId, CancellationToken ct)
    {
        if (gradeId != null && !await db.GradeLevels.AnyAsync(g => g.Id == gradeId, ct))
            throw new ValidationAppException("gradeLevelId", "Khối lớp không tồn tại.");
        if (topicId != null && !await db.Topics.AnyAsync(t => t.Id == topicId, ct))
            throw new ValidationAppException("topicId", "Chủ đề không tồn tại.");
        if (lessonId != null)
        {
            var lesson = await db.Lessons.AsNoTracking().FirstOrDefaultAsync(l => l.Id == lessonId, ct)
                ?? throw new ValidationAppException("lessonId", "Bài học không tồn tại.");
            if (topicId != null && lesson.TopicId != topicId)
                throw new ValidationAppException("lessonId", "Bài học không thuộc chủ đề đã chọn.");
            topicId ??= lesson.TopicId;
        }
        return topicId;
    }
}
