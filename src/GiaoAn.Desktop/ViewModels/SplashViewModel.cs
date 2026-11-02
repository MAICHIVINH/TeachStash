using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace GiaoAn.Desktop.ViewModels;

public sealed class SplashViewModel : INotifyPropertyChanged
{
    private string _status = "Đang khởi động...";
    public string Status { get => _status; set { _status = value; OnChanged(); } }
    public event PropertyChangedEventHandler? PropertyChanged;
    private void OnChanged([CallerMemberName] string? n = null) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(n));
}
