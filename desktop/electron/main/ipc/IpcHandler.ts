import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as QRCode from 'qrcode';
import { IConfigurationService } from '../domain/IConfigurationService';
import { IPersistenceService } from '../domain/IPersistenceService';
import { ILogger } from '../domain/ILogger';
import { HttpServer } from '../services/network/HttpServer';
import { CryptoService } from '../services/security/CryptoService';
import { IDiscoveryService } from '../domain/IDiscoveryService';

export class IpcHandler {
  private configService: IConfigurationService;
  private db: IPersistenceService;
  private logger: ILogger;
  private server: HttpServer;
  private crypto: CryptoService;
  private discoveryService: IDiscoveryService;

  constructor(
    configService: IConfigurationService,
    db: IPersistenceService,
    logger: ILogger,
    server: HttpServer,
    crypto: CryptoService,
    discoveryService: IDiscoveryService
  ) {
    this.configService = configService;
    this.db = db;
    this.logger = logger;
    this.server = server;
    this.crypto = crypto;
    this.discoveryService = discoveryService;
  }

  public register(): void {
    // Retrieve configuration settings
    ipcMain.handle('get-settings', () => {
      return this.configService.load();
    });

    // Save configuration settings
    ipcMain.handle('save-settings', async (_, updatedConfig) => {
      try {
        const oldPort = this.configService.get('port');
        const newPort = updatedConfig.port;

        this.configService.save(updatedConfig);

        // If port changed dynamically, restart the server and discovery service
        if (oldPort !== newPort) {
          if (this.server.isListening()) {
            this.logger.info(`Port changed from ${oldPort} to ${newPort}. Restarting HTTP server...`);
            await this.server.stop();
            await this.server.start(newPort);
          }
          if (this.discoveryService.isAdvertising()) {
            this.logger.info(`Port changed from ${oldPort} to ${newPort}. Restarting mDNS discovery...`);
            this.discoveryService.stop();
            this.discoveryService.start(newPort);
          }
        }

        return { success: true };
      } catch (err: any) {
        this.logger.error('Failed to save settings via IPC:', err);
        return { success: false, error: err.message };
      }
    });

    // Trigger select upload folder dialog
    ipcMain.handle('select-folder', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return null;
      
      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    });

    // Generate QR Pairing Data url
    ipcMain.handle('get-qr-data', async () => {
      try {
        let desktopUuid = this.db.getSetting('desktop_uuid');
        if (!desktopUuid) {
          desktopUuid = this.crypto.generateRandomToken(16);
          this.db.setSetting('desktop_uuid', desktopUuid, 1);
        }

        const pairingSecret = this.crypto.generateRandomToken(16);
        this.db.setSetting('pairing_secret_temp', pairingSecret, 1);

        const payload = {
          uuid: desktopUuid,
          secret: pairingSecret,
          service: 'snapbridge',
          port: this.configService.get('port')
        };

        const jsonString = JSON.stringify(payload);
        const qrDataUrl = await QRCode.toDataURL(jsonString);

        return {
          payload,
          qrDataUrl
        };
      } catch (err: any) {
        this.logger.error('Failed to generate QR pairing data:', err);
        throw err;
      }
    });

    // Reset device pairing records
    ipcMain.handle('reset-pairing', () => {
      try {
        this.db.deleteAllPairedDevices();
        this.db.deleteSetting('desktop_uuid');
        this.db.deleteSetting('pairing_secret_temp');
        this.logger.info('Pairing records and identifier reset.');

        // Restart discovery advertisement so it updates the TXT record with new generated UUID
        if (this.discoveryService.isAdvertising()) {
          this.logger.info('Re-starting discovery advertisement after pairing reset...');
          const currentPort = this.configService.get('port');
          this.discoveryService.stop();
          this.discoveryService.start(currentPort);
        }

        return { success: true };
      } catch (err: any) {
        this.logger.error('Failed to reset pairing records:', err);
        return { success: false, error: err.message };
      }
    });
  }
}
