
$sourceLogo = "c:\Users\todo2\Downloads\timevault\logo.png"
$iconsDir = "c:\Users\todo2\Downloads\timevault\icons"
$destFavicon = "c:\Users\todo2\Downloads\timevault\favicon.ico"

# Ensure icons directory exists
if (!(Test-Path -Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($sourceLogo)

# Function to resize and save
function Resize-Image {
    param(
        [System.Drawing.Image]$image,
        [int]$size,
        [string]$path
    )
    $canvas = New-Object System.Drawing.Bitmap($size, $size)
    $graph = [System.Drawing.Graphics]::FromImage($canvas)
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.DrawImage($image, 0, 0, $size, $size)
    $canvas.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    $graph.Dispose()
}

# Generate 192x192
Resize-Image -image $img -size 192 -path "$iconsDir\icon-192x192.png"
Write-Host "Generated icon-192x192.png"

# Generate 512x512
Resize-Image -image $img -size 512 -path "$iconsDir\icon-512x512.png"
Write-Host "Generated icon-512x512.png"

# Generate favicon (32x32 for simplicity, saved as .ico if possible, but .png often works. 
# For true .ico in PS without external tools, it's tricky, so we'll save as PNG and rename/use as is for modern browsers, 
# or use a simple resize to 64x64)
# Better: Just save a small PNG as favicon.ico is okay for many dev servers, but for valid ICO we need a header.
# We will save as favicon.png and update HTML to use that if we can't easily make a real ICO.
# However, the user asked for favicon.ico. Let's try to just resize to 64x64 and save as favicon.ico (it's a PNG inside but works often) or just rely on the PNGs.
# Actually, let's just make it a PNG and call it favicon.ico - browsers are lenient.
Resize-Image -image $img -size 64 -path $destFavicon
Write-Host "Generated favicon.ico (64x64)"

$img.Dispose()
