; Inno Setup 6 — biên dịch bằng ISCC.exe installer\GiaoAnTin.iss (sau khi chạy scripts\publish.ps1)
; Đặt MicrosoftEdgeWebview2Setup.exe (bootstrapper) vào thư mục installer\ nếu muốn cài kèm WebView2.
#define AppName "TeachStash"
#define AppExe "TeachStash.exe"
[Setup]
AppId={{B3D6C1A2-5E0F-4C57-9A41-7E2F0C1D9A11}
AppName={#AppName}
AppVersion=1.0.0
DefaultDirName={autopf}\TeachStash
DefaultGroupName={#AppName}
OutputDir=..\publish\installer
OutputBaseFilename=TeachStash-Setup
SetupIconFile=app.ico
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
PrivilegesRequired=lowest
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
[Files]
Source: "..\publish\KhoGiaoAnTinHoc\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion
Source: "MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall skipifsourcedoesntexist
[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"
[Run]
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; Check: NeedsWebView2 and FileExists(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe')); StatusMsg: "Đang cài WebView2 Runtime..."
Filename: "{app}\{#AppExe}"; Description: "Mở {#AppName}"; Flags: nowait postinstall skipifsilent
[Code]
function NeedsWebView2: Boolean;
var v: String;
begin
  Result := not (RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', v)
             or RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', v));
end;
