param(
    [string]$Code = "$env:LOCALAPPDATA/Programs/Microsoft VS Code/Code.exe",
    [string]$Extensions = "$env:USERPROFILE/.vscode/extensions",
    [string]$Languages = '',
    [string]$OutputDirectory = 'test-results/semantic-providers',
    [string]$RunId = '',
    [string]$JetlsDepot = '',
    [int]$MinimumWaitMs = 0,
    [int]$HostTimeoutSeconds = 900,
    [string]$Julia = "$env:USERPROFILE/.julia/juliaup/julia-1.13.2+0.x64.w64.mingw32/bin/julia.exe"
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
Set-Location -LiteralPath $root
$output = [IO.Path]::GetFullPath($OutputDirectory, $root)
$catalog = Get-Content tests/samples/catalog.json -Raw | ConvertFrom-Json -AsHashtable
$matrix = Get-Content ports/vscode/tests/semantic-providers.json -Raw | ConvertFrom-Json -AsHashtable
$versions = Get-Content ports/vscode/tests/semantic-provider-versions.json -Raw | ConvertFrom-Json -AsHashtable
$selected = if ($Languages) { $Languages.Split(',') } else { @($matrix.Keys | Where-Object { $matrix[$_].provider }) }
foreach ($language in $selected) {
    if (-not $matrix.ContainsKey($language) -or -not $matrix[$language].provider) { throw "No configured provider for $language" }
}
if (@($selected).Count -gt 1) {
    # Each provider gets its own process so startup hooks cannot block the rest.
    $failed = @()
    foreach ($language in $selected) {
        & ([Environment]::ProcessPath) -NoProfile -File $PSCommandPath -Code $Code -Extensions $Extensions -Languages $language -Julia $Julia -OutputDirectory $output -RunId $RunId -JetlsDepot $JetlsDepot -MinimumWaitMs $MinimumWaitMs -HostTimeoutSeconds $HostTimeoutSeconds
        if ($LASTEXITCODE -ne 0) { $failed += $language }
    }
    if ($failed.Count) { Write-Error "Capture failed: $($failed -join ', ')"; exit 1 }
    exit 0
}
$workspace = Join-Path $output "workspaces/$($selected -join '-')"
$profile = Join-Path $output 'profile'
if ($Languages -in @('clojure', 'kotlin') -or $Languages.StartsWith('julia-')) {
    $profile = Join-Path $output "profile-$Languages"
}
New-Item -ItemType Directory -Force -Path $workspace, "$profile/User", "$output/extensions" | Out-Null
foreach ($language in $selected) {
    Copy-Item -LiteralPath "tests/samples/languages/$($catalog[($matrix[$language].sample ?? $language)].file)" -Destination $workspace
}
$settings = @{
    'workbench.startupEditor' = 'none'
    'workbench.colorTheme' = 'Noctis2'
    'editor.semanticHighlighting.enabled' = $true
    'extensions.autoUpdate' = $false
    'extensions.autoCheckUpdates' = $false
    'telemetry.telemetryLevel' = 'off'
    'security.workspace.trust.enabled' = $false
    'git.enabled' = $false
    'python.analysis.typeCheckingMode' = 'basic'
    'python.analysis.diagnosticMode' = 'openFilesOnly'
    'python.experiments.enabled' = $false
    'tinymist.exportPdf' = 'never'
    'julia.enableTelemetry' = $false
    'powershell.integratedConsole.showOnStartup' = $false
    'typescript.disableAutomaticTypeAcquisition' = $true
    'C_Cpp.updateChannel' = 'Default'
    'rust-analyzer.checkOnSave' = $false
    'rust-analyzer.cargo.buildScripts.enable' = $false
    'rust-analyzer.procMacro.enable' = $false
    'rust-analyzer.linkedProjects' = @("$workspace/rust/Cargo.toml")
    'java.configuration.updateBuildConfiguration' = 'automatic'
    'redhat.telemetry.enabled' = $false
    'kotlin.debugAdapter.enabled' = $false
    'latex-workshop.latex.autoBuild.run' = 'never'
    'metals.autoImportBuilds' = 'all'
    'go.toolsManagement.autoUpdate' = $false
}
# CI uses portable runtimes inside this output directory, never the user's tools.
foreach ($tool in @('python', 'dotnet')) {
    if (Test-Path "$output/runtimes/$tool/$tool.exe") { $env:PATH = "$output/runtimes/$tool;" + $env:PATH }
}
if (Test-Path "$output/runtimes/dotnet/dotnet.exe") {
    $env:DOTNET_ROOT = "$output/runtimes/dotnet"
    $env:DOTNET_ROLL_FORWARD = 'LatestMajor'
    $env:DOTNET_CLI_HOME = "$output/runtimes/dotnet-home"
    $env:NUGET_PACKAGES = "$output/runtimes/nuget"
    $settings['FSharp.dotnetRoot'] = $env:DOTNET_ROOT
    $settings['dotnetAcquisitionExtension.existingDotnetPath'] = @(
        @{ extensionId = 'ms-dotnettools.csharp'; path = "$env:DOTNET_ROOT/dotnet.exe" },
        @{ extensionId = 'dnakode.vbnet-language-support'; path = "$env:DOTNET_ROOT/dotnet.exe" }
    )
}
if (Test-Path "$output/runtimes/rustup/settings.toml") {
    $env:RUSTUP_HOME = "$output/runtimes/rustup"
    $env:CARGO_HOME = "$output/runtimes/cargo"
    $env:RUSTUP_TOOLCHAIN = $versions.runtimes.rust.version
}
$python = Get-Command python.exe -ErrorAction SilentlyContinue
if ($python) { $settings['python.defaultInterpreterPath'] = $python.Source }
$javaExtension = Get-ChildItem -LiteralPath "$output/extensions" -Directory | Where-Object Name -Like 'redhat.java-*' | Select-Object -First 1
if ($javaExtension) {
    $jre = Get-ChildItem -LiteralPath (Join-Path $javaExtension.FullName 'jre') -Directory | Select-Object -First 1
    if ($jre) {
        $env:JAVA_HOME = $jre.FullName
        $env:PATH = (Join-Path $jre.FullName 'bin') + [IO.Path]::PathSeparator + $env:PATH
        $settings['java.jdt.ls.java.home'] = $jre.FullName
    }
}
$jdk21 = Get-ChildItem "$output/runtimes/jdk21" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($jdk21 -and (Test-Path "$($jdk21.FullName)/bin/java.exe")) {
    $env:JAVA_HOME = $jdk21.FullName
    $env:PATH = "$($jdk21.FullName)/bin;" + $env:PATH
    $settings['kotlin.java.home'] = $jdk21.FullName
    $settings['metals.javaHome'] = $jdk21.FullName
    $settings['salesforcedx-vscode-apex.java.home'] = $jdk21.FullName
}
$ruby = Get-ChildItem "$output/runtimes/ruby" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ruby) {
    $env:PATH = "$($ruby.FullName)/bin;" + $env:PATH
    $env:GEM_HOME = "$output/runtimes/gems"
    $env:GEM_PATH = "$env:GEM_HOME;$($ruby.FullName)/lib/ruby/gems/4.0.0"
    $settings['rubyLsp.rubyVersionManager'] = @{ identifier = 'none' }
    $settings['rubyLsp.rubyExecutablePath'] = "$($ruby.FullName)/bin/ruby.exe"
    $settings['rubyLsp.formatter'] = 'none'
    $gemfile = "$output/runtimes/Gemfile"
    if (-not (Test-Path $gemfile)) {
        "source 'https://rubygems.org'", "gem 'ruby-lsp', '= 0.26.11'", "gem 'rbs', '= 3.10.0'", "gem 'prism', '= 1.8.2'" | Set-Content $gemfile -Encoding utf8
    }
    $settings['rubyLsp.bundleGemfile'] = $gemfile
}
if (Test-Path "$output/runtimes/go/bin/go.exe") {
    $env:GOROOT = "$output/runtimes/go"
    $env:GOPATH = "$output/runtimes/gopath"
    $env:GOCACHE = "$output/runtimes/gocache"
    $env:PATH = "$env:GOROOT/bin;$env:GOPATH/bin;" + $env:PATH
    $settings['go.goroot'] = $env:GOROOT
    $settings['go.gopath'] = $env:GOPATH
    $settings['gopls'] = @{ 'ui.semanticTokens' = $true }
}
if (Test-Path "$output/runtimes/dart-sdk/bin/dart.exe") { $settings['dart.sdkPath'] = "$output/runtimes/dart-sdk" }
$clangd = Get-ChildItem "$output/runtimes/clangd" -Filter clangd.exe -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
if ($clangd) { $settings['clangd.path'] = $clangd.FullName }
if (Test-Path "$output/runtimes/clojure-lsp/clojure-lsp.exe") {
    $settings['calva.clojureLspPath'] = "$output/runtimes/clojure-lsp/clojure-lsp.exe"
    $settings['calva.enableClojureLspOnStart'] = 'always-use-first-workspace-root'
}
$settings['vbnet.workspace.projectPaths'] = @("$workspace/Observatory.vbproj")
$elm = Get-ChildItem "$output/runtimes/elm/node_modules/@elm_binaries" -Filter elm.exe -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
if ($elm) { $settings['elmLS.elmPath'] = $elm.FullName }
$settings['elmLS.skipInstallPackageConfirmation'] = $true
$env:ELM_HOME = "$output/runtimes/elm-home"
if ($Languages -eq 'julia' -or $Languages.StartsWith('julia-')) {
    $juliaRuntime = $Julia
    if (-not (Test-Path $juliaRuntime)) { throw "Julia runtime missing (use -Julia): $juliaRuntime" }
    $settings['julia.executablePath'] = $juliaRuntime
    $settings['jetls-client.executable'] = @{ threads = '2'; env = @{ JULIA_APPS_JULIA_CMD = $juliaRuntime; JULIA_NUM_PRECOMPILE_TASKS = '2' } }
    $settings['jetls-client.managedStoragePath'] = "$output/runtimes/jetls"
    if ($Languages -eq 'julia-jetls' -and $JetlsDepot) {
        $env:JULIA_DEPOT_PATH = [IO.Path]::GetFullPath($JetlsDepot, $root)
        $project = "$env:JULIA_DEPOT_PATH/environments/apps/JETLS"
        if (-not (Test-Path "$project/Manifest.toml")) { throw 'Prepare the pinned JETLS environment first.' }
        $settings['jetls-client.executable'] = @($juliaRuntime, '--startup-file=no', '--history-file=no', '--threads=2', "--project=$project", '-m', 'JETLS', 'serve')
    }
    $settings['fatou.trace.server'] = 'verbose'
    $settings['fatou.formatting.enable'] = $false
}
$settings | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$profile/User/settings.json" -Encoding utf8
$extensionIds = @('ms-python.python', 'ms-python.vscode-pylance', 'ms-python.vscode-python-envs',
    'myriad-dreamin.tinymist', 'ms-vscode.cpptools', 'ms-vscode.powershell',
    'julialang.language-julia', 'tamasfe.even-better-toml')
$extensionPaths = @()
foreach ($id in $extensionIds) {
    if (-not (Test-Path $Extensions)) { break }
    $candidate = Get-ChildItem -LiteralPath $Extensions -Directory | Where-Object { $_.Name.StartsWith("$id-") } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($candidate) { $extensionPaths += $candidate.FullName }
}
# Only the selected providers and their declared dependencies may activate.
# Unrelated workspaceContains hooks have closed the test host before it starts.
$available = @{}
foreach ($extensionDirectory in @((Get-ChildItem "$output/extensions" -Directory).FullName) + $extensionPaths) {
    $manifestPath = Join-Path $extensionDirectory 'package.json'
    if (-not (Test-Path $manifestPath)) { continue }
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json -AsHashtable
    $id = "$($manifest.publisher).$($manifest.name)".ToLowerInvariant()
    $available[$id] = @{ path = $extensionDirectory; manifest = $manifest }
}
$enabled = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$queue = [Collections.Generic.Queue[string]]::new()
foreach ($language in $selected) {
    $queue.Enqueue($matrix[$language].provider)
    foreach ($id in $matrix[$language].supportExtensions) { $queue.Enqueue($id) }
}
while ($queue.Count) {
    $id = $queue.Dequeue()
    if (-not $enabled.Add($id)) { continue }
    if ($available.ContainsKey($id)) {
        foreach ($dependency in @($available[$id].manifest.extensionDependencies)) {
            if ($dependency) { $queue.Enqueue($dependency) }
        }
    }
}
$extensionPaths = @($extensionPaths | Where-Object {
    $manifest = Get-Content (Join-Path $_ 'package.json') -Raw | ConvertFrom-Json -AsHashtable
    $enabled.Contains("$($manifest.publisher).$($manifest.name)")
})
if ($selected -contains 'kotlin') {
    # Skip first-run UI only in the isolated profile; allow the server bootstrap.
    $kotlinStorage = "$profile/User/globalStorage/fwcd.kotlin"
    New-Item -ItemType Directory -Force -Path $kotlinStorage | Out-Null
    $kotlinConfig = if (Test-Path "$kotlinStorage/config.json") { Get-Content "$kotlinStorage/config.json" -Raw | ConvertFrom-Json -AsHashtable } else { @{} }
    $kotlinConfig['initialized'] = $true
    $kotlinConfig | ConvertTo-Json -Depth 10 | Set-Content "$kotlinStorage/config.json" -Encoding utf8
    # Resolve when the server invokes this hook, after its first-run download.
    # Resolving before startup loses stdlib tokens on a cold installation.
    $stdlibDirectory = "$kotlinStorage/langServerInstall/server/lib".Replace("'", "''")
    '@echo off', "pwsh -NoProfile -Command `"(Get-ChildItem -LiteralPath '$stdlibDirectory' -Filter 'kotlin-stdlib*.jar' -File).FullName -join ';'`"" |
        Set-Content "$workspace/kls-classpath.cmd" -Encoding utf8
}
if ($selected -contains 'rust') {
    New-Item -ItemType Directory -Force -Path "$workspace/rust/src" | Out-Null
    Copy-Item -LiteralPath 'tests/samples/languages/observations.rs' -Destination "$workspace/rust/src/main.rs"
    "[package]`nname = 'noctis2-semantic-sample'`nversion = '0.0.0'`nedition = '2021'" | Set-Content "$workspace/rust/Cargo.toml" -Encoding utf8
}
if ($selected -contains 'csharp') {
    '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><EnableDefaultCompileItems>false</EnableDefaultCompileItems></PropertyGroup><ItemGroup><Compile Include="observations.cs" /></ItemGroup></Project>' | Set-Content "$workspace/Observatory.csproj" -Encoding utf8
}
if ($selected -contains 'fsharp') {
    '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><EnableDefaultCompileItems>false</EnableDefaultCompileItems></PropertyGroup><ItemGroup><Compile Include="observations.fs" /></ItemGroup></Project>' | Set-Content "$workspace/Observatory.fsproj" -Encoding utf8
}
if ($selected -contains 'clojure') {
    '{:paths ["."]}' | Set-Content "$workspace/deps.edn" -Encoding utf8
}
if ($selected -contains 'go') { "module example.com/noctis2sample`n`ngo 1.23.0" | Set-Content "$workspace/go.mod" -Encoding utf8 }
if ($selected -contains 'dart') { "name: noctis2_sample`nenvironment:`n  sdk: '>=3.0.0 <4.0.0'" | Set-Content "$workspace/pubspec.yaml" -Encoding utf8 }
if ($selected -contains 'visualbasic') {
    '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><EnableDefaultCompileItems>false</EnableDefaultCompileItems></PropertyGroup><ItemGroup><Compile Include="observations.vb" /></ItemGroup></Project>' | Set-Content "$workspace/Observatory.vbproj" -Encoding utf8
}
if ($selected -contains 'apex') { '{"packageDirectories":[{"path":".","default":true}],"sourceApiVersion":"64.0"}' | Set-Content "$workspace/sfdx-project.json" -Encoding utf8 }
if ($selected -contains 'elm') {
    New-Item -ItemType Directory -Force "$workspace/elm" | Out-Null
    Copy-Item 'tests/samples/languages/observations.elm' "$workspace/elm/Observatory.elm"
    '{"type":"application","source-directories":["elm"],"elm-version":"0.19.1","dependencies":{"direct":{"elm/core":"1.0.5","elm/html":"1.0.0"},"indirect":{"elm/json":"1.1.3","elm/virtual-dom":"1.0.3"}},"test-dependencies":{"direct":{},"indirect":{}}}' | Set-Content "$workspace/elm.json" -Encoding utf8
}
if ($selected -contains 'scala') {
    New-Item -ItemType Directory -Force "$workspace/project" | Out-Null
    'scalaVersion := "2.13.18"', 'Compile / unmanagedSourceDirectories := Seq(baseDirectory.value)' | Set-Content "$workspace/build.sbt" -Encoding utf8
    'sbt.version=1.11.7' | Set-Content "$workspace/project/build.properties" -Encoding utf8
}
$documents = foreach ($language in $selected) {
    $file = switch ($language) { 'rust' { 'rust/src/main.rs' } 'elm' { 'elm/Observatory.elm' } default { $catalog[($matrix[$language].sample ?? $language)].file } }
    @{ language = $language; languageId = $matrix[$language].languageId; file = $file; provider = $matrix[$language].provider; textmateOnly = [bool]$matrix[$language].textmateOnly; waitMs = [Math]::Max($MinimumWaitMs, ($matrix[$language].waitMs ?? 30000)); requestTimeoutMs = ($matrix[$language].requestTimeoutMs ?? 45000) }
}
$reportFile = if ($Languages) { "$output/capture-$($selected -join '-').json" } else { "$output/capture.json" }
$config = @{ runId = $RunId; workspace = $workspace; output = $reportFile; providers = @($documents.provider | Select-Object -Unique); documents = @($documents) }
$config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath "$output/config.json" -Encoding utf8
$env:NOCTIS2_SEMANTIC_CONFIG = "$output/config.json"
$arguments = @('--new-window', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust', '--disable-updates',
    "--user-data-dir=$profile", "--extensions-dir=$output/extensions",
    "--extensionDevelopmentPath=$root/ports/vscode/tests/semantic-host",
    "--extensionDevelopmentPath=$root/ports/vscode", "--extensionTestsPath=$root/ports/vscode/tests/semantic-host/index.cjs")
$arguments += $extensionPaths | ForEach-Object { "--extensionDevelopmentPath=$_" }
foreach ($id in $available.Keys) {
    if (-not $enabled.Contains($id)) { $arguments += "--disable-extension=$id" }
}
$arguments += $workspace
$startedAt = [DateTimeOffset]::UtcNow
$process = Start-Process -FilePath $Code -ArgumentList ($arguments | ForEach-Object { '"' + $_ + '"' }) -WindowStyle Hidden -PassThru
Write-Output "Isolated semantic provider host PID: $($process.Id)"
$hostFailure = $null
while (-not $process.WaitForExit(1000)) {
    $elapsed = ([DateTimeOffset]::UtcNow - $startedAt).TotalSeconds
    $fresh = (Test-Path $reportFile) -and [IO.File]::GetLastWriteTimeUtc($reportFile) -ge $startedAt.UtcDateTime
    if (($elapsed -gt 180 -and -not $fresh) -or $elapsed -gt $HostTimeoutSeconds) {
        $process.Kill($true)
        $process.WaitForExit()
        $hostFailure = "Host timed out before startup (180s) or completion ($($HostTimeoutSeconds)s)."
        break
    }
}
if ($process.ExitCode -ne 0 -and -not $hostFailure) { $hostFailure = "Host exited with code $($process.ExitCode)." }
$fresh = (Test-Path $reportFile) -and (Get-Item $reportFile).Length -gt 0 -and [IO.File]::GetLastWriteTimeUtc($reportFile) -ge $startedAt.UtcDateTime
if (-not $fresh) {
    # Preserve a failed startup as evidence instead of retaining a stale pass.
    $failedDocuments = @($documents | ForEach-Object {
        $_ + @{ status = 'capture-incomplete'; tokens = @(); providerVersion = $available[$_.provider].manifest.version; error = ($hostFailure ?? 'Host exited without creating a report.') }
    })
    @{ runId = $RunId; capturedAt = $startedAt.ToString('o'); vscodeVersion = $null; source = 'capture wrapper: host startup failure'; extensions = @{}; grammars = @(); documents = $failedDocuments } |
        ConvertTo-Json -Depth 10 | Set-Content $reportFile -Encoding utf8
    throw 'Host did not produce a capture report; startup failure recorded.'
}
if ($hostFailure) { throw $hostFailure }
$capture = Get-Content $reportFile -Raw | ConvertFrom-Json
if ([DateTimeOffset]$capture.capturedAt -lt $startedAt) { throw 'Host did not replace the previous capture report.' }
if (@($capture.documents).Count -ne @($documents).Count -or @($capture.documents | Where-Object status -eq 'pending').Count) {
    throw "Host ended before all requested documents completed. Partial evidence: $reportFile"
}
Write-Output "Provider capture: $reportFile"
