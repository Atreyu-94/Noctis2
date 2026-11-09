$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$runtime = 'test-results/native-semantic/runtimes'
& npm.cmd install --prefix "$runtime/node" --save-exact --ignore-scripts '@vtsls/language-server@0.3.0' 'basedpyright@1.40.2' '@cucumber/language-server@2.0.0' 'vscode-langservers-extracted@4.10.0'
if ($LASTEXITCODE -ne 0) { throw 'Native Node LSP installation failed' }
New-Item -ItemType Directory -Force "$runtime/taplo" | Out-Null
$archive = "$runtime/taplo/taplo.zip"
if (-not (Test-Path $archive)) {
    Invoke-WebRequest 'https://github.com/tamasfe/taplo/releases/download/0.10.0/taplo-windows-x86_64.zip' -OutFile $archive
}
# Pin the actual upstream archive used for the native validation.
if ((Get-FileHash $archive -Algorithm SHA256).Hash -ne '1615EED140039BD58E7089109883B1C434DE5D6DE8F64A993E6E8C80CA57BDF9') {
    throw 'Taplo archive hash mismatch'
}
Expand-Archive $archive -DestinationPath "$runtime/taplo" -Force
$java = 'test-results/semantic-ci/jvm/runtimes/jdk21/jdk-21.0.13+9/bin/java.exe'
$coursier = 'test-results/semantic-ci/jvm/extensions/scalameta.metals-1.72.0/coursier-fallback.jar'
& $java -jar $coursier fetch 'org.scalameta:metals_2.13:1.6.9' --classpath --cache "$runtime/coursier" |
    Set-Content "$runtime/metals-classpath.txt" -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'Metals dependency resolution failed' }
