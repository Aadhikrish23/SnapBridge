import { DiscoveryClient } from '../src/services/network/DiscoveryClient';

const mockListeners = new Map<string, Function>();

jest.mock('react-native-zeroconf', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn().mockImplementation((event, callback) => {
        mockListeners.set(event, callback);
      }),
      scan: jest.fn(),
      stop: jest.fn(),
    };
  });
});

describe('DiscoveryClient (Zeroconf mDNS)', () => {
  let client: DiscoveryClient;

  beforeEach(() => {
    client = new DiscoveryClient();
  });

  test('should trigger discovered callback when zeroconf resolves service', () => {
    const discoveredServices: any[] = [];
    client.onDiscovered((svc) => {
      discoveredServices.push(svc);
    });

    const resolvedCallback = mockListeners.get('resolved');
    expect(resolvedCallback).toBeDefined();

    // Trigger resolved event
    resolvedCallback!({
      name: 'SnapBridge-Host',
      host: '192.168.1.55',
      port: 53210,
      addresses: ['192.168.1.55'],
      txt: {
        uuid: 'host-uuid-111',
      },
    });

    expect(discoveredServices).toHaveLength(1);
    expect(discoveredServices[0]).toEqual({
      name: 'SnapBridge-Host',
      host: '192.168.1.55',
      port: 53210,
      uuid: 'host-uuid-111',
    });
  });

  test('should trigger error callback when zeroconf fails', () => {
    const errors: any[] = [];
    client.onError((err) => {
      errors.push(err);
    });

    const errorCallback = mockListeners.get('error');
    expect(errorCallback).toBeDefined();

    errorCallback!(new Error('Zeroconf scan failed'));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Zeroconf scan failed');
  });
});
