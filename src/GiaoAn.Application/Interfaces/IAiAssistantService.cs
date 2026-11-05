using GiaoAn.Application.DTOs;

namespace GiaoAn.Application.Interfaces;

public interface IAiAssistantService
{
    Task<AiSettingsDto> GetSettingsAsync(CancellationToken ct = default);
    Task<List<AiModelOptionDto>> GetAvailableModelsAsync(string? apiKey = null, CancellationToken ct = default);
    Task<AiSettingsDto> SaveSettingsAsync(AiSettingsUpdateRequest req, CancellationToken ct = default);
    Task<bool> TestConnectionAsync(AiTestConnectionRequest req, CancellationToken ct = default);
    Task<List<GeneratedMcqItemDto>> GenerateMcqAsync(GenerateMcqRequest req, CancellationToken ct = default);
    Task<List<GeneratedTestcaseItemDto>> GenerateTestcasesAsync(GenerateTestcasesRequest req, CancellationToken ct = default);
    Task<GenerateLessonObjectivesResponse> GenerateLessonObjectivesAsync(GenerateLessonObjectivesRequest req, CancellationToken ct = default);
    Task<int> SaveGeneratedExercisesAsync(SaveGeneratedExercisesRequest req, CancellationToken ct = default);
}

