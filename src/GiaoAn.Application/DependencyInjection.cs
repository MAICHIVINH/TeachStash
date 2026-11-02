using FluentValidation;
using GiaoAn.Application.Features.Auth;
using GiaoAn.Application.Features.Categories;
using GiaoAn.Application.Features.CodeSnippets;
using GiaoAn.Application.Features.Dashboard;
using GiaoAn.Application.Features.Documents;
using GiaoAn.Application.Features.Exercises;
using GiaoAn.Application.Features.Search;
using GiaoAn.Application.Features.Tags;
using GiaoAn.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace GiaoAn.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection s)
    {
        s.AddValidatorsFromAssemblyContaining<IDocumentService>();
        s.AddScoped<ITagService, TagService>();
        s.AddScoped<ICategoryService, CategoryService>();
        s.AddScoped<IDocumentService, DocumentService>();
        s.AddScoped<IExerciseService, ExerciseService>();
        s.AddScoped<ICodeSnippetService, CodeSnippetService>();
        s.AddScoped<IDashboardService, DashboardService>();
        s.AddScoped<ISearchService, SearchService>();
        s.AddScoped<ISettingsService, SettingsService>();
        s.AddScoped<IFilePolicy, FilePolicy>();
        s.AddScoped<IAuthService, AuthService>();
        return s;
    }
}
