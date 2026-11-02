using GiaoAn.Domain.Common;
using GiaoAn.Domain.ValueObjects;
using Xunit;

namespace GiaoAn.Domain.Tests;

public class TextNormalizerTests
{
    [Theory]
    [InlineData("Vòng lặp", "vong lap")]
    [InlineData("  ĐỀ   KIỂM TRA  ", "de kiem tra")]
    [InlineData("vong lap", "vong lap")]
    [InlineData("Cấu trúc lặp trong Python", "cau truc lap trong python")]
    public void Normalize_RemovesDiacriticsAndCase(string input, string expected) =>
        Assert.Equal(expected, TextNormalizer.Normalize(input));

    [Fact]
    public void Normalize_HandlesDecomposedUnicode() =>
        Assert.Equal("vong lap", TextNormalizer.Normalize("Vo\u0300ng la\u0323p".Normalize(System.Text.NormalizationForm.FormD)));

    [Fact]
    public void Terms_AreDistinct() => Assert.Equal(new[] { "vong", "lap" }, TextNormalizer.Terms("Vòng lặp vòng"));
}

public class TagNameTests
{
    [Fact]
    public void ParseMany_TrimsDeduplicatesCaseInsensitive()
    {
        var tags = TagName.ParseMany(new[] { " Python ,  vòng   lặp, python", "Lớp 10,," });
        Assert.Equal(new[] { "Python", "vòng lặp", "Lớp 10" }, tags.Select(t => t.Display));
    }
}
