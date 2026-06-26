import { Bonjour, Service } from 'bonjour-service';
import { IDiscoveryService } from '../../domain/IDiscoveryService';
import { ILogger } from '../../domain/ILogger';
import { IPersistenceService } from '../../domain/IPersistenceService';
import { ICryptoService } from 'shared';
import * as os from 'os';

export class DiscoveryService implements IDiscoveryService {
  private bonjour: Bonjour | null = null;
  private service: Service | null = null;
  private logger: ILogger;
  private db: IPersistenceService;
  private crypto: ICryptoService;

  constructor(logger: ILogger, db: IPersistenceService, crypto: ICryptoService) {
    this.logger = logger;
    this.db = db;
    this.crypto = crypto;
  }

  public start(port: number): void {
    if (this.service) {
      this.logger.warn('mDNS Discovery service is already advertising.');
      return;
    }

    try {
      this.bonjour = new Bonjour();
      
      let desktopUuid = this.db.getSetting('desktop_uuid');
      if (!desktopUuid) {
        desktopUuid = this.crypto.generateRandomToken(16);
        this.db.setSetting('desktop_uuid', desktopUuid, 1);
      }

      const hostname = os.hostname();
      const serviceName = `SnapBridge-${hostname}`;

      this.logger.info(`Starting mDNS advertisement: name=${serviceName}, type=snapbridge, port=${port}, uuid=${desktopUuid}`);

      this.service = this.bonjour.publish({
        name: serviceName,
        type: 'snapbridge',
        protocol: 'tcp',
        port: port,
        txt: {
          uuid: desktopUuid,
        },
      });

      this.service.on('error', (err) => {
        this.logger.error('mDNS Discovery Service error:', err);
      });
    } catch (error) {
      this.logger.error('Failed to start mDNS Discovery service:', error);
    }
  }

  public stop(): void {
    if (!this.service) {
      return;
    }

    try {
      this.logger.info('Stopping mDNS advertisement...');
      // bonjour-service stop can be called synchronously, or it can take a callback.
      // We will stop the service and destroy the bonjour instance.
      this.service.stop();
      this.service = null;
      
      if (this.bonjour) {
        this.bonjour.destroy();
        this.bonjour = null;
      }
      this.logger.info('mDNS advertisement stopped.');
    } catch (error) {
      this.logger.error('Error stopping mDNS advertisement:', error);
      if (this.bonjour) {
        try {
          this.bonjour.destroy();
        } catch {}
        this.bonjour = null;
      }
      this.service = null;
    }
  }

  public isAdvertising(): boolean {
    return this.service !== null;
  }
}
