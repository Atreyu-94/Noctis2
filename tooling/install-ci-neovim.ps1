$ErrorActionPreference = 'Stop'
$version = 'v0.12.6'
$destination = Join-Path $env:RUNNER_TEMP 'noctis2-nvim'
New-Item -ItemType Directory -Path $destination | Out-Null
if ($IsWindows) {
    $archive = Join-Path $destination 'nvim.zip'
    Invoke-WebRequest "https://github.com/neovim/neovim/releases/download/$version/nvim-win64.zip" -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $destination
    Join-Path $destination 'nvim-win64/bin' | Add-Content -LiteralPath $env:GITHUB_PATH
} else {
    $archive = Join-Path $destination 'nvim.tar.gz'
    Invoke-WebRequest "https://github.com/neovim/neovim/releases/download/$version/nvim-linux-x86_64.tar.gz" -OutFile $archive
    tar -xzf $archive -C $destination
    if ($LASTEXITCODE -ne 0) { throw 'Neovim extraction failed' }
    Join-Path $destination 'nvim-linux-x86_64/bin' | Add-Content -LiteralPath $env:GITHUB_PATH
}
