param(
    [Parameter(Mandatory)][string]$Group,
    [string]$OutputDirectory = '',
    [string]$DownloadDirectory = 'test-results/semantic-ci-downloads',
    [string]$EditorDirectory = 'test-results/semantic-ci-tools/vscode',
    [string]$JetlsDepot = ''
)
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'Real-provider CI currently requires Windows.' }
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
Set-Location -LiteralPath $root
$groups = Get-Content ports/vscode/tests/semantic-ci.json -Raw | ConvertFrom-Json -AsHashtable
if (-not $groups.ContainsKey($Group)) { throw "Unknown semantic CI group: $Group" }
$cases = Get-Content ports/vscode/tests/semantic-providers.json -Raw | ConvertFrom-Json -AsHashtable
$pins = Get-Content ports/vscode/tests/semantic-provider-versions.json -Raw | ConvertFrom-Json -AsHashtable
if (-not $OutputDirectory) { $OutputDirectory = "test-results/semantic-ci/$Group" }
$output = [IO.Path]::GetFullPath($OutputDirectory, $root)
$downloads = [IO.Path]::GetFullPath($DownloadDirectory, $root)
$editor = [IO.Path]::GetFullPath($EditorDirectory, $root)
New-Item -ItemType Directory -Force $output, $downloads, "$output/extensions", "$output/runtimes" | Out-Null
$evidence = @{ group = $Group; languages = $groups[$Group].languages; status = 'preparing'; extensions = @{}; runtimes = @{} }
$evidence | ConvertTo-Json -Depth 10 | Set-Content "$output/preparation.json" -Encoding utf8

function Install-Archive($name, $pin, $destination) {
    $marker = Join-Path $destination '.semantic-install.json'
    $identity = $pin | ConvertTo-Json -Compress
    if ((Test-Path $marker) -and (Get-Content $marker -Raw).Trim() -eq $identity) { return }
    $extension = if ($pin.url.EndsWith('.7z')) { '.7z' } else { '.zip' }
    $archive = Join-Path $downloads "$name$extension"
    if (-not (Test-Path $archive)) { Invoke-WebRequest $pin.url -OutFile $archive }
    $algorithm = if ($pin.sha512) { 'SHA512' } else { 'SHA256' }
    $expected = if ($pin.sha512) { $pin.sha512 } else { $pin.sha256 }
    if (-not $expected -or (Get-FileHash $archive -Algorithm $algorithm).Hash -ne $expected) { throw "Archive checksum mismatch: $name" }
    New-Item -ItemType Directory -Force $destination | Out-Null
    if ($extension -eq '.7z') {
        $sevenZip = (Get-Command 7z.exe -ErrorAction SilentlyContinue).Source
        if (-not $sevenZip) { $sevenZip = Join-Path $env:ProgramFiles '7-Zip/7z.exe' }
        if (-not (Test-Path $sevenZip)) { throw '7-Zip is required to extract the pinned Ruby archive.' }
        & $sevenZip x $archive "-o$destination" -y | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Extraction failed: $name" }
    } else { Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force }
    $identity | Set-Content $marker -Encoding utf8
}

try {
    Install-Archive "vscode-$($pins.vscode)" $pins.vscodeArchive $editor
    $code = "$editor/Code.exe"
    $cli = "$editor/bin/code.cmd"
    $version = & $cli --version
    if ($LASTEXITCODE -ne 0 -or $version[0] -ne $pins.vscode) { throw 'Unexpected VS Code version' }
    # Install mandatory dependencies first at their pinned versions. Optional packs
    # (notably the competing C# servers in Ionide's pack) must not activate.
    $ids = [Collections.Generic.List[string]]::new()
    switch ($Group) {
        'python' { $ids.Add('ms-python.python'); $ids.Add('ms-python.vscode-python-envs') }
        'dotnet' { $ids.Add('ms-dotnettools.vscode-dotnet-runtime') }
        'jvm' { $ids.Add('scala-lang.scala') }
    }
    foreach ($language in $groups[$Group].languages) {
        foreach ($id in @($cases[$language].supportExtensions) + @($cases[$language].provider)) {
            if ($id -and -not $id.StartsWith('vscode.') -and -not $ids.Contains($id)) { $ids.Add($id) }
        }
    }
    foreach ($id in $ids) {
        if (-not $pins.extensions[$id]) { throw "Unpinned extension: $id" }
        & $cli --user-data-dir "$output/install-profile" --extensions-dir "$output/extensions" --install-extension "$id@$($pins.extensions[$id])" --do-not-include-pack-dependencies --force
        if ($LASTEXITCODE -ne 0) { throw "Extension installation failed: $id" }
    }
    $installed = @{}
    foreach ($dir in Get-ChildItem "$output/extensions" -Directory) {
        if (-not (Test-Path "$($dir.FullName)/package.json")) { continue }
        $manifest = Get-Content "$($dir.FullName)/package.json" -Raw | ConvertFrom-Json -AsHashtable
        $id = "$($manifest.publisher).$($manifest.name)".ToLowerInvariant()
        if ($manifest.version -ne $pins.extensions[$id]) { throw "Unexpected installed extension version: $id $($manifest.version)" }
        $installed[$id] = $manifest
        $evidence.extensions[$id] = $manifest.version
    }
    foreach ($id in $ids) {
        if (-not $installed.ContainsKey($id)) { throw "Missing extension: $id" }
        foreach ($dependency in $installed[$id].extensionDependencies) {
            if (-not $dependency.StartsWith('vscode.') -and -not $installed.ContainsKey($dependency)) { throw "Missing dependency: $dependency" }
        }
    }
    $julia = ''
    foreach ($runtime in $groups[$Group].runtimes) {
        $pin = $pins.runtimes[$runtime]
        $evidence.runtimes[$runtime] = $pin
        $evidence.stage = "runtime:$runtime"
        $evidence | ConvertTo-Json -Depth 10 | Set-Content "$output/preparation.json" -Encoding utf8
        Write-Output "Preparing $runtime $($pin.version)"
        switch ($runtime) {
            'rust' {
                $env:RUSTUP_HOME = "$output/runtimes/rustup"
                $env:CARGO_HOME = "$output/runtimes/cargo"
                & rustup.exe toolchain install $pin.version --profile minimal --component rust-src --no-self-update
                if ($LASTEXITCODE -ne 0) { throw 'Rust toolchain installation failed' }
                & rustup.exe default $pin.version
                if ($LASTEXITCODE -ne 0) { throw 'Rust toolchain selection failed' }
            }
            'go' {
                # The archive already contains a go/ directory.
                Install-Archive "go-$($pin.version)" $pin "$output/runtimes"
                $env:GOROOT = "$output/runtimes/go"
                $env:GOPATH = "$output/runtimes/gopath"
                $env:GOCACHE = "$output/runtimes/gocache"
                $env:PATH = "$env:GOROOT/bin;" + $env:PATH
                & "$env:GOROOT/bin/go.exe" install "golang.org/x/tools/gopls@v$($pin.gopls)"
                if ($LASTEXITCODE -ne 0) { throw 'gopls installation failed' }
            }
            'dart' { Install-Archive "dart-$($pin.version)" $pin "$output/runtimes" }
            'ruby' {
                Install-Archive "ruby-$($pin.version)" $pin "$output/runtimes/ruby"
                $ruby = Get-ChildItem "$output/runtimes/ruby" -Directory | Select-Object -First 1
                $env:PATH = "$($ruby.FullName)/bin;" + $env:PATH
                $env:GEM_HOME = "$output/runtimes/gems"
                $env:GEM_PATH = "$env:GEM_HOME;$($ruby.FullName)/lib/ruby/gems/4.0.0"
                & "$($ruby.FullName)/bin/gem.cmd" install ruby-lsp --version $pin.rubyLsp --conservative --no-document
                if ($LASTEXITCODE -ne 0) { throw 'Ruby LSP installation failed' }
            }
            'julia' {
                Install-Archive "julia-$($pin.version)" $pin "$output/runtimes/julia"
                $julia = (Get-ChildItem "$output/runtimes/julia" -Filter julia.exe -Recurse -File | Select-Object -First 1).FullName
                if (-not $julia) { throw 'Julia executable missing' }
                if ((& $julia --startup-file=no --version) -ne "julia version $($pin.version)") { throw 'Unexpected Julia version' }
                # Prepare outside the editor: the client's managed installer has
                # a fixed 15-minute timeout, shorter than a cold CI compilation.
                if (-not $JetlsDepot) { $JetlsDepot = "$output/runtimes/jetls-ci-depot" }
                $JetlsDepot = [IO.Path]::GetFullPath($JetlsDepot, $root)
                $env:JULIA_DEPOT_PATH = $JetlsDepot
                $env:JULIA_NUM_PRECOMPILE_TASKS = '2'
                $env:JULIA_APPS_JULIA_CMD = $julia
                $env:NOCTIS2_JETLS_REVISION = $pins.runtimes.jetls.revision
                $readyFile = "$JetlsDepot/noctis2-ready.json"
                $ready = if (Test-Path $readyFile) { Get-Content $readyFile -Raw | ConvertFrom-Json } else { $null }
                if ($ready.revision -ne $pins.runtimes.jetls.revision -or $ready.julia -ne $pin.version) {
                    Write-Output "Preparing JETLS $($pins.runtimes.jetls.revision) outside the editor"
                    & $julia --startup-file=no --history-file=no -e 'using Pkg; Pkg.Apps.add(; url="https://github.com/aviatesk/JETLS.jl", rev=ENV["NOCTIS2_JETLS_REVISION"])'
                    if ($LASTEXITCODE -ne 0) { throw 'Pinned JETLS preparation failed' }
                }
                $serverVersion = & $julia --startup-file=no --history-file=no "--project=$JetlsDepot/environments/apps/JETLS" -m JETLS --version
                if ($LASTEXITCODE -ne 0 -or ($serverVersion -join ' ') -notlike "*jetls version $($pins.runtimes.jetls.revision), julia version $($pin.version)*") { throw 'Unexpected JETLS server version' }
                @{ revision = $pins.runtimes.jetls.revision; julia = $pin.version } | ConvertTo-Json | Set-Content $readyFile -Encoding utf8
                $evidence.runtimes.jetls = @{ revision = $pins.runtimes.jetls.revision; observedVersion = ($serverVersion -join ' ') }
            }
            default { Install-Archive "$runtime-$($pin.version)" $pin "$output/runtimes/$runtime" }
        }
    }
    if ($Group -eq 'julia') {
        $fatouDirectory = Get-ChildItem "$output/extensions" -Directory | Where-Object Name -Like 'jolars.fatou-*' | Select-Object -First 1
        $fatou = Get-ChildItem $fatouDirectory.FullName -Filter fatou.exe -Recurse -File | Select-Object -First 1
        if (-not $fatou -or (Get-FileHash $fatou.FullName).Hash -ne $pins.runtimes.fatou.sha256) { throw 'Unexpected Fatou server binary' }
    }
    $launch = @{ code = $code; extensions = "$output/empty-user-extensions"; output = $output; julia = $julia; jetlsDepot = $JetlsDepot;
        languages = ($groups[$Group].languages -join ','); waitMs = ($groups[$Group].waitMs ?? 180000) }
    $launch | ConvertTo-Json | Set-Content "$output/launch.json" -Encoding utf8
    $evidence.status = 'ready'
} catch {
    $evidence.status = 'failed'
    $evidence.error = $_.ToString()
    throw
} finally {
    $evidence | ConvertTo-Json -Depth 10 | Set-Content "$output/preparation.json" -Encoding utf8
}
