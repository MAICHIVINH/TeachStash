using System.Globalization;
using System.Text;

namespace GiaoAn.Domain.Common;

/// <summary>Chuẩn hóa chuỗi để tìm kiếm: Unicode FormD, bỏ dấu, đ→d, chữ thường, gộp khoảng trắng.</summary>
public static class TextNormalizer
{
    public static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var s = input.Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(s.Length);
        var lastSpace = false;
        foreach (var c in s)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsWhiteSpace(c))
            {
                if (!lastSpace && sb.Length > 0) sb.Append(' ');
                lastSpace = true;
                continue;
            }
            lastSpace = false;
            sb.Append(char.ToLowerInvariant(c));
        }
        return sb.ToString().TrimEnd();
    }

    public static string BuildIndex(params string?[] parts) =>
        Normalize(string.Join(' ', parts.Where(p => !string.IsNullOrWhiteSpace(p))));

    public static IReadOnlyList<string> Terms(string? query) =>
        Normalize(query).Split(' ', StringSplitOptions.RemoveEmptyEntries).Distinct().Take(12).ToList();
}
