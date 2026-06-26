import { app, Menu, Tray, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { IConfigurationService } from '../../domain/IConfigurationService';
import { IPersistenceService } from '../../domain/IPersistenceService';
import { ILogger } from '../../domain/ILogger';

export class TrayManager {
  private tray: Tray | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private qrWindow: BrowserWindow | null = null;

  private configService: IConfigurationService;
  private db: IPersistenceService;
  private logger: ILogger;

  constructor(configService: IConfigurationService, db: IPersistenceService, logger: ILogger) {
    this.configService = configService;
    this.db = db;
    this.logger = logger;
  }

  public initialize(): void {
    // 16x16 simple blue dot icon as self-contained base64 PNG data URL to prevent path issues
    const base64Icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAANElEQVR42mNk+M9QDwPMAEZG7ICRYVQABlAIGsAwKgADKAQNYBgVgAEUggYwjArAAAqGAQYADKYYPDzLhN0AAAAASUVORK5CYII=';
    const icon = nativeImage.createFromDataURL(base64Icon);

    this.tray = new Tray(icon);
    this.tray.setToolTip('SnapBridge');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'SnapBridge', enabled: false },
      { type: 'separator' },
      { label: 'Open Upload Folder', click: () => this.openUploadFolder() },
      { label: 'Show QR Code', click: () => this.showQrWindow() },
      { label: 'Settings', click: () => this.showSettingsWindow() },
      { type: 'separator' },
      { label: 'Exit', click: () => app.quit() }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.logger.info('System tray menu initialized successfully.');
  }

  private openUploadFolder(): void {
    const { shell } = require('electron');
    const folder = this.configService.get('uploadFolder');
    if (folder) {
      try {
        if (!fs.existsSync(folder)) {
          this.logger.info(`Upload directory does not exist. Creating recursively: ${folder}`);
          fs.mkdirSync(folder, { recursive: true });
        }
        shell.openPath(folder).catch((err: any) => this.logger.error('Failed to open upload folder', err));
      } catch (err: any) {
        this.logger.error(`Failed to verify/create upload directory: ${folder}`, err);
      }
    }
  }

  public showSettingsWindow(): void {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 480,
      height: 520,
      title: 'SnapBridge Settings',
      resizable: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const htmlPath = path.join(app.getAppPath(), 'dist/renderer/settings.html');
    this.settingsWindow.loadFile(htmlPath);

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  public showQrWindow(): void {
    if (this.qrWindow) {
      this.qrWindow.focus();
      return;
    }

    this.qrWindow = new BrowserWindow({
      width: 380,
      height: 480,
      title: 'SnapBridge Pairing',
      resizable: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const htmlPath = path.join(app.getAppPath(), 'dist/renderer/qr.html');
    this.qrWindow.loadFile(htmlPath);

    this.qrWindow.on('closed', () => {
      this.qrWindow = null;
    });
  }
}
