import { StorageService } from '../src/services/storage/StorageService';

jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => {
      const store = new Map<string, string>();
      return {
        getString: jest.fn((key) => store.get(key)),
        set: jest.fn((key, val) => {
          store.set(key, val.toString());
        }),
        delete: jest.fn((key) => store.delete(key)),
        clearAll: jest.fn(() => store.clear()),
      };
    }),
  };
});

describe('StorageService (MMKV Persistence)', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
  });

  test('should load default configuration when empty', () => {
    const config = storage.loadConfig();
    expect(config.deviceName).toBe('Android Device');
    expect(config.qualityPreset).toBe('Balanced');
    expect(config.autoReturn).toBe(true);
    expect(config.desktopHost).toBeNull();
  });

  test('should save and update configuration', () => {
    storage.updateConfig({
      deviceName: 'Pixel 9',
      qualityPreset: 'High',
      desktopHost: '192.168.1.100',
    });

    const config = storage.loadConfig();
    expect(config.deviceName).toBe('Pixel 9');
    expect(config.qualityPreset).toBe('High');
    expect(config.desktopHost).toBe('192.168.1.100');
  });

  test('should handle pending upload queue', () => {
    const image = {
      uri: 'file:///path/to/test.jpg',
      width: 100,
      height: 200,
      mimeType: 'image/jpeg',
      fileSize: 500,
      fileName: 'test.jpg',
    };

    storage.savePendingUpload(image);
    const pending = storage.getPendingUpload();
    expect(pending).toEqual(image);

    storage.savePendingUpload(null);
    expect(storage.getPendingUpload()).toBeNull();
  });
});
