using GiaoAn.Application;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;
using GiaoAn.Infrastructure;
using GiaoAn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace GiaoAn.Application.Tests;

public sealed class TestHost : IAsyncDisposable
{
    public string Root { get; } = Path.Combine(Path.GetTempPath(), "giaoan-test-" + Guid.NewGuid().ToString("N"));
    public ServiceProvider Provider { get; }
    public TestHost()
    {
        var s = new ServiceCollection();
        s.AddLogging();
        s.AddInfrastructure(InfrastructureFactory()).AddApplication();
        Provider = s.BuildServiceProvider();
        using var scope = Provider.CreateScope();
        DbInitializer.InitializeAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>()).GetAwaiter().GetResult();
    }
    private IAppPaths InfrastructureFactory() => GiaoAn.Infrastructure.DependencyInjection.CreatePaths(Root);
    public IAppPaths Paths => Provider.GetRequiredService<IAppPaths>();
    public async ValueTask DisposeAsync()
    {
        await Provider.DisposeAsync();
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        try { Directory.Delete(Root, true); } catch { }
    }
}

public class DocumentServiceTests
{
    private static DocumentSaveRequest Req(string title, params string[] tags) =>
        new() { Title = title, DocumentTypeId = 1, GradeLevelId = 10, Tags = tags.ToList() };

    private static UploadedFile Upload(string name, string content)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        return new UploadedFile(new MemoryStream(bytes), name, bytes.Length);
    }

    [Fact]
    public async Task Search_FindsVietnameseWithAndWithoutDiacritics()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IDocumentService>();
        await svc.CreateAsync(Req("Vòng lặp trong Python", "Python"), null, default);
        await svc.CreateAsync(Req("Bài tập về vòng lặp"), null, default);
        await svc.CreateAsync(Req("Giáo án cấu trúc lặp"), null, default);
        await svc.CreateAsync(Req("Mạng máy tính"), null, default);

        var r = await svc.QueryAsync(new DocumentQuery { Q = "vong lap" }, default);
        Assert.Equal(3, r.Total);
        Assert.DoesNotContain(r.Items, i => i.Title == "Mạng máy tính");
        var r2 = await svc.QueryAsync(new DocumentQuery { Q = "VÒNG LẶP" }, default);
        Assert.Equal(3, r2.Total);
        Assert.Equal(r.Items.First().Id, r2.Items.First().Id); // cùng xếp hạng
    }

    [Fact]
    public async Task Search_CoversContentFileNameAndTags()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IDocumentService>();
        var req = Req("Tài liệu A", "Thực hành");
        req.ContentText = "Nội dung về thuật toán sắp xếp nổi bọt";
        await svc.CreateAsync(req, Upload("bai_giang_mang.txt", "x"), default);
        Assert.Equal(1, (await svc.QueryAsync(new DocumentQuery { Q = "noi bot" }, default)).Total);
        Assert.Equal(1, (await svc.QueryAsync(new DocumentQuery { Q = "bai_giang_mang" }, default)).Total);
        Assert.Equal(1, (await svc.QueryAsync(new DocumentQuery { Q = "thuc hanh" }, default)).Total);
    }

    [Fact]
    public async Task ReplaceFile_DeletesOldPhysicalFile_AndUsesGuidName()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IDocumentService>();
        var storage = scope.ServiceProvider.GetRequiredService<IFileStorage>();
        var doc = await svc.CreateAsync(Req("Có tệp"), Upload("../../evil name.txt", "một"), default);
        var oldPath = doc.File!.Id > 0 ? (await svc.GetFileAccessAsync(doc.Id, default)).File.RelativePath : "";
        Assert.True(storage.Exists(oldPath));
        Assert.DoesNotContain("evil", oldPath);

        var updated = await svc.UpdateAsync(doc.Id, Req("Có tệp"), Upload("moi.txt", "hai"), default);
        var newPath = (await svc.GetFileAccessAsync(doc.Id, default)).File.RelativePath;
        Assert.NotEqual(oldPath, newPath);
        Assert.False(storage.Exists(oldPath));
        Assert.True(storage.Exists(newPath));
        Assert.Equal("moi.txt", updated.File!.OriginalName);
        Assert.Single(storage.EnumerateAll());
    }

    [Fact]
    public async Task TrashRestorePurge_ManagesFilesAndTags()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IDocumentService>();
        var tags = scope.ServiceProvider.GetRequiredService<ITagService>();
        var storage = scope.ServiceProvider.GetRequiredService<IFileStorage>();
        var doc = await svc.CreateAsync(Req("Xóa thử", "tam"), Upload("a.txt", "x"), default);

        await svc.TrashAsync(new[] { doc.Id }, default);
        Assert.Equal(0, (await svc.QueryAsync(new DocumentQuery(), default)).Total);
        Assert.Equal(1, (await svc.QueryTrashAsync(null, 1, 20, default)).Total);
        await svc.RestoreAsync(new[] { doc.Id }, default);
        Assert.Equal(1, (await svc.QueryAsync(new DocumentQuery(), default)).Total);

        await Assert.ThrowsAsync<NotFoundException>(() => svc.PurgeAsync(new[] { doc.Id }, default)); // chưa nằm trong thùng rác
        await svc.TrashAsync(new[] { doc.Id }, default);
        await svc.PurgeAsync(new[] { doc.Id }, default);
        Assert.Empty(storage.EnumerateAll());
        Assert.Empty(await tags.ListAsync(default));
    }

    [Fact]
    public async Task Upload_RejectsBlockedAndUnknownExtensions()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IDocumentService>();
        await Assert.ThrowsAsync<ValidationAppException>(() => svc.CreateAsync(Req("x"), Upload("virus.exe", "MZ"), default));
        await Assert.ThrowsAsync<ValidationAppException>(() => svc.CreateAsync(Req("x"), Upload("data.xyz", "1"), default));
        await Assert.ThrowsAsync<ValidationAppException>(() => svc.CreateAsync(new DocumentSaveRequest { Title = "", DocumentTypeId = 1 }, null, default));
    }

    [Fact]
    public async Task Tags_AreCaseInsensitiveAndCleanedUp()
    {
        await using var host = new TestHost();
        using var scope = host.Provider.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IDocumentService>();
        var tags = scope.ServiceProvider.GetRequiredService<ITagService>();
        var a = await svc.CreateAsync(Req("A", "Python, python ,  Vòng lặp"), null, default);
        Assert.Equal(2, a.Tags.Count);
        await svc.UpdateAsync(a.Id, Req("A", "Python"), null, default);
        var list = await tags.ListAsync(default);
        Assert.Single(list);
        Assert.Equal("Python", list[0].Name);
    }

    [Fact]
    public async Task Backup_CreateValidateRestoreRoundTrip()
    {
        await using var host = new TestHost();
        string zip;
        int id;
        using (var scope = host.Provider.CreateScope())
        {
            var svc = scope.ServiceProvider.GetRequiredService<IDocumentService>();
            var doc = await svc.CreateAsync(Req("Tài liệu sao lưu"), Upload("a.txt", "noi dung"), default);
            id = doc.Id;
            var backup = scope.ServiceProvider.GetRequiredService<IBackupService>();
            zip = (await backup.CreateAsync(null, default)).FilePath;
            Assert.True((await backup.ValidateAsync(zip, default)).Valid);
            await svc.TrashAsync(new[] { id }, default);
            await svc.PurgeAsync(new[] { id }, default);
            Assert.Empty(scope.ServiceProvider.GetRequiredService<IFileStorage>().EnumerateAll());
        }
        using (var scope = host.Provider.CreateScope())
        {
            var backup = scope.ServiceProvider.GetRequiredService<IBackupService>();
            await Assert.ThrowsAsync<ValidationAppException>(() => backup.RestoreAsync(zip, false, default));
            await backup.RestoreAsync(zip, true, default);
        }
        using (var scope = host.Provider.CreateScope())
        {
            var svc = scope.ServiceProvider.GetRequiredService<IDocumentService>();
            var restored = await svc.GetAsync(id, false, default);
            Assert.Equal("Tài liệu sao lưu", restored.Title);
            Assert.True(restored.File!.Exists);
        }
    }
}
