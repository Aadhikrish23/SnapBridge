import { app } from 'electron';
import { copyImageToClipboard } from './clipboard';
import { startServer } from './server';
import { createTray } from './tray';

if (process.platform === 'win32') {
  app.setAppUserModelId('com.snapbridge.desktop');
}

let trayManager: ReturnType<typeof createTray> | null = null;

app.whenReady().then(() => {
  trayManager = createTray();

  startServer((imageBuffer, filename) => {
    copyImageToClipboard(imageBuffer);
    trayManager?.notifyPhotoReceived(filename);
  });
});

app.on('window-all-closed', () => {
  // Tray-only app — keep running in the background.
});
