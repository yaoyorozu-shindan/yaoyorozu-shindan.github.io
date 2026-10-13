# Xカード用画像（1200×630）を作る
#   正体ごと：img/ogp/t番号.jpg（材料 tools/ogp-manifest.json）
#   相性ごと：img/ogp/cl番号.jpg（伝説の組み合わせ）・img/ogp/c日干-日干.jpg（材料 tools/ogp-compat-manifest.json）
# 使い方（PowerShell）：  & "tools/make-ogp-images.ps1"                     … 全部
#                         & "tools/make-ogp-images.ps1" -Kind true -Only 1,2   … 正体の一部だけ
#                         & "tools/make-ogp-images.ps1" -Kind compat           … 相性だけ
# 先に node tools/build-articles.js（または sh tools/bump-version.sh）で材料のJSONを作っておくこと。
# 正体の絵・名前や、相性の見出しを変えたときだけ実行すればよい（毎回は不要）。
param([int[]]$Only = @(), [string]$Kind = "all")

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "img\ogp"
$cache = Join-Path $root "tools\.ogp-cache"
New-Item -ItemType Directory -Force $out, $cache | Out-Null
$items = Get-Content (Join-Path $root "tools\ogp-manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json

$W = 1200; $H = 630
$gold = [System.Drawing.Color]::FromArgb(255, 232, 196, 104)
$serif = "Yu Mincho"; $sans = "Yu Gothic"

# 絵を読み込む（ネットの絵は tools/.ogp-cache に保存して使い回す）
function Get-Picture($src) {
  if (-not $src) { return $null }
  if ($src -match "^https?://") {
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $hash = ($md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($src)) | ForEach-Object { $_.ToString("x2") }) -join ""
    $file = Join-Path $cache ($hash + ".img")
    if (-not (Test-Path $file)) {
      Invoke-WebRequest -Uri $src -OutFile $file -UserAgent "yaoyorozu-shindan-ogp/1.0 (personal project)" -UseBasicParsing
      Start-Sleep -Milliseconds 400
    }
  } else { $file = Join-Path $root $src }
  return [System.Drawing.Image]::FromFile($file)
}

# 正方形に切り抜いて描く
function Draw-Square($g, $pic, $x, $y, $size) {
  $s = [Math]::Min($pic.Width, $pic.Height)
  $sx = [int](($pic.Width - $s) / 2); $sy = [int][Math]::Max(0, ($pic.Height - $s) * 0.2)
  $g.DrawImage($pic, (New-Object System.Drawing.Rectangle($x, $y, $size, $size)), (New-Object System.Drawing.Rectangle($sx, $sy, $s, $s)), [System.Drawing.GraphicsUnit]::Pixel)
}

# 背景：左の色 → 夜空 → 右の色
function New-Canvas($colorA, $colorB) {
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"; $g.InterpolationMode = "HighQualityBicubic"; $g.TextRenderingHint = "AntiAliasGridFit"
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend(3)
  $blend.Colors = @([System.Drawing.ColorTranslator]::FromHtml($colorA), [System.Drawing.Color]::FromArgb(255, 24, 20, 44), [System.Drawing.ColorTranslator]::FromHtml($colorB))
  $blend.Positions = @([single]0, [single]0.5, [single]1)
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point(0, 0)), (New-Object System.Drawing.Point($W, 0)), [System.Drawing.Color]::Black, [System.Drawing.Color]::Black)
  $bg.InterpolationColors = $blend
  $g.FillRectangle($bg, 0, 0, $W, $H)
  return @($bmp, $g)
}

function Save-Jpeg($bmp, $name) {
  $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]85)
  $bmp.Save((Join-Path $out ($name + ".jpg")), $enc, $ps)
}

# 文字を中央そろえで描く
function Draw-Center($g, $text, $font, $brush, $cx, $y) {
  $w = $g.MeasureString($text, $font).Width
  $g.DrawString($text, $font, $brush, [single]($cx - $w / 2), [single]$y)
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

if ($Kind -eq "all" -or $Kind -eq "true") {
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
  $pic = Get-Picture $item.img
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
  $g.DrawString("あなたの正体は、何者か。生年月日で無料診断", $fs2, $soft, $tx, 518)
  $g.DrawString("神か、怪異か、それとも…。", $fs2, $soft, $tx, 550)
  # 画像のクレジット（作者・ライセンス）
  if ($item.credit) {
    $fcr = New-Object System.Drawing.Font($sans, 15, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $g.DrawString("画像: " + $item.credit, $fcr, $soft, $bx, $by + $box + 12)
  }

  Save-Jpeg $bmp ("t" + $item.n)
  $g.Dispose(); $bmp.Dispose()
  Write-Output ("t" + $item.n + " " + $item.name)
}
}

# ---- 相性のカード画像 ----
if ($Kind -eq "all" -or $Kind -eq "compat") {
$pairs = Get-Content (Join-Path $root "tools\ogp-compat-manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$white = [System.Drawing.Brushes]::White
$soft = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 255, 255, 255))
$goldBrush = New-Object System.Drawing.SolidBrush($gold)
$goldPen = New-Object System.Drawing.Pen($gold, 6)
$bold = [System.Drawing.FontStyle]::Bold
$px = [System.Drawing.GraphicsUnit]::Pixel
$fFoot = New-Object System.Drawing.Font($sans, 24, $bold, $px)
$fX = New-Object System.Drawing.Font($serif, 90, $bold, $px)
$fTop = New-Object System.Drawing.Font($sans, 30, $bold, $px)
foreach ($p in $pairs) {
  $c = New-Canvas $p.colorA $p.colorB; $bmp = $c[0]; $g = $c[1]
  if ($p.kind -eq "legend") {
    # 伝説の組み合わせ：ふたりの絵を並べ、金色の見出し
    Draw-Center $g "✨ 伝説の組み合わせ ✨" $fTop $goldBrush 600 26
    $size = 300; $ya = 80
    foreach ($side in @(@($p.imgA, 150), @($p.imgB, 750))) {
      $pic = Get-Picture $side[0]
      if ($pic) { Draw-Square $g $pic $side[1] $ya $size; $pic.Dispose() }
      $g.DrawRectangle($goldPen, $side[1] - 3, $ya - 3, $size + 6, $size + 6)
    }
    Draw-Center $g "×" $fX $goldBrush 600 165
    Draw-Center $g $p.a (Fit-Font $g $p.a $serif 42 $bold 380) $white 300 392
    Draw-Center $g $p.b (Fit-Font $g $p.b $serif 42 $bold 380) $white 900 392
    $title = "「" + $p.title + "」"
    Draw-Center $g $title (Fit-Font $g $title $serif 54 $bold 1100) $goldBrush 600 458
    Draw-Center $g "⛩ 八百万診断｜ふたりの相性を無料で診断" $fFoot $soft 600 548
    $credit = @()
    if ($p.creditA) { $credit += ($p.a + "：" + $p.creditA) }
    if ($p.creditB) { $credit += ($p.b + "：" + $p.creditB) }
    if ($credit.Count) {
      $ct = "画像 " + ($credit -join "　")
      Draw-Center $g $ct (Fit-Font $g $ct $sans 14 ([System.Drawing.FontStyle]::Regular) 1160) $soft 600 600
    }
  } else {
    # 日干の組み合わせ：ふたつの日干を丸の中に大きく
    Draw-Center $g "ふたりの相性（四柱推命・日干）" $fTop $soft 600 30
    $fStem = New-Object System.Drawing.Font($serif, 150, $bold, $px)
    $fShort = New-Object System.Drawing.Font($sans, 30, $bold, $px)
    foreach ($side in @(@($p.stemA, $p.shortA, $p.colorA, 330), @($p.stemB, $p.shortB, $p.colorB, 870))) {
      $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($side[2]))
      $g.FillEllipse($brush, $side[3] - 130, 90, 260, 260)
      $g.DrawEllipse($goldPen, $side[3] - 130, 90, 260, 260)
      Draw-Center $g $side[0] $fStem $white $side[3] 115
      Draw-Center $g ("（" + $side[1] + "）") $fShort $soft $side[3] 360
    }
    Draw-Center $g "×" $fX $goldBrush 600 170
    $title = "「" + $p.title + "」"
    Draw-Center $g $title (Fit-Font $g $title $serif 60 $bold 1100) $goldBrush 600 420
    Draw-Center $g $p.rel (New-Object System.Drawing.Font($sans, 28, $bold, $px)) $white 600 500
    Draw-Center $g "⛩ 八百万診断｜ふたりの相性を無料で診断" $fFoot $soft 600 560
  }
  Save-Jpeg $bmp $p.file
  $g.Dispose(); $bmp.Dispose()
  Write-Output ($p.file + " " + $p.title)
}
}

