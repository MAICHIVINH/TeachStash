namespace GiaoAn.Application.DTOs;

public record AiSettingsDto(
    bool HasKey,
    string? MaskedKey,
    string CurrentModel
);

public record AiModelOptionDto(
    string Id,
    string DisplayName,
    string Description
);

public class AiSettingsUpdateRequest
{
    public string? ApiKey { get; set; }
    public string? Model { get; set; }
}

public class AiTestConnectionRequest
{
    public string? ApiKey { get; set; }
    public string? Model { get; set; }
}

public class GenerateMcqRequest
{
    public string Text { get; set; } = "";
    public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; }
    public int Count { get; set; } = 4;
}

public record GeneratedMcqItemDto(
    string Statement,
    int Difficulty, // 1: Nhận biết, 2: Thông hiểu, 3: Vận dụng, 4: Vận dụng cao
    string DifficultyName,
    string OptionA,
    string OptionB,
    string OptionC,
    string OptionD,
    string CorrectAnswer, // A, B, C, D
    string Solution,
    string Hint
);

public class GenerateTestcasesRequest
{
    public string Statement { get; set; } = "";
    public string? Language { get; set; } = "C++";
    public int Count { get; set; } = 5;
}

public record GeneratedTestcaseItemDto(
    int Index,
    string Input,
    string Output,
    string Explanation,
    bool IsEdgeCase
);

public class GenerateLessonObjectivesRequest
{
    public string LessonName { get; set; } = "";
    public int? GradeLevelId { get; set; }
    public string? ExtraRequirements { get; set; }
}

public record GenerateLessonObjectivesResponse(
    string ObjectivesMarkdown
);

public class SaveGeneratedExercisesRequest
{
    public int? GradeLevelId { get; set; }
    public int? TopicId { get; set; }
    public List<GeneratedMcqItemDto> Questions { get; set; } = new();
}

