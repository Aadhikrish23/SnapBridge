const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourceIcon = path.join(root, 'assets', 'snapbridge-icon.png');

if (!fs.existsSync(sourceIcon)) {
  console.error('Missing source icon at', sourceIcon);
  process.exit(1);
}

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const mobileRes = path.join(root, 'mobile', 'android', 'app', 'src', 'main', 'res');
const desktopAssets = path.join(root, 'desktop', 'assets');

fs.mkdirSync(desktopAssets, { recursive: true });

const psScript = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${sourceIcon.replace(/\\/g, '\\\\')}')
function Resize($size, $out) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($src, 0, 0, $size, $size)
  $g.Dispose()
  $dir = Split-Path $out
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
${Object.entries(sizes)
  .map(([folder, size]) => {
    const dir = path.join(mobileRes, folder).replace(/\\/g, '\\\\');
    return `Resize ${size} '${dir}\\\\ic_launcher.png'
Resize ${size} '${dir}\\\\ic_launcher_round.png'`;
  })
  .join('\n')}
Resize 32 '${path.join(desktopAssets, 'tray.png').replace(/\\/g, '\\\\')}'
Resize 256 '${path.join(desktopAssets, 'icon.png').replace(/\\/g, '\\\\')}'
$src.Dispose()
`;

const result = spawnSync('powershell', ['-NoProfile', '-Command', psScript], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const adaptiveDir = path.join(mobileRes, 'mipmap-anydpi-v26');
fs.mkdirSync(adaptiveDir, { recursive: true });

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher"/>
</adaptive-icon>
`;

fs.writeFileSync(path.join(adaptiveDir, 'ic_launcher.xml'), adaptiveIcon);
fs.writeFileSync(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptiveIcon);

const colorsDir = path.join(mobileRes, 'values');
fs.mkdirSync(colorsDir, { recursive: true });
const colorsPath = path.join(colorsDir, 'colors.xml');
if (!fs.existsSync(colorsPath)) {
  fs.writeFileSync(
    colorsPath,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#4F46E5</color>
</resources>
`,
  );
} else if (!fs.readFileSync(colorsPath, 'utf8').includes('ic_launcher_background')) {
  const content = fs.readFileSync(colorsPath, 'utf8').replace(
    '</resources>',
    '    <color name="ic_launcher_background">#4F46E5</color>\n</resources>',
  );
  fs.writeFileSync(colorsPath, content);
}

console.log('Icons generated for mobile and desktop.');
