$ErrorActionPreference = 'Stop'
if ($IsWindows -and -not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
    $installation = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if (-not $installation) { throw 'Install Visual Studio C++ Build Tools or use an x64 developer shell.' }
    Import-Module (Join-Path $installation 'Common7/Tools/Microsoft.VisualStudio.DevShell.dll')
    Enter-VsDevShell -VsInstallPath $installation -SkipAutomaticLocation -DevCmdArguments '-arch=x64 -host_arch=x64'
}
$python = if ($env:PYTHON) { $env:PYTHON } else { 'python' }
& $python tooling/prepare-native-languages.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
