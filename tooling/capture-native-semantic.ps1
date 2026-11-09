param(
    [Parameter(Mandatory)][ValidateSet('neovim','zed')][string]$Editor,
    [Parameter(Mandatory)][string]$Languages
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $root
$failed = @()
if ($Editor -eq 'zed') {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Noctis2TestWindow {
    [DllImport("user32.dll")] public static extern bool EnableWindow(IntPtr hWnd, bool enable);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@
}
foreach ($language in $Languages.Split(',')) {
    & node.exe tooling/prepare-native-semantic.mjs $Editor $language
    if ($LASTEXITCODE -ne 0) { throw "Preparation failed: $language" }
    $configPath = (Resolve-Path "test-results/native-semantic/$Editor/$language/launch.json").Path
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    if ($Editor -eq 'zed' -and $config.zedUnsupportedReason) {
        Write-Output "$language : $($config.zedUnsupportedReason)"
        $failed += $language
        continue
    }
    if ($Editor -eq 'neovim') {
        $env:NOCTIS2_NATIVE_CONFIG = $configPath
        $env:NOCTIS2_NODE = (Get-Command node.exe).Source
        $env:XDG_CACHE_HOME = "$($config.output)/cache"
        $env:XDG_DATA_HOME = "$($config.output)/data"
        $env:XDG_STATE_HOME = "$($config.output)/state"
        & nvim.exe --headless -u NONE -i NONE -l ports/neovim/tests/semantic-providers.lua
        if ($LASTEXITCODE -ne 0) { $failed += $language }
    } else {
        $zedProfile = $config.profile
        # Open the workspace first so typing during Zed startup cannot modify
        # the sample before we have identified and protected our own window.
        $arguments = @('--foreground', '--user-data-dir', ('"'+$zedProfile+'"'), '--new', ('"'+$config.workspace+'"'))
        $previousForeground = [Noctis2TestWindow]::GetForegroundWindow()
        $process = Start-Process -FilePath (Get-Command zed.exe).Source -ArgumentList $arguments -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput "$($config.output)/zed.stdout" -RedirectStandardError "$($config.output)/zed.stderr"
        $started = [DateTimeOffset]::UtcNow
        $captured = $false
        $sampleOpened = -not $config.warmupFile
        $registeredAt = $null
        $settingsRefreshed = $false
        $testWindow = [IntPtr]::Zero
        try {
            while (-not $process.HasExited -and ([DateTimeOffset]::UtcNow - $started).TotalMilliseconds -lt $config.timeoutMs) {
                if ($testWindow -eq [IntPtr]::Zero) {
                    # The CLI launches its own top-level window, ignoring WindowStyle Hidden.
                    # Disable input only on its directly owned child, never an existing Zed window.
                    $child = Get-CimInstance Win32_Process -Filter "ParentProcessId = $($process.Id)" | Where-Object Name -EQ 'Zed.exe' | Select-Object -First 1
                    if ($child) {
                        $owned = Get-Process -Id $child.ProcessId -ErrorAction SilentlyContinue
                        if ($owned -and $owned.MainWindowHandle -ne [IntPtr]::Zero) {
                            $testWindow = $owned.MainWindowHandle
                            [Noctis2TestWindow]::EnableWindow($testWindow, $false) | Out-Null
                            if ([Noctis2TestWindow]::GetForegroundWindow() -eq $testWindow) {
                                [Noctis2TestWindow]::SetForegroundWindow($previousForeground) | Out-Null
                            }
                            $initialFile = if ($config.warmupFile) { $config.warmupFile } else { $config.file }
                            Start-Process -FilePath (Get-Command zed.exe).Source -ArgumentList @('--user-data-dir', ('"'+$zedProfile+'"'), '--existing', ('"'+$initialFile+'"')) -WindowStyle Hidden | Out-Null
                        }
                    }
                }
                Start-Sleep -Milliseconds $(if ($testWindow -eq [IntPtr]::Zero) { 50 } else { 500 })
                if (-not (Test-Path $config.trace)) { continue }
                $requests = @{}
                $registered = $false
                # Share writes with the observer; ReadAllLines can interrupt appendFileSync on Windows.
                $stream = [IO.File]::Open($config.trace, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
                $reader = [IO.StreamReader]::new($stream)
                try { $lines = $reader.ReadToEnd().Split("`n") } finally { $reader.Dispose() }
                foreach ($line in $lines) {
                    # The final line may still be written by the observer.
                    try { $entry = $line | ConvertFrom-Json } catch { continue }
                    $message = $entry.message
                    if ($entry.direction -eq 'server' -and ($message.result.capabilities.semanticTokensProvider -or ($message.method -eq 'client/registerCapability' -and ($message.params.registrations.method -contains 'textDocument/semanticTokens')))) { $registered = $true }
                    $requestKey = "$($entry.pid):$($message.id)"
                    if ($entry.direction -eq 'client' -and $message.method -like 'textDocument/semanticTokens/*' -and $message.params.textDocument.uri -eq $config.fileUri) { $requests[$requestKey] = $true }
                    if ($entry.direction -eq 'server' -and $null -ne $message.id -and $requests.ContainsKey($requestKey) -and $message.result.data.Count -gt 0) { $captured = $true }
                }
                if ($registered -and -not $registeredAt) { $registeredAt = [DateTimeOffset]::UtcNow }
                if ($registered -and -not $sampleOpened) {
                    Start-Process -FilePath (Get-Command zed.exe).Source -ArgumentList @('--user-data-dir', ('"'+$zedProfile+'"'), '--existing', ('"'+$config.file+'"')) -WindowStyle Hidden | Out-Null
                    $sampleOpened = $true
                }
                if ($registeredAt -and -not $settingsRefreshed -and $requests.Count -eq 0 -and
                    ([DateTimeOffset]::UtcNow - $registeredAt).TotalSeconds -gt 8) {
                    # Exercise Zed's ordinary settings reload after late capability registration.
                    # The proxy stays transparent; only the isolated client's setting changes.
                    $settingsPath = Join-Path $zedProfile 'config/settings.json'
                    $originalSettings = [IO.File]::ReadAllText($settingsPath)
                    $settings = $originalSettings | ConvertFrom-Json
                    $settings.semantic_tokens = 'off'
                    try {
                        [IO.File]::WriteAllText($settingsPath, ($settings | ConvertTo-Json -Depth 30))
                        Start-Sleep -Milliseconds 1500
                    } finally { [IO.File]::WriteAllText($settingsPath, $originalSettings) }
                    $settingsRefreshed = $true
                }
                if ($registeredAt -and $requests.Count -eq 0 -and ([DateTimeOffset]::UtcNow - $registeredAt).TotalSeconds -gt 90) {
                    Write-Output "$language : native Zed sent no semantic request within 90 seconds of registration"
                    break
                }
                if ($captured) { break }
            }
        } finally {
            # This process was created above for this exact isolated profile.
            if ($testWindow -ne [IntPtr]::Zero) { [Noctis2TestWindow]::EnableWindow($testWindow, $true) | Out-Null }
            if (-not $process.HasExited) { $process.Kill($true); $process.WaitForExit() }
        }
        @{ editor='zed'; case=$language; runId=$config.runId; status=$(if($captured){'captured'}else{'missing-tokens'}); startedAt=$started.ToString('o'); settingsRefreshed=$settingsRefreshed } |
            ConvertTo-Json | Set-Content "$($config.output)/capture-status.json" -Encoding utf8
        if (-not $captured) { $failed += $language }
        Write-Output "$language : Zed real tokens captured=$captured"
    }
}
if ($failed.Count) { throw "Native capture failed: $($failed -join ', ')" }
