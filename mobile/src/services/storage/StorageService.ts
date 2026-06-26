import { MMKV } from 'react-native-mmkv';
import { MobileConfig } from '../../types';

const STORAGE_KEY = 'snapbridge.config';
const DEFAULT_DEVICE_NAME = 'Android Device';

export class StorageService {
  private storage: MMKV;

  constructor() {
    this.storage = new MMKV({ id: 'snapbridge-storage' });
  }

  public loadConfig(): MobileConfig {
    const raw = this.storage.getString(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as MobileConfig;
      } catch {
        // Corrupted config, return defaults
      }
    }
    return this.getDefaults();
  }

  public saveConfig(config: MobileConfig): void {
    this.storage.set(STORAGE_KEY, JSON.stringify(config));
  }

  public updateConfig(partial: Partial<MobileConfig>): MobileConfig {
    const current = this.loadConfig();
    const updated = { ...current, ...partial };
    this.saveConfig(updated);
    return updated;
  }

  public clearAll(): void {
    this.storage.clearAll();
  }

  public getString(key: string): string | undefined {
    return this.storage.getString(key);
  }

  public setString(key: string, value: string): void {
    this.storage.set(key, value);
  }

  public deleteKey(key: string): void {
    this.storage.delete(key);
  }

  public savePendingUpload(upload: CapturedImage | null): void {
    if (upload === null) {
      this.storage.delete('snapbridge.pending_upload');
    } else {
      this.storage.set('snapbridge.pending_upload', JSON.stringify(upload));
    }
  }

  public getPendingUpload(): CapturedImage | null {
    const raw = this.storage.getString('snapbridge.pending_upload');
    if (raw) {
      try {
        return JSON.parse(raw) as CapturedImage;
      } catch {}
    }
    return null;
  }

  private getDefaults(): MobileConfig {
    return {
      desktopHost: null,
      desktopPort: 53210,
      deviceId: this.getOrCreateDeviceId(),
      deviceName: DEFAULT_DEVICE_NAME,
      pairingSecret: null,
      pairedDesktopId: null,
      pairedDesktopName: null,
      qualityPreset: 'Balanced',
      autoUpload: false,
      autoReturn: true,
    };
  }

  private getOrCreateDeviceId(): string {
    const existing = this.storage.getString('snapbridge.device_id');
    if (existing) return existing;

    // Generate a UUID-like identifier
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    this.storage.set('snapbridge.device_id', id);
    return id;
  }
}
