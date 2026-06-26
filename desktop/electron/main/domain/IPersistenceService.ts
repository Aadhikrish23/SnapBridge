import { PairedDevice, UploadHistoryRecord } from 'shared';

export interface IPersistenceService {
  /**
   * Connects and initializes persistence storage.
   */
  connect(): void;

  /**
   * Disconnects and releases any resources.
   */
  disconnect(): void;

  // Settings Storage
  getSetting(key: string): string | null;
  setSetting(key: string, value: string, schemaVersion: number): void;
  deleteSetting(key: string): void;

  // Paired Devices Storage
  getPairedDevice(deviceId: string): PairedDevice | null;
  getAllPairedDevices(): PairedDevice[];
  savePairedDevice(device: PairedDevice): void;
  deletePairedDevice(deviceId: string): void;
  deleteAllPairedDevices(): void;

  // Upload History Storage
  saveUpload(upload: UploadHistoryRecord): void;
  getUpload(uploadId: string): UploadHistoryRecord | null;
  getAllUploads(): UploadHistoryRecord[];
  deleteUpload(uploadId: string): void;
  deleteAllUploads(): void;
}
