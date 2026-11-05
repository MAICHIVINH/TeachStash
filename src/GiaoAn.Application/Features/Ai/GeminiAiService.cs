using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Features.Auth;
using GiaoAn.Application.Interfaces;
using GiaoAn.Domain.Common;
using GiaoAn.Domain.Entities;
using GiaoAn.Domain.Enums;

namespace GiaoAn.Application.Features.Ai;

public sealed class GeminiAiService(ISettingsService settings, IAppDbContext db) : IAiAssistantService
{
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(90) };
    private static readonly JsonSerializerOptions _jsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private const string DefaultModel = "gemini-1.5-flash";
    private const string GeminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

    public async Task<AiSettingsDto> GetSettingsAsync(CancellationToken ct = default)
    {
        var key = await settings.GetAsync(SettingKeys.GeminiApiKey, ct);
        var model = await settings.GetAsync(SettingKeys.GeminiModel, ct);
        var hasKey = !string.IsNullOrWhiteSpace(key);
        string? masked = null;
        if (hasKey && key != null)
        {
            masked = key.Length > 8
                ? key[..4] + "..." + key[^4..]
                : "****";
        }
        return new AiSettingsDto(
            HasKey: hasKey,
            MaskedKey: masked,
            CurrentModel: string.IsNullOrWhiteSpace(model) ? DefaultModel : model
        );
    }

    public async Task<List<AiModelOptionDto>> GetAvailableModelsAsync(string? apiKey = null, CancellationToken ct = default)
    {
        var key = !string.IsNullOrWhiteSpace(apiKey)
            ? apiKey.Trim()
            : await settings.GetAsync(SettingKeys.GeminiApiKey, ct);

        if (string.IsNullOrWhiteSpace(key))
            return GetDefaultFallbackModels();

        var list = await FetchModelsFromEndpointAsync("https://generativelanguage.googleapis.com/v1beta/models", key, ct);
        if (list.Count == 0)
        {
            list = await FetchModelsFromEndpointAsync("https://generativelanguage.googleapis.com/v1/models", key, ct);
        }

        return list.Count > 0 ? list : GetDefaultFallbackModels();
    }

    public async Task<AiSettingsDto> SaveSettingsAsync(AiSettingsUpdateRequest req, CancellationToken ct = default)
    {
        if (req.ApiKey != null)
        {
            var trimmedKey = req.ApiKey.Trim();
            if (string.IsNullOrEmpty(trimmedKey))
            {
                await settings.SetAsync(SettingKeys.GeminiApiKey, null, ct);
            }
            else
            {
                await settings.SetAsync(SettingKeys.GeminiApiKey, trimmedKey, ct);
            }
        }

        if (!string.IsNullOrWhiteSpace(req.Model))
        {
            await settings.SetAsync(SettingKeys.GeminiModel, req.Model.Trim(), ct);
        }

        return await GetSettingsAsync(ct);
    }

    public async Task<bool> TestConnectionAsync(AiTestConnectionRequest req, CancellationToken ct = default)
    {
        var key = !string.IsNullOrWhiteSpace(req.ApiKey)
            ? req.ApiKey.Trim()
            : await settings.GetAsync(SettingKeys.GeminiApiKey, ct);

        if (string.IsNullOrWhiteSpace(key))
            throw new ValidationAppException("apiKey", "Chưa cấu hình Gemini API Key. Vui lòng nhập API Key để kiểm tra.");

        var model = !string.IsNullOrWhiteSpace(req.Model)
            ? req.Model.Trim()
            : (await settings.GetAsync(SettingKeys.GeminiModel, ct) ?? DefaultModel);

        var payload = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = "Trả lời đúng 1 từ: OK" } } }
            }
        };

        var res = await PostGeminiAsync(model, key, payload, ct);

        if (!res.IsSuccessStatusCode)
        {
            var errBody = await res.Content.ReadAsStringAsync(ct);
            if (res.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                var available = await GetAvailableModelsAsync(key, ct);
                var suggestions = available.Where(m => !m.Id.Contains("embedding") && !m.Id.Contains("aqa")).Take(6).Select(m => m.Id).ToList();
                var hint = suggestions.Count > 0
                    ? $" Các model khả dụng trong tài khoản của bạn: {string.Join(", ", suggestions)}."
                    : "";
                throw new ValidationAppException("model", $"Không tìm thấy model '{model}'.{hint} Vui lòng chọn một trong các model trên trong danh sách.");
            }
            throw TranslateGeminiError((int)res.StatusCode, errBody, model);
        }

        return true;
    }

    public async Task<List<GeneratedMcqItemDto>> GenerateMcqAsync(GenerateMcqRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Text))
            throw new ValidationAppException("text", "Vui lòng nhập hoặc dán nội dung văn bản kiến thức SGK.");

        var (key, model) = await GetKeyAndModelAsync(ct);

        var count = Math.Clamp(req.Count, 1, 10);
        var systemInstruction = $@"Bạn là trợ lý AI sư phạm cao cấp cho giáo viên Tin học THPT.
Nhiệm vụ của bạn là dựa VÀO ĐOẠN VĂN BẢN KIẾN THỨC ĐƯỢC CUNG CẤP, sinh đúng {count} câu hỏi trắc nghiệm khách quan 4 phương án A, B, C, D theo 4 mức độ nhận thức:
- Mức 1: Nhận biết (difficulty = 1, difficultyName = 'Nhận biết')
- Mức 2: Thông hiểu (difficulty = 2, difficultyName = 'Thông hiểu')
- Mức 3: Vận dụng (difficulty = 3, difficultyName = 'Vận dụng')
- Mức 4: Vận dụng cao (difficulty = 4, difficultyName = 'Vận dụng cao')

Yêu cầu định dạng:
BẮT BUỘC trả về định dạng JSON thuần là một mảng các đối tượng (Array of objects) theo cấu trúc sau:
[
  {{
    ""statement"": ""Nội dung câu hỏi..."",
    ""difficulty"": 1,
    ""difficultyName"": ""Nhận biết"",
    ""optionA"": ""Nội dung lựa chọn A"",
    ""optionB"": ""Nội dung lựa chọn B"",
    ""optionC"": ""Nội dung lựa chọn C"",
    ""optionD"": ""Nội dung lựa chọn D"",
    ""correctAnswer"": ""A"",
    ""solution"": ""Giải thích chi tiết vì sao đáp án đúng..."",
    ""hint"": ""Gợi ý ngắn gọn phương pháp suy luận...""
  }}
]";

        var userPrompt = $"Dưới đây là đoạn văn bản kiến thức SGK Tin học:\n---\n{req.Text.Trim()}\n---\nHãy tạo {count} câu hỏi trắc nghiệm theo đúng yêu cầu JSON trên.";

        var rawJson = await CallGeminiAsync(key, model, userPrompt, systemInstruction, true, ct);

        try
        {
            // Trích xuất JSON thuần trong trường hợp model bọc code block ```json ... ```
            var cleanedJson = ExtractJsonString(rawJson);
            var items = JsonSerializer.Deserialize<List<GeneratedMcqItemDto>>(cleanedJson, _jsonOpts);
            if (items == null || items.Count == 0)
                throw new Exception("Không đọc được dữ liệu câu hỏi từ phản hồi của Gemini.");

            return items;
        }
        catch (Exception ex)
        {
            throw new ValidationAppException("ai", $"Lỗi xử lý kết quả câu hỏi từ AI: {ex.Message}. Nội dung nhận được: {Truncate(rawJson, 200)}");
        }
    }

    public async Task<List<GeneratedTestcaseItemDto>> GenerateTestcasesAsync(GenerateTestcasesRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Statement))
            throw new ValidationAppException("statement", "Vui lòng nhập đề bài bài toán lập trình.");

        var (key, model) = await GetKeyAndModelAsync(ct);
        var count = Math.Clamp(req.Count, 3, 15);
        var lang = string.IsNullOrWhiteSpace(req.Language) ? "C++" : req.Language.Trim();

        var systemInstruction = $@"Bạn là giám khảo chấm thi lập trình và chuyên gia thuật toán Tin học.
Nhiệm vụ của bạn là dựa vào đề bài bài toán lập trình ({lang}), sinh đúng {count} bộ testcase Input/Output chuẩn xác để chấm bài học sinh.
Phải bao gồm:
- Các testcase cơ bản (input thông thường mẫu)
- Các testcase biên quan trọng (Edge cases: số 0, số âm, giá trị cực đại 10^9 hoặc 2^63-1, chuỗi rỗng/chỉ có dấu cách, mảng 1 phần tử, v.v.).

BẮT BUỘC trả về định dạng JSON thuần là một mảng các đối tượng:
[
  {{
    ""index"": 1,
    ""input"": ""dữ liệu đầu vào chuẩn"",
    ""output"": ""dữ liệu đầu ra mong đợi chuẩn"",
    ""explanation"": ""Mô tả trường hợp kiểm thử (ví dụ: test biên giá trị 0, số âm, v.v.)"",
    ""isEdgeCase"": false
  }}
]";

        var userPrompt = $"Đề bài lập trình ({lang}):\n---\n{req.Statement.Trim()}\n---\nHãy tạo {count} bộ testcase chuẩn theo cấu trúc JSON trên.";

        var rawJson = await CallGeminiAsync(key, model, userPrompt, systemInstruction, true, ct);

        try
        {
            var cleanedJson = ExtractJsonString(rawJson);
            var items = JsonSerializer.Deserialize<List<GeneratedTestcaseItemDto>>(cleanedJson, _jsonOpts);
            if (items == null || items.Count == 0)
                throw new Exception("Không đọc được dữ liệu testcase từ phản hồi của Gemini.");

            return items;
        }
        catch (Exception ex)
        {
            throw new ValidationAppException("ai", $"Lỗi xử lý kết quả testcase từ AI: {ex.Message}. Nội dung nhận được: {Truncate(rawJson, 200)}");
        }
    }

    public async Task<GenerateLessonObjectivesResponse> GenerateLessonObjectivesAsync(GenerateLessonObjectivesRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.LessonName))
            throw new ValidationAppException("lessonName", "Vui lòng nhập tên bài học.");

        var (key, model) = await GetKeyAndModelAsync(ct);

        var gradeInfo = req.GradeLevelId.HasValue ? $"Lớp {req.GradeLevelId}" : "THPT";
        var systemInstruction = @"Bạn là chuyên gia giáo dục cốt cán môn Tin học THPT theo chương trình GDPT 2018.
Nhiệm vụ của bạn là soạn thảo Mục tiêu bài dạy (Yêu cầu cần đạt) chuẩn theo mẫu Công văn 5512/BGDĐT-GDTrH của Bộ Giáo dục và Đào tạo.
Cấu trúc bài viết gồm 3 mục rõ ràng:
1. Về kiến thức
- Nêu rõ các kiến thức, khái niệm, kỹ năng cốt lõi học sinh nắm được sau bài học.
2. Về năng lực
- Năng lực chung: Năng lực tự chủ và tự học, năng lực giao tiếp và hợp tác, năng lực giải quyết vấn đề và sáng tạo.
- Năng lực Tin học đặc thù: Chỉ ra các năng lực thành phần phù hợp nhất (NLa: Sử dụng và quản lý các phương tiện CNTT; NLb: Ứng xử phù hợp trong môi trường số; NLc: Giải quyết vấn đề với sự hỗ trợ của CNTT; NLd: Ứng dụng CNTT trong học và tự học; NLe: Hợp tác trong môi trường số).
3. Về phẩm chất
- Nêu các phẩm chất bồi dưỡng qua bài học: Chăm chỉ, Trung thực, Trách nhiệm.

QUY TẮC ĐỊNH DẠNG BẮT BUỘC:
- KHÔNG dùng các ký hiệu Markdown như dấu thăng (#, ##, ###), dấu hoa thị in đậm (**), dấu gạch dưới (__).
- Trình bày dạng văn bản thuần túy (plain text) trang trọng, dùng số thứ tự (1., 2., 3.) và gạch đầu dòng (-) cho các ý nhỏ để giáo viên sao chép dán trực tiếp vào file Word giáo án mà không bị lẫn ký tự lạ.";

        var userPrompt = $"Bài học: {req.LessonName.Trim()} ({gradeInfo}).\n" +
            (string.IsNullOrWhiteSpace(req.ExtraRequirements) ? "" : $"Yêu cầu bổ sung của giáo viên: {req.ExtraRequirements.Trim()}\n") +
            "Hãy soạn thảo mục tiêu bài học chuẩn công văn 5512 theo đúng quy tắc trên.";

        var markdown = await CallGeminiAsync(key, model, userPrompt, systemInstruction, false, ct);
        return new GenerateLessonObjectivesResponse(FormatCleanText(markdown));
    }

    public async Task<int> SaveGeneratedExercisesAsync(SaveGeneratedExercisesRequest req, CancellationToken ct = default)
    {
        if (req.Questions == null || req.Questions.Count == 0)
            throw new ValidationAppException("questions", "Danh sách câu hỏi cần lưu đang trống.");

        var now = DateTime.UtcNow;
        var count = 0;

        foreach (var q in req.Questions)
        {
            var diff = q.Difficulty switch
            {
                1 => Difficulty.Recognize,
                2 => Difficulty.Understand,
                3 => Difficulty.Apply,
                4 => Difficulty.AdvancedApply,
                _ => Difficulty.Understand
            };

            var cleanStatement = q.Statement?.Trim() ?? "";
            var title = $"[AI] {q.DifficultyName}: " + (cleanStatement.Length > 60 ? cleanStatement[..60] + "..." : cleanStatement);

            var ex = new Exercise
            {
                Title = title,
                Statement = cleanStatement,
                ExerciseType = ExerciseType.MultipleChoice,
                OptionA = q.OptionA?.Trim(),
                OptionB = q.OptionB?.Trim(),
                OptionC = q.OptionC?.Trim(),
                OptionD = q.OptionD?.Trim(),
                CorrectAnswer = q.CorrectAnswer?.Trim().ToUpperInvariant(),
                GradeLevelId = req.GradeLevelId,
                TopicId = req.TopicId,
                Difficulty = diff,
                Hint = q.Hint?.Trim() ?? "",
                Solution = q.Solution?.Trim() ?? "",
                SampleCode = "",
                CreatedAt = now,
                UpdatedAt = now
            };

            ex.SearchIndex = TextNormalizer.BuildIndex(
                ex.Title, ex.Statement,
                ex.OptionA, ex.OptionB, ex.OptionC, ex.OptionD,
                ex.Hint, ex.Solution
            );

            db.Exercises.Add(ex);
            count++;
        }

        await db.SaveChangesAsync(ct);
        return count;
    }

    private async Task<(string Key, string Model)> GetKeyAndModelAsync(CancellationToken ct)
    {
        var key = await settings.GetAsync(SettingKeys.GeminiApiKey, ct);
        if (string.IsNullOrWhiteSpace(key))
            throw new ValidationAppException("apiKey", "Chưa cấu hình Gemini API Key. Vui lòng mở Trợ lý AI và nhập API Key cá nhân từ Google AI Studio.");

        var model = await settings.GetAsync(SettingKeys.GeminiModel, ct);
        return (key.Trim(), string.IsNullOrWhiteSpace(model) ? DefaultModel : model.Trim());
    }

    private static async Task<string> CallGeminiAsync(
        string key,
        string model,
        string userPrompt,
        string systemInstruction,
        bool jsonOutput,
        CancellationToken ct)
    {
        var payload = new
        {
            systemInstruction = new
            {
                parts = new[] { new { text = systemInstruction } }
            },
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = userPrompt } }
                }
            },
            generationConfig = new
            {
                temperature = 0.4,
                responseMimeType = jsonOutput ? "application/json" : "text/plain"
            }
        };

        var res = await PostGeminiAsync(model, key, payload, ct);

        if (!res.IsSuccessStatusCode)
        {
            var errBody = await res.Content.ReadAsStringAsync(ct);
            throw TranslateGeminiError((int)res.StatusCode, errBody, model);
        }

        var jsonDoc = await res.Content.ReadFromJsonAsync<JsonElement>(_jsonOpts, ct);
        try
        {
            var text = jsonDoc
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text ?? "";
        }
        catch
        {
            throw new ValidationAppException("ai", "Cấu trúc phản hồi từ Gemini API không đúng mong đợi.");
        }
    }

    private static Exception TranslateGeminiError(int statusCode, string body, string model)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("error", out var errEl))
            {
                var msg = errEl.TryGetProperty("message", out var m) ? m.GetString() : "";
                if (statusCode == 400 || statusCode == 403)
                    return new ValidationAppException("apiKey", $"Gemini API Key không hợp lệ hoặc chưa được cấp quyền ({msg}). Vui lòng kiểm tra lại trên Google AI Studio.");
                if (statusCode == 404)
                    return new ValidationAppException("model", $"Không tìm thấy model '{model}' ({msg}). Hãy kiểm tra lại tên model trong cài đặt.");
                if (statusCode == 429)
                    return new ValidationAppException("quota", "Đã đạt giới hạn số lượng gọi (Rate Limit / Quota Exceeded) của Gemini API. Hãy thử lại sau vài giây hoặc chuyển sang model khác.");

                return new ValidationAppException("gemini", $"Lỗi từ Google Gemini ({statusCode}): {msg}");
            }
        }
        catch
        {
            // Fallback nếu không parse được json lỗi
        }

        return new ValidationAppException("gemini", $"Lỗi khi gọi Gemini API (HTTP {statusCode}): {Truncate(body, 200)}");
    }

    private static string ExtractJsonString(string raw)
    {
        var text = raw.Trim();
        if (text.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            text = text[7..];
        }
        else if (text.StartsWith("```"))
        {
            text = text[3..];
        }

        if (text.EndsWith("```"))
        {
            text = text[..^3];
        }

        return text.Trim();
    }

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s[..max] + "...";

    private static string FormatCleanText(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "";

        var lines = raw.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
        var cleaned = new List<string>();

        foreach (var line in lines)
        {
            var l = line.Trim();
            // Xóa các tiêu đề markdown #, ##, ###, #### ở đầu dòng
            while (l.StartsWith("#"))
            {
                l = l.TrimStart('#').TrimStart();
            }

            // Đổi dấu * hoặc + ở đầu dòng thành dấu gạch ngang -
            if (l.StartsWith("* "))
            {
                l = "- " + l[2..].TrimStart();
            }
            else if (l.StartsWith("+ "))
            {
                l = "- " + l[2..].TrimStart();
            }

            // Xóa in đậm **text** hoặc __text__
            l = l.Replace("**", "");
            l = l.Replace("__", "");

            cleaned.Add(l);
        }

        var result = string.Join("\r\n", cleaned);
        while (result.Contains("\r\n\r\n\r\n"))
        {
            result = result.Replace("\r\n\r\n\r\n", "\r\n\r\n");
        }

        return result.Trim();
    }

    private static async Task<HttpResponseMessage> PostGeminiAsync(string model, string key, object payload, CancellationToken ct)
    {
        // 1. Thử gọi qua endpoint v1beta
        var urlBeta = $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(model)}:generateContent?key={Uri.EscapeDataString(key)}";
        HttpResponseMessage res;
        try
        {
            res = await _http.PostAsJsonAsync(urlBeta, payload, _jsonOpts, ct);
        }
        catch (Exception ex)
        {
            throw new ValidationAppException("network", $"Không thể kết nối đến máy chủ Gemini API: {ex.Message}");
        }

        // 2. Nếu v1beta báo 404 (model not found), thử qua endpoint v1
        if (res.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            var urlV1 = $"https://generativelanguage.googleapis.com/v1/models/{Uri.EscapeDataString(model)}:generateContent?key={Uri.EscapeDataString(key)}";
            try
            {
                var resV1 = await _http.PostAsJsonAsync(urlV1, payload, _jsonOpts, ct);
                if (resV1.IsSuccessStatusCode || resV1.StatusCode != System.Net.HttpStatusCode.NotFound)
                {
                    return resV1;
                }
            }
            catch
            {
                // Giữ res ban đầu
            }
        }

        return res;
    }

    private static async Task<List<AiModelOptionDto>> FetchModelsFromEndpointAsync(string endpoint, string key, CancellationToken ct)
    {
        var url = $"{endpoint}?key={Uri.EscapeDataString(key)}";
        var result = new List<AiModelOptionDto>();
        try
        {
            var res = await _http.GetAsync(url, ct);
            if (!res.IsSuccessStatusCode) return result;

            var json = await res.Content.ReadFromJsonAsync<JsonElement>(_jsonOpts, ct);
            if (json.TryGetProperty("models", out var arr) && arr.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in arr.EnumerateArray())
                {
                    var supportsGenerate = false;
                    if (item.TryGetProperty("supportedGenerationMethods", out var methods) && methods.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var m in methods.EnumerateArray())
                        {
                            if (m.GetString()?.Equals("generateContent", StringComparison.OrdinalIgnoreCase) == true)
                            {
                                supportsGenerate = true;
                                break;
                            }
                        }
                    }

                    if (supportsGenerate && item.TryGetProperty("name", out var nameProp))
                    {
                        var rawName = nameProp.GetString() ?? "";
                        var id = rawName.StartsWith("models/") ? rawName[7..] : rawName;
                        var displayName = item.TryGetProperty("displayName", out var dn) ? dn.GetString() : id;
                        var desc = item.TryGetProperty("description", out var d) ? d.GetString() : "";
                        result.Add(new AiModelOptionDto(id, displayName ?? id, desc ?? ""));
                    }
                }
            }
        }
        catch
        {
            // Bỏ qua lỗi kết nối
        }
        return result;
    }

    private static List<AiModelOptionDto> GetDefaultFallbackModels() =>
    [
        new("gemini-2.5-flash", "Gemini 2.5 Flash", "Thế hệ 2.5 cực nhanh và thông minh"),
        new("gemini-2.5-pro", "Gemini 2.5 Pro", "Thế hệ 2.5 suy luận sâu"),
        new("gemini-2.0-flash", "Gemini 2.0 Flash", "Thế hệ 2.0 đa năng"),
        new("gemini-1.5-flash", "Gemini 1.5 Flash", "Model ổn định, miễn phí hạn mức cao"),
        new("gemini-1.5-pro", "Gemini 1.5 Pro", "Ngữ cảnh lớn 2 triệu tokens")
    ];
}
