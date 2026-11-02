using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;

namespace GiaoAn.Application.Features.Search;

/// <summary>Tìm kiếm tổng hợp trên tài liệu, bài tập và mã nguồn (dùng cho ô tìm kiếm nhanh).</summary>
public sealed class SearchService(IDocumentService documents, IExerciseService exercises, ICodeSnippetService snippets) : ISearchService
{
    public async Task<SearchResultDto> SearchAsync(string? q, int take, CancellationToken ct)
    {
        take = Math.Clamp(take, 1, 50);
        var d = await documents.QueryAsync(new DocumentQuery { Q = q, PageSize = take }, ct);
        var e = await exercises.QueryAsync(new ExerciseQuery { Q = q, PageSize = take }, ct);
        var s = await snippets.QueryAsync(new SnippetQuery { Q = q, PageSize = take }, ct);
        return new SearchResultDto(q ?? "", d.Items, d.Total, e.Items, e.Total, s.Items, s.Total);
    }
}
