# 正体ごとのXカード用画像（img/ogp/t番号.jpg、1200×630）を作る
# 使い方（PowerShell）：  powershell -ExecutionPolicy Bypass -File tools\make-ogp-images.ps1
# 先に node tools/build-articles.js（または sh tools/bump-version.sh）で tools/ogp-manifest.json を作っておくこと。
# 正体の絵を変えたり、正体を増やしたりしたときだけ実行すればよい（毎回は不要）。
param([int[]]$Only = @())

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "img\ogp"
$cache = Join-Path $root "tools\.ogp-cache"
New-Item -ItemType Directory -Force $out, $cache | Out-Null
$items = Get-Content (Join-Path $root "tools\ogp-manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json

$W = 1200; $H = 630
$gold = [System.Drawing.Color]::FromArgb(255, 232, 196, 104)
$serif = "Yu Mincho"; $sans = "Yu Gothic"

function Get-Picture($item) {
  if (-not $item.img) { return $null }
  if ($item.img -match "^https?://") {
    $file = Join-Path $cache ("t" + $item.n + ".img")
    if (-not (Test-Path $file)) {
      Invoke-WebRequest -Uri $item.img -OutFile $file -UserAgent "yaoyorozu-shindan-ogp/1.0 (personal project)" -UseBasicParsing
      Start-Sleep -Milliseconds 400
    }
  } else { $file = Join-Path $root $item.img }
  return [System.Drawing.Image]::FromFile($file)
}

# 幅に収まる大きさまで文字を小さくする
function Fit-Font($g, $text, $family, $size, $style, $maxWidth) {
  while ($size -gt 12) {
    $f = New-Object System.Drawing.Font($family, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    if ($g.MeasureString($text, $f).Width -le $maxWidth) { return $f }
    $f.Dispose(); $size -= 2
  }
  return New-Object System.Drawing.Font($family, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}

foreach ($item in $items) {
  if ($Only.Count -and -not ($Only -contains $item.n)) { continue }
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"; $g.InterpolationMode = "HighQualityBicubic"; $g.TextRenderingHint = "AntiAliasGridFit"

  # 背景：属性の色から夜空の色へ
  $c = [System.Drawing.ColorTranslator]::FromHtml($item.color)
  $dark = [System.Drawing.Color]::FromArgb(255, 24, 20, 44)
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point(0, 0)), (New-Object System.Drawing.Point($W, $H)), $c, $dark)
  $g.FillRectangle($bg, 0, 0, $W, $H)
  $glow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
  $g.FillEllipse($glow, -120, -160, 760, 760)

  # 左：正体の絵（正方形に切り抜き、金の枠）
  $box = 470; $bx = 60; $by = 60
  $pic = Get-Picture $item
  if ($pic) {
    $s = [Math]::Min($pic.Width, $pic.Height)
    $sx = [int](($pic.Width - $s) / 2); $sy = [int][Math]::Max(0, ($pic.Height - $s) * 0.2)
    $g.DrawImage($pic, (New-Object System.Drawing.Rectangle($bx, $by, $box, $box)), (New-Object System.Drawing.Rectangle($sx, $sy, $s, $s)), [System.Drawing.GraphicsUnit]::Pixel)
    $pic.Dispose()
  }
  $pen = New-Object System.Drawing.Pen($gold, 6)
  $g.DrawRectangle($pen, $bx - 3, $by - 3, $box + 6, $box + 6)

  # 右：文字
  $tx = 580; $tw = 570
  $white = [System.Drawing.Brushes]::White
  $soft = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 255, 255, 255))
  $goldBrush = New-Object System.Drawing.SolidBrush($gold)
  $f1 = New-Object System.Drawing.Font($sans, 30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString("私の本当の正体は——", $f1, $soft, $tx, 92)
  $fName = Fit-Font $g $item.name $serif 104 ([System.Drawing.FontStyle]::Bold) $tw
  $g.DrawString($item.name, $fName, $goldBrush, $tx - 6, 140)
  $y = 140 + $fName.Height
  if ($item.kana) {
    $fk = New-Object System.Drawing.Font($sans, 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $g.DrawString($item.kana, $fk, $soft, $tx, $y - 6); $y += 30
  }
  $fo = New-Object System.Drawing.Font($sans, 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString($item.origin, $fo, $soft, $tx, $y + 6); $y += 52
  # キャッチコピー：1行に収まるならそのまま、長ければ半分ずつの2行に分ける
  $catch = "「" + $item.catch + "」"
  $fc = Fit-Font $g $catch $serif 40 ([System.Drawing.FontStyle]::Bold) $tw
  if ($fc.Size -ge 30) { $lines = @($catch) } else {
    $half = [int][Math]::Ceiling($catch.Length / 2)
    $lines = @($catch.Substring(0, $half), $catch.Substring($half))
    $fc = Fit-Font $g $lines[0] $serif 38 ([System.Drawing.FontStyle]::Bold) $tw
  }
  foreach ($l in $lines) { $g.DrawString($l, $fc, $white, $tx, $y); $y += [int]($fc.Size * 1.35) }

  # 下：サイト名と案内
  $fs = New-Object System.Drawing.Font($sans, 28, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString("⛩ 八百万診断", $fs, $goldBrush, $tx, 478)
  $fs2 = New-Object System.Drawing.Font($sans, 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString("あなたの正体は神か、妖怪か。生年月日で無料診断", $fs2, $soft, $tx, 518)
  # 画像のクレジット（作者・ライセンス）
  if ($item.credit) {
    $fcr = New-Object System.Drawing.Font($sans, 15, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $g.DrawString("画像: " + $item.credit, $fcr, $soft, $bx, $by + $box + 12)
  }

  # JPEG で保存
  $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]85)
  $bmp.Save((Join-Path $out ("t" + $item.n + ".jpg")), $enc, $ps)
  $g.Dispose(); $bmp.Dispose()
  Write-Output ("t" + $item.n + " " + $item.name)
}
