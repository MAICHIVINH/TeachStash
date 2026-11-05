using GiaoAn.Application.Interfaces;
using GiaoAn.Infrastructure.FileStorage;
using GiaoAn.Infrastructure.Persistence;
using GiaoAn.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace GiaoAn.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection s, IAppPaths paths)
    {
        s.AddSingleton(paths);
        var cs = new SqliteConnectionStringBuilder
        {
            DataSource = paths.DbPath,
            DefaultTimeout = 30,
            Mode = SqliteOpenMode.ReadWriteCreate
        }.ToString();
        s.AddDbContext<AppDbContext>(o => o.UseSqlite(cs));
        s.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        s.AddSingleton<IFileStorage, LocalFileStorage>();
        s.AddSingleton<IFileOpener, ShellFileOpener>();
        s.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        s.AddSingleton<ISessionStore, InMemorySessionStore>();
        s.AddScoped<IBackupService, BackupService>();
        s.AddScoped<IGoogleDriveService, GoogleDriveService>();
        s.AddSingleton<ILoggerProvider>(new FileLoggerProvider(paths.LogsRoot));
        return s;
    }

    public static IAppPaths CreatePaths(string dataRoot) => new AppPaths(dataRoot);
}
