using System.Linq.Expressions;
using GiaoAn.Domain.Common;

namespace GiaoAn.Application.Common;

public sealed class SearchSpec<T>
{
    public required Expression<Func<T, bool>> Filter { get; init; }
    public required Expression<Func<T, int>> Score { get; init; }
}

public sealed class SearchTermHolder { public string Value { get; set; } = ""; }

/// <summary>
/// Xây biểu thức tìm kiếm trên cột SearchIndex đã chuẩn hóa (không dấu, chữ thường).
/// Điểm = số từ khóa khớp + thưởng nếu khớp nguyên cụm. Nhiều từ: cần khớp ít nhất (n-1) từ khi n ≥ 3, còn lại khớp ≥ 1 từ.
/// </summary>
public static class SearchScoring
{
    private static readonly System.Reflection.MethodInfo ContainsMethod =
        typeof(string).GetMethod(nameof(string.Contains), new[] { typeof(string) })!;

    public static SearchSpec<T>? Build<T>(Expression<Func<T, string>> selector, string? query)
    {
        var terms = TextNormalizer.Terms(query);
        if (terms.Count == 0) return null;
        var phrase = TextNormalizer.Normalize(query);
        var param = selector.Parameters[0];

        Expression Test(string text)
        {
            var holder = new SearchTermHolder { Value = text };
            var value = Expression.Property(Expression.Constant(holder), nameof(SearchTermHolder.Value));
            return Expression.Call(selector.Body, ContainsMethod, value);
        }
        Expression Weight(string text, int weight) =>
            Expression.Condition(Test(text), Expression.Constant(weight), Expression.Constant(0));

        Expression? sum = null;
        foreach (var t in terms)
        {
            var w = Weight(t, 1);
            sum = sum == null ? w : Expression.Add(sum, w);
        }
        var termSum = sum!;
        if (terms.Count > 1) sum = Expression.Add(termSum, Weight(phrase, terms.Count));

        var min = terms.Count >= 3 ? terms.Count - 1 : 1;
        var filter = Expression.GreaterThanOrEqual(termSum, Expression.Constant(min));
        return new SearchSpec<T>
        {
            Filter = Expression.Lambda<Func<T, bool>>(filter, param),
            Score = Expression.Lambda<Func<T, int>>(sum!, param)
        };
    }
}
