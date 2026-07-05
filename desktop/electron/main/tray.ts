import * as fs from 'fs';
import * as path from 'path';
import { app, clipboard, Menu, nativeImage, Notification, Tray } from 'electron';
import { getLocalIp, PORT } from './config';
import { openSaveFolder } from './saveImage';

function getIconPath(name: string): string {
  return path.join(__dirname, '..', '..', 'assets', name);
}

function loadTrayIcon(): Electron.NativeImage {
  const trayPath = getIconPath('tray.png');
  const fallbackPath = getIconPath('icon.png');

  if (fs.existsSync(trayPath)) {
    return nativeImage.createFromPath(trayPath);
  }
  if (fs.existsSync(fallbackPath)) {
    return nativeImage.createFromPath(fallbackPath).resize({ width: 32, height: 32 });
  }

  return nativeImage.createEmpty();
}

export type TrayManager = {
  notifyPhotoReceived: (filename: string) => void;
  destroy: () => void;
};

export function createTray(): TrayManager {
  const icon = loadTrayIcon();
  const tray = new Tray(icon);

  const ip = getLocalIp();
  tray.setToolTip(`SnapBridge — ${ip}:${PORT}`);

  const notificationIcon = fs.existsSync(getIconPath('icon.png'))
    ? getIconPath('icon.png')
    : undefined;

  const buildMenu = () =>
    Menu.buildFromTemplate([
      { label: 'SnapBridge', enabled: false },
      { label: `Server: ${ip}:${PORT}`, enabled: false },
      { type: 'separator' },
      {
        label: 'Copy server address',
        click: () => clipboard.writeText(`${ip}:${PORT}`),
      },
      {
        label: 'Open save folder',
        click: () => openSaveFolder(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ]);

  tray.setContextMenu(buildMenu());

  return {
    notifyPhotoReceived(filename: string) {
      tray.setToolTip(`SnapBridge — last: ${filename}`);
      tray.setContextMenu(buildMenu());

      if (Notification.isSupported()) {
        new Notification({
          title: 'SnapBridge',
          body: 'Photo received and copied to clipboard',
          icon: notificationIcon,
        }).show();
      }
    },
    destroy() {
      tray.destroy();
    },
  };
}
