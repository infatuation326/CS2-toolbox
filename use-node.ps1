$nodeDir = Join-Path $PSScriptRoot '.tools\node-v24.18.0-win-x64'
if (!(Test-Path (Join-Path $nodeDir 'node.exe'))) {
  throw "Node not found: $nodeDir"
}
$env:Path = "$nodeDir;$env:Path"
Write-Host "Node enabled for this PowerShell session:" -ForegroundColor Green
& (Join-Path $nodeDir 'node.exe') --version
& (Join-Path $nodeDir 'npm.cmd') --version
Write-Host "Use npm.cmd instead of npm in PowerShell if execution policy blocks npm.ps1." -ForegroundColor Yellow
