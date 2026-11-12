# Builds a clean ZIP of the extension for Chrome Web Store upload.
# Usage (from the project folder): powershell -ExecutionPolicy Bypass -File tools/package.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$version = (Get-Content manifest.json -Raw | ConvertFrom-Json).version

# Everything Chrome needs: the manifest plus these folders. Nothing else is shipped.
$folders = 'background', 'game', 'learn', 'shared', 'icons'
$files = @('manifest.json')
foreach ($d in $folders) {
  if (-not (Test-Path $d)) { throw "Missing folder: $d" }
  $files += Get-ChildItem $d -File -Recurse | ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\', '/') }
}

New-Item -ItemType Directory -Force dist | Out-Null
$out = Join-Path $root "dist/sudoku-$version.zip"
if (Test-Path $out) { Remove-Item $out }

# Write entries with forward slashes (Compress-Archive on Windows PowerShell 5.1 uses backslashes).
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
  foreach ($f in $files) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $root $f), $f) | Out-Null
  }
} finally { $zip.Dispose() }

$size = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host "Packaged dist/sudoku-$version.zip ($($files.Count) files, $size KB)"
