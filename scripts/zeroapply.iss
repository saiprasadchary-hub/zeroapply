#define AppVersion GetEnv("ZEROAPPLY_VERSION")
#define ExeDir GetEnv("ZEROAPPLY_EXE_DIR")
#define SetupDir GetEnv("ZEROAPPLY_SETUP_DIR")

[Setup]
AppId={{D37E84B1-2F19-4F57-9A10-8A74B2A0F51E}
AppName=ZeroApply
AppVersion={#AppVersion}
AppPublisher=ZeroApply Team
AppPublisherURL=https://zero-apply.web.app
AppSupportURL=https://zero-apply.web.app
AppUpdatesURL=https://github.com/saiprasadchary-hub/zeroapply/releases/latest
DefaultDirName={localappdata}\Programs\ZeroApply
DisableProgramGroupPage=yes
OutputDir=..\{#SetupDir}
OutputBaseFilename=ZeroApply-Setup
SetupIconFile=..\public\logo.ico
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\ZeroApply.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "installai"; Description: "Download and configure Local AI Engine (Qwen 2.5) during setup"; GroupDescription: "Optional AI Engine:"; Flags: unchecked

[Files]
; Main ZeroApply Desktop Application
Source: "..\{#ExeDir}\ZeroApply-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; AI Engine Setup Script
Source: "install-ai.ps1"; DestDir: "{app}\resources"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\ZeroApply"; Filename: "{app}\ZeroApply.exe"; IconFilename: "{app}\ZeroApply.exe"
Name: "{autodesktop}\ZeroApply"; Filename: "{app}\ZeroApply.exe"; IconFilename: "{app}\ZeroApply.exe"; Tasks: desktopicon

[Run]
; Configure and initialize Local AI Engine & model weights during setup
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoProfile -File ""{app}\resources\install-ai.ps1"""; StatusMsg: "Configuring Local AI Engine & Qwen Neural Model..."; Flags: waituntilterminated; Tasks: installai
; Launch ZeroApply on completion
Filename: "{app}\ZeroApply.exe"; Description: "{cm:LaunchProgram,ZeroApply}"; Flags: nowait postinstall skipifsilent
