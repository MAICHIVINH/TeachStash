using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using GiaoAn.Server;
using Xunit;

namespace GiaoAn.Server.Tests;

public sealed class ApiFixture : IAsyncLifetime
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "giaoan-api-" + Guid.NewGuid().ToString("N"));
    private RunningServer _server = null!;
    public HttpClient Http { get; private set; } = null!;
    public Uri Address => _server.Address;

    public async Task InitializeAsync()
    {
        _server = await ServerHost.StartAsync(new ServerOptions { DataRoot = _root });
        Http = new HttpClient { BaseAddress = _server.Address };
        Http.DefaultRequestHeaders.Add("X-Requested-With", "GiaoAnTin");
    }
    public async Task DisposeAsync()
    {
        Http.Dispose();
        await _server.DisposeAsync();
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        try { Directory.Delete(_root, true); } catch { }
    }
}

public class ApiTests(ApiFixture f) : IClassFixture<ApiFixture>
{
    [Fact] public void ListensOnLoopbackOnly() => Assert.Equal("127.0.0.1", f.Address.Host);

    [Fact]
    public async Task Health_OK() => Assert.Equal(HttpStatusCode.OK, (await f.Http.GetAsync("/api/health")).StatusCode);

    [Fact]
    public async Task InvalidHost_IsRejected()
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        req.Headers.Host = "evil.example.com";
        Assert.Equal(HttpStatusCode.BadRequest, (await f.Http.SendAsync(req)).StatusCode);
    }

    [Fact]
    public async Task Post_WithoutCustomHeader_IsForbidden()
    {
        using var raw = new HttpClient { BaseAddress = f.Address };
        var res = await raw.PostAsJsonAsync("/api/tags", new { });
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Post_WithForeignOrigin_IsForbidden()
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/documents/trash") { Content = JsonContent.Create(new { ids = new[] { 1 } }) };
        req.Headers.Add("Origin", "https://evil.example.com");
        Assert.Equal(HttpStatusCode.Forbidden, (await f.Http.SendAsync(req)).StatusCode);
    }

    [Fact]
    public async Task Document_CreateUploadSearchDownloadDelete()
    {
        var data = JsonSerializer.Serialize(new { title = "Giáo án vòng lặp", documentTypeId = 1, gradeLevelId = 10, tags = new[] { "Python", "Lớp 10" } });
        var form = new MultipartFormDataContent
        {
            { new StringContent(data, Encoding.UTF8), "data" },
            { new ByteArrayContent(Encoding.UTF8.GetBytes("print('xin chao')")) { Headers = { ContentType = new("text/plain") } }, "file", "demo.py" }
        };
        var create = await f.Http.PostAsync("/api/documents", form);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var doc = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = doc.GetProperty("id").GetInt32();

        var search = await f.Http.GetFromJsonAsync<JsonElement>("/api/documents?q=vong%20lap");
        Assert.Equal(1, search.GetProperty("total").GetInt32());

        var dl = await f.Http.GetAsync($"/api/documents/{id}/file/download");
        Assert.Equal("print('xin chao')", await dl.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.NoContent, (await f.Http.PostAsJsonAsync("/api/documents/trash", new { ids = new[] { id } })).StatusCode);
        Assert.Equal(0, (await f.Http.GetFromJsonAsync<JsonElement>("/api/documents")).GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task Validation_ReturnsVietnameseErrors()
    {
        var form = new MultipartFormDataContent { { new StringContent("{\"title\":\"\",\"documentTypeId\":1}", Encoding.UTF8), "data" } };
        var res = await f.Http.PostAsync("/api/documents", form);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("tiêu đề", await res.Content.ReadAsStringAsync());
    }
}
