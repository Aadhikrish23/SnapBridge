import Zeroconf, { Service } from 'react-native-zeroconf';

export interface DiscoveredService {
  name: string;
  host: string;
  port: number;
  uuid: string | null;
}

export class DiscoveryClient {
  private zeroconf: Zeroconf;
  private isScanning = false;
  private onDiscoveredCallback: ((service: DiscoveredService) => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;

  constructor() {
    this.zeroconf = new Zeroconf();
    this.setupListeners();
  }

  private setupListeners() {
    this.zeroconf.on('resolved', (service: Service) => {
      const host = service.addresses?.[0] || service.host;
      const port = service.port;
      const uuid = service.txt?.uuid || null;

      if (host && port) {
        const discovered: DiscoveredService = {
          name: service.name,
          host,
          port,
          uuid,
        };
        if (this.onDiscoveredCallback) {
          this.onDiscoveredCallback(discovered);
        }
      }
    });

    this.zeroconf.on('error', (err: any) => {
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
    });
  }

  public onDiscovered(callback: (service: DiscoveredService) => void) {
    this.onDiscoveredCallback = callback;
  }

  public onError(callback: (err: any) => void) {
    this.onErrorCallback = callback;
  }

  public startScan() {
    if (this.isScanning) return;
    this.isScanning = true;
    try {
      this.zeroconf.scan('snapbridge', 'tcp');
    } catch (err) {
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
    }
  }

  public stopScan() {
    if (!this.isScanning) return;
    this.isScanning = false;
    try {
      this.zeroconf.stop();
    } catch (err) {
      // ignore
    }
  }
}
