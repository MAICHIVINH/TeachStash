using System.Text.Json;
using GiaoAn.Application.Common;
using GiaoAn.Application.DTOs;
using GiaoAn.Application.Interfaces;

namespace GiaoAn.Server.Extensions;

public static class RequestExtensions
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>Đọc multipart: trường "data" (JSON) và tệp tùy chọn "file".</summary>
    public static async Task<(DocumentSaveRequest Request, UploadedFile? Upload, Stream? Stream)> ReadDocumentFormAsync(this HttpRequest req, CancellationToken ct)
    {
        if (!req.HasFormContentType) throw new ValidationAppException("form", "Yêu cầu phải ở dạng multipart/form-data.");
        var form = await req.ReadFormAsync(ct);
        var data = form["data"].ToString();
        if (string.IsNullOrWhiteSpace(data)) throw new ValidationAppException("data", "Thiếu dữ liệu tài liệu.");
        DocumentSaveRequest save;
        try { save = JsonSerializer.Deserialize<DocumentSaveRequest>(data, Json) ?? throw new JsonException(); }
        catch (JsonException) { throw new ValidationAppException("data", "Dữ liệu tài liệu không hợp lệ."); }
        var file = form.Files.GetFile("file");
        if (file == null || file.Length == 0) return (save, null, null);
        var stream = file.OpenReadStream();
        return (save, new UploadedFile(stream, file.FileName, file.Length), stream);
    }
}
