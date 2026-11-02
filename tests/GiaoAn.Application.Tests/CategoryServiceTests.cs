using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GiaoAn.Application.Tests;

public class CategoryServiceTests
{
    [Fact]
    public async Task CreateAndUpdateTopicAndLesson_ShouldSucceed()
    {
        await using var host = new TestHost();
        var catService = host.Provider.GetRequiredService<ICategoryService>();

        // 1. Tạo chủ đề mới
        var topic = await catService.SaveTopicAsync(null, new TopicSaveRequest { Name = "Chủ đề 1", GradeLevelId = 10, SortOrder = 1 }, CancellationToken.None);
        Assert.NotNull(topic);
        Assert.Equal("Chủ đề 1", topic.Name);

        // 2. Cập nhật chủ đề
        var updatedTopic = await catService.SaveTopicAsync(topic.Id, new TopicSaveRequest { Name = "Chủ đề 1 đổi tên", GradeLevelId = 10, SortOrder = 2 }, CancellationToken.None);
        Assert.Equal("Chủ đề 1 đổi tên", updatedTopic.Name);
        Assert.Equal(2, updatedTopic.SortOrder);

        // 3. Tạo bài học mới
        var lesson = await catService.SaveLessonAsync(null, new LessonSaveRequest { Name = "Bài 1: Khởi động", TopicId = topic.Id, SortOrder = 1 }, CancellationToken.None);
        Assert.NotNull(lesson);
        Assert.Equal("Bài 1: Khởi động", lesson.Name);

        // 4. Cập nhật bài học (trước đây bị lỗi InvalidOperationException tại dòng này)
        var updatedLesson = await catService.SaveLessonAsync(lesson.Id, new LessonSaveRequest { Name = "Bài 1: Khởi động (đã sửa)", TopicId = topic.Id, SortOrder = 1 }, CancellationToken.None);
        Assert.Equal("Bài 1: Khởi động (đã sửa)", updatedLesson.Name);
    }
}
