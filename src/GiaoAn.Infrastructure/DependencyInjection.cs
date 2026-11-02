using GiaoAn.Application.Interfaces;
using GiaoAn.Infrastructure.FileStorage;
using GiaoAn.Infrastructure.Persistence;
using GiaoAn.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace GiaoAn.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection s, IAppPaths paths)
    {
        s.AddSingleton(paths);
        s.AddDbContext<AppDbContext>(o => o.UseSqlite($"Data Source={paths.DbPath}"));
        s.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        s.AddSingleton<IFileStorage, LocalFileStorage>();
        s.AddSingleton<IFileOpener, ShellFileOpener>();
        s.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        s.AddSingleton<ISessionStore, InMemorySessionStore>();
        s.AddScoped<IBackupService, BackupService>();
        s.AddSingleton<ILoggerProvider>(new FileLoggerProvider(paths.LogsRoot));
        return s;
    }

    public static IAppPaths CreatePaths(string dataRoot) => new AppPaths(dataRoot);
}
