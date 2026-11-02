using System.Windows;
using GiaoAn.Desktop.ViewModels;

namespace GiaoAn.Desktop.Views;

public partial class SplashWindow : Window
{
    public SplashViewModel ViewModel { get; } = new();
    public SplashWindow() { InitializeComponent(); DataContext = ViewModel; }
}
