namespace GiaoAn.Application.Common;

public abstract class AppException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
public sealed class NotFoundException(string message) : AppException(message, 404);
public sealed class ConflictException(string message) : AppException(message, 409);
public sealed class UnauthorizedAppException(string message) : AppException(message, 401);
public sealed class ValidationAppException(IDictionary<string, string[]> errors)
    : AppException("Dữ liệu không hợp lệ.", 400)
{
    public IDictionary<string, string[]> Errors { get; } = errors;
    public ValidationAppException(string field, string message)
        : this(new Dictionary<string, string[]> { [field] = new[] { message } }) { }
}
