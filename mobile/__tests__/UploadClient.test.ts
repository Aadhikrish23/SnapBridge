import { UploadClient } from '../src/services/network/UploadClient';
import { ServiceProvider } from '../src/services/ServiceProvider';

jest.mock('react-native-image-picker', () => {
  return {
    launchCamera: jest.fn(),
    launchImageLibrary: jest.fn(),
  };
});

const mockConfigStore = new Map<string, string>();

jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => {
      mockConfigStore.set('snapbridge.config', JSON.stringify({
        deviceId: 'device-123',
        deviceName: 'Android Device',
        desktopHost: '192.168.1.50',
        desktopPort: 53210,
        pairingSecret: 'secret-123',
        qualityPreset: 'Balanced',
        autoUpload: false,
        autoReturn: true,
      }));
      return {
        getString: jest.fn((key) => mockConfigStore.get(key)),
        set: jest.fn((key, val) => {
          mockConfigStore.set(key, val.toString());
        }),
        delete: jest.fn((key) => mockConfigStore.delete(key)),
        clearAll: jest.fn(() => mockConfigStore.clear()),
      };
    }),
  };
});

describe('UploadClient Service', () => {
  let client: UploadClient;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    client = new UploadClient();
    originalFetch = global.fetch;
    ServiceProvider.storage.savePendingUpload(null); // Clear queue
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('should fail upload if file size exceeds MAX_FILE_SIZE_BYTES', async () => {
    const largeImage = {
      uri: 'file:///path/large.jpg',
      width: 4000,
      height: 3000,
      mimeType: 'image/jpeg',
      fileSize: 20 * 1024 * 1024, // 20MB (limit is 15MB)
      fileName: 'large.jpg',
    };

    const res = await client.uploadImage(largeImage);
    expect(res.success).toBe(false);
    expect(res.message).toContain('exceeds maximum limit of 15MB');
  });

  test('should query /ping first and handle offline server gracefully', async () => {
    const image = {
      uri: 'file:///path/photo.jpg',
      width: 1000,
      height: 1000,
      mimeType: 'image/jpeg',
      fileSize: 1024,
      fileName: 'photo.jpg',
    };

    // Mock fetch to reject for ping
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const res = await client.uploadImage(image);
    expect(res.success).toBe(false);
    expect(res.message).toContain('Desktop server is offline');
    
    // Should be added to pending failed upload queue
    expect(ServiceProvider.storage.getPendingUpload()).toEqual(image);
  });

  test('should succeed upload when ping and upload requests resolve successfully', async () => {
    const image = {
      uri: 'file:///path/photo.jpg',
      width: 1000,
      height: 1000,
      mimeType: 'image/jpeg',
      fileSize: 1024,
      fileName: 'photo.jpg',
    };

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.endsWith('/ping')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok' }),
        });
      }
      if (url.endsWith('/upload')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, uploadId: 'id-123' }),
        });
      }
      if (url.startsWith('file://')) {
        return Promise.resolve({
          blob: () => Promise.resolve({ size: 1024 }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await client.uploadImage(image);
    expect(res.success).toBe(true);
    expect(res.uploadId).toBe('id-123');
    expect(ServiceProvider.storage.getPendingUpload()).toBeNull();
  });

  test('should perform exactly 1 retry on upload network failure before queueing', async () => {
    const image = {
      uri: 'file:///path/photo.jpg',
      width: 1000,
      height: 1000,
      mimeType: 'image/jpeg',
      fileSize: 1024,
      fileName: 'photo.jpg',
    };

    let uploadAttempts = 0;

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.endsWith('/ping')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok' }),
        });
      }
      if (url.endsWith('/upload')) {
        uploadAttempts++;
        return Promise.reject(new Error('Socket timeout'));
      }
      if (url.startsWith('file://')) {
        return Promise.resolve({
          blob: () => Promise.resolve({ size: 1024 }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await client.uploadImage(image);
    expect(res.success).toBe(false);
    expect(uploadAttempts).toBe(2); // Attempt 1 + 1 retry
    expect(ServiceProvider.storage.getPendingUpload()).toEqual(image);
  });

  test('should pair with desktop successfully on POST /pair', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.endsWith('/pair')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            deviceId: 'desktop-999',
            deviceName: 'Windows Laptop',
            message: 'Paired!'
          }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await client.pairDevice('192.168.1.100', 53210, 'temp-secret');
    expect(res.success).toBe(true);
    expect(res.deviceName).toBe('Windows Laptop');

    const config = ServiceProvider.storage.loadConfig();
    expect(config.desktopHost).toBe('192.168.1.100');
    expect(config.pairedDesktopId).toBe('desktop-999');
    expect(config.pairingSecret).toBe('temp-secret');
  });
});
