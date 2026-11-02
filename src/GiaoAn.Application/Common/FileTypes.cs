namespace GiaoAn.Application.Common;

public static class FileTypes
{
    public const long MaxFileSizeBytes = 500L * 1024 * 1024;

    public static readonly string[] DefaultAllowed =
    {
        "doc","docx","ppt","pptx","pdf","xls","xlsx","zip","rar","7z","txt",
        "py","cpp","c","cs","java","html","css","js","png","jpg","jpeg","svg",
        "gif","webp","md","json","csv","sql","pas","sb3","h","hpp"
    };

    public static readonly string[] Blocked =
        { "exe","dll","bat","cmd","com","scr","msi","ps1","vbs","lnk","reg","pif","cpl","hta" };

    private static readonly Dictionary<string, string> Mime = new(StringComparer.OrdinalIgnoreCase)
    {
        ["pdf"]="application/pdf", ["png"]="image/png", ["jpg"]="image/jpeg", ["jpeg"]="image/jpeg",
        ["gif"]="image/gif", ["webp"]="image/webp", ["svg"]="image/svg+xml",
        ["doc"]="application/msword",
        ["docx"]="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ["ppt"]="application/vnd.ms-powerpoint",
        ["pptx"]="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ["xls"]="application/vnd.ms-excel",
        ["xlsx"]="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ["zip"]="application/zip", ["rar"]="application/vnd.rar", ["7z"]="application/x-7z-compressed",
        ["txt"]="text/plain", ["md"]="text/markdown", ["json"]="application/json", ["csv"]="text/csv",
        ["html"]="text/html", ["css"]="text/css", ["js"]="text/javascript",
    };

    private static readonly HashSet<string> Text = new(StringComparer.OrdinalIgnoreCase)
        { "txt","py","cpp","c","cs","java","html","css","js","md","json","csv","sql","pas","h","hpp" };
    private static readonly HashSet<string> Images = new(StringComparer.OrdinalIgnoreCase)
        { "png","jpg","jpeg","svg","gif","webp" };
    private static readonly HashSet<string> Office = new(StringComparer.OrdinalIgnoreCase)
        { "doc","docx","ppt","pptx","xls","xlsx" };
    private static readonly HashSet<string> Archive = new(StringComparer.OrdinalIgnoreCase)
        { "zip","rar","7z" };

    public static string MimeOf(string ext) => Mime.TryGetValue(ext, out var m) ? m : "application/octet-stream";

    /// <summary>pdf | image | text | office | archive | none</summary>
    public static string PreviewKind(string ext) =>
        ext.Equals("pdf", StringComparison.OrdinalIgnoreCase) ? "pdf"
        : Images.Contains(ext) ? "image" : Text.Contains(ext) ? "text"
        : Office.Contains(ext) ? "office" : Archive.Contains(ext) ? "archive" : "none";

    public static string ExtensionOf(string fileName) =>
        Path.GetExtension(fileName ?? "").TrimStart('.').ToLowerInvariant();
}

public static class Languages
{
    public static readonly string[] All =
        { "Python","C++","Pascal","C#","Java","JavaScript","HTML/CSS","SQL","Scratch" };
}
