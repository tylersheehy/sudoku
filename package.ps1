# Builds a clean ZIP of the extension for Chrome Web Store upload.
# Usage: powershell -ExecutionPolicy Bypass -File package.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$version = (Get-Content manifest.json -Raw | ConvertFrom-Json).version
$files = @(
  'manifest.json', 'background.js', 'storage.js', 'solver.js', 'lessons-data.js',
  'game.html', 'game.css', 'game.js',
  'learn.html', 'learn.css', 'learn.js'
) + (Get-ChildItem icons -File | ForEach-Object { "icons/$($_.Name)" })

foreach ($f in $files) { if (-not (Test-Path $f)) { throw "Missing file: $f" } }

New-Item -ItemType Directory -Force dist | Out-Null
$out = Join-Path $PSScriptRoot "dist/sudoku-$version.zip"
if (Test-Path $out) { Remove-Item $out }

# Write entries with forward slashes (Compress-Archive on Windows PowerShell 5.1 uses backslashes).
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
  foreach ($f in $files) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $PSScriptRoot $f), $f) | Out-Null
  }
} finally { $zip.Dispose() }

$size = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host "Packaged dist/sudoku-$version.zip ($($files.Count) files, $size KB)"
