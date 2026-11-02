namespace GiaoAn.Domain.ValueObjects;

/// <summary>Tên thẻ đã chuẩn hóa. Key không phân biệt hoa/thường; Display giữ cách viết đầu tiên.</summary>
public sealed record TagName(string Display, string Key)
{
    public const int MaxLength = 50;

    public static TagName? TryCreate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var display = string.Join(' ', raw.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (display.Length > MaxLength) display = display[..MaxLength];
        return new TagName(display, display.ToLowerInvariant());
    }

    /// <summary>Nhận nhiều chuỗi (mỗi chuỗi có thể chứa nhiều thẻ cách nhau bằng dấu phẩy), loại trùng.</summary>
    public static IReadOnlyList<TagName> ParseMany(IEnumerable<string>? inputs)
    {
        var result = new List<TagName>();
        var seen = new HashSet<string>();
        foreach (var input in inputs ?? Array.Empty<string>())
            foreach (var part in (input ?? "").Split(new[] { ',', ';' }))
            {
                var t = TryCreate(part);
                if (t != null && seen.Add(t.Key)) result.Add(t);
            }
        return result;
    }
}
