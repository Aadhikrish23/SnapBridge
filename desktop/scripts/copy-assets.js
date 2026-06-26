const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      // Only copy non-typescript assets (HTML, CSS, media)
      if (
        element.endsWith('.html') ||
        element.endsWith('.css') ||
        element.endsWith('.png') ||
        element.endsWith('.jpg') ||
        element.endsWith('.ico')
      ) {
        fs.copyFileSync(path.join(from, element), path.join(to, element));
      }
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

const srcDir = path.join(__dirname, '../electron/renderer');
const destDir = path.join(__dirname, '../dist/renderer');
copyFolderSync(srcDir, destDir);
console.log('Renderer assets copied successfully.');
