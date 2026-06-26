import * as path from 'path';
import { IPersistenceService } from '../../domain/IPersistenceService';
import { PairedDevice, UploadHistoryRecord } from 'shared';
import { ILogger } from '../../domain/ILogger';
import { JsonStore } from './JsonStore';
import { SettingsRepository, SettingEntry } from './SettingsRepository';
import { PairedDevicesRepository } from './PairedDevicesRepository';
import { HistoryRepository } from './HistoryRepository';

export class JsonPersistenceService implements IPersistenceService {
  private logger: ILogger;
  private storageDir: string;
  private isConnected = false;

  private settingsRepo!: SettingsRepository;
  private devicesRepo!: PairedDevicesRepository;
  private historyRepo!: HistoryRepository;

  constructor(logger: ILogger, customStorageDir?: string) {
    this.logger = logger;
    if (customStorageDir) {
      this.storageDir = customStorageDir;
    } else {
      try {
        const { app } = require('electron');
        if (app) {
          const userData = app.getPath('userData');
          this.storageDir = path.join(userData, 'storage');
        } else {
          this.storageDir = path.join(process.cwd(), 'storage');
        }
      } catch {
        this.storageDir = path.join(process.cwd(), 'storage');
      }
    }
  }

  public connect(): void {
    if (this.isConnected) return;

    try {
      const settingsStore = new JsonStore<{ [key: string]: SettingEntry }>(
        path.join(this.storageDir, 'settings.json'),
        1,
        {}
      );
      const devicesStore = new JsonStore<PairedDevice[]>(
        path.join(this.storageDir, 'paired-devices.json'),
        1,
        []
      );
      const historyStore = new JsonStore<UploadHistoryRecord[]>(
        path.join(this.storageDir, 'history.json'),
        1,
        []
      );

      this.settingsRepo = new SettingsRepository(settingsStore);
      this.devicesRepo = new PairedDevicesRepository(devicesStore);
      this.historyRepo = new HistoryRepository(historyStore);

      this.isConnected = true;
      this.logger.info(`Connected to JSON persistence service at storage folder: ${this.storageDir}`);
    } catch (error) {
      this.logger.error(`Failed to connect JSON persistence service at ${this.storageDir}`, error);
      throw error;
    }
  }

  public disconnect(): void {
    this.isConnected = false;
    this.logger.info('JSON persistence service disconnected');
  }

  // --- Settings Repository Delegation ---

  public getSetting(key: string): string | null {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    return this.settingsRepo.get(key);
  }

  public setSetting(key: string, value: string, schemaVersion: number): void {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    this.settingsRepo.set(key, value, schemaVersion);
  }

  public deleteSetting(key: string): void {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    this.settingsRepo.delete(key);
  }

  // --- Paired Devices Repository Delegation ---

  public getPairedDevice(deviceId: string): PairedDevice | null {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    return this.devicesRepo.get(deviceId);
  }

  public getAllPairedDevices(): PairedDevice[] {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    return this.devicesRepo.getAll();
  }

  public savePairedDevice(device: PairedDevice): void {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    this.devicesRepo.save(device);
  }

  public deletePairedDevice(deviceId: string): void {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    this.devicesRepo.delete(deviceId);
  }

  public deleteAllPairedDevices(): void {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    this.devicesRepo.deleteAll();
  }

  // --- Upload History Repository Delegation ---

  public saveUpload(upload: UploadHistoryRecord): void {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    this.historyRepo.save(upload);
  }

  public getUpload(uploadId: string): UploadHistoryRecord | null {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    return this.historyRepo.get(uploadId);
  }

  public getAllUploads(): UploadHistoryRecord[] {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    return this.historyRepo.getAll();
  }

  public deleteUpload(uploadId: string): void {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    this.historyRepo.delete(uploadId);
  }

  public deleteAllUploads(): void {
    if (!this.isConnected) throw new Error('Persistence service is not connected');
    this.historyRepo.deleteAll();
  }
}
