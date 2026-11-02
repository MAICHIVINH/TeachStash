using Microsoft.Extensions.Logging;

namespace GiaoAn.Infrastructure.Services;

public sealed class FileLoggerProvider(string logsDir) : ILoggerProvider
{
    private readonly object _lock = new();
    public ILogger CreateLogger(string categoryName) => new FileLogger(categoryName, logsDir, _lock);
    public void Dispose() { }

    private sealed class FileLogger(string category, string dir, object gate) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Information;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel)) return;
            var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff} [{logLevel}] {category}: {formatter(state, exception)}";
            if (exception != null) line += Environment.NewLine + exception;
            try
            {
                lock (gate) File.AppendAllText(Path.Combine(dir, $"app-{DateTime.Now:yyyyMMdd}.log"), line + Environment.NewLine);
            }
            catch { /* không để lỗi ghi log làm sập ứng dụng */ }
        }
    }
}
