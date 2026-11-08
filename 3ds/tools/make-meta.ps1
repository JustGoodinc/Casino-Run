# Builds the HOME Menu art from the original sprites (nearest-neighbour, no new pixels drawn):
#   3ds/meta/icon.png   48x48  - Dice on the cabinet pattern with a gold frame
#   3ds/meta/banner.png 256x128 - the Casino Run logo at 2x on the cabinet pattern
# Run from anywhere: powershell -File 3ds/tools/make-meta.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$spr = Join-Path $root "assets\sprites"
$meta = Join-Path $root "3ds\meta"
New-Item -ItemType Directory -Force $meta | Out-Null

function Tile($g, $img, $w, $h) { for ($y = 0; $y -lt $h; $y += $img.Height) { for ($x = 0; $x -lt $w; $x += $img.Width) { $g.DrawImage($img, $x, $y, $img.Width, $img.Height) } } }
function Canvas($w, $h) {
  $b = New-Object Drawing.Bitmap $w, $h
  $g = [Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = 'NearestNeighbor'; $g.PixelOffsetMode = 'Half'; $g.SmoothingMode = 'None'
  $g.Clear([Drawing.Color]::FromArgb(255, 0x19, 0x17, 0x27))
  return $b, $g
}
$cab = [Drawing.Image]::FromFile("$spr\tiles\cabinet.png")
$host_ = [Drawing.Image]::FromFile("$spr\characters\host.png")   # 3 frames of 24x28: idle, happy, sad
$logo = [Drawing.Image]::FromFile("$spr\ui\logo.png")            # 118x63

# Icon: happy Dice (frame 1) at 2x; the frame crops at the knees.
$b, $g = Canvas 48 48
Tile $g $cab 48 48
$g.DrawImage($host_, (New-Object Drawing.Rectangle 0, 2, 48, 56), (New-Object Drawing.Rectangle 24, 0, 24, 28), 'Pixel')
$ink = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(255, 0x0E, 0x0C, 0x17))
$gold = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(255, 0xF4, 0xC3, 0x4E))
foreach ($r in @(@(0,0,48,1),@(0,47,48,1),@(0,0,1,48),@(47,0,1,48))) { $g.FillRectangle($ink, $r[0], $r[1], $r[2], $r[3]) }
foreach ($r in @(@(1,1,46,1),@(1,46,46,1),@(1,1,1,46),@(46,1,1,46))) { $g.FillRectangle($gold, $r[0], $r[1], $r[2], $r[3]) }
$b.Save("$meta\icon.png"); $g.Dispose(); $b.Dispose()

# Banner: logo at 2x, centred.
$b, $g = Canvas 256 128
Tile $g $cab 256 128
$g.DrawImage($logo, (New-Object Drawing.Rectangle 10, 1, 236, 126), (New-Object Drawing.Rectangle 0, 0, 118, 63), 'Pixel')
$b.Save("$meta\banner.png"); $g.Dispose(); $b.Dispose()
$cab.Dispose(); $host_.Dispose(); $logo.Dispose()
"wrote $meta\icon.png and $meta\banner.png"
