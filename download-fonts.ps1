# BTM Font Downloader — Plus Jakarta Sans
# Jalankan SEKALI saat ada internet. Setelah itu app bisa offline.
# Usage: .\download-fonts.ps1

$fontDir = "public\fonts"
if (!(Test-Path $fontDir)) { New-Item -ItemType Directory -Path $fontDir -Force | Out-Null }

$fonts = @(
  @{ Name = "PlusJakartaSans-Regular"; Weight = "400" },
  @{ Name = "PlusJakartaSans-Medium"; Weight = "500" },
  @{ Name = "PlusJakartaSans-SemiBold"; Weight = "600" },
  @{ Name = "PlusJakartaSans-Bold"; Weight = "700" },
  @{ Name = "PlusJakartaSans-ExtraBold"; Weight = "800" },
  @{ Name = "PlusJakartaSans-Italic"; Weight = "400i" },
  @{ Name = "PlusJakartaSans-MediumItalic"; Weight = "500i" }
)

Write-Host "\n🔤 Downloading Plus Jakarta Sans fonts..." -ForegroundColor Cyan

foreach ($font in $fonts) {
  $url = "https://cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@latest/latin-$($font.Weight)-normal.woff2"
  if ($font.Weight -match "i$") {
    $w = $font.Weight -replace "i",""
    $url = "https://cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@latest/latin-$w-italic.woff2"
  }
  $outFile = "$fontDir\$($font.Name).woff2"

  if (Test-Path $outFile) {
    Write-Host "  ⏭️  $($font.Name).woff2 (already exists)" -ForegroundColor Yellow
    continue
  }

  try {
    Invoke-WebRequest -Uri $url -OutFile $outFile -ErrorAction Stop
    $size = (Get-Item $outFile).Length / 1KB
    Write-Host "  ✅ $($font.Name).woff2 ($([math]::Round($size,1)) KB)" -ForegroundColor Green
  } catch {
    Write-Host "  ❌ Failed: $($font.Name) — $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host "\n✅ Font download complete! App sekarang bisa offline." -ForegroundColor Green
Write-Host "   Folder: $fontDir\n" -ForegroundColor Gray
