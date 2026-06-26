import * as path from 'path';
import * as os from 'os';
import { ConfigurationSchema, DEFAULT_PORT } from 'shared';
import { IConfigurationService } from '../../domain/IConfigurationService';
import { IPersistenceService } from '../../domain/IPersistenceService';
import { ILogger } from '../../domain/ILogger';

const SCHEMA_VERSION = 1;

export class ConfigurationService implements IConfigurationService {
  private db: IPersistenceService;
  private logger: ILogger;
  private currentConfig: ConfigurationSchema | null = null;

  constructor(db: IPersistenceService, logger: ILogger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Retrieves default configurations dynamically based on the current user's OS context.
   */
  private getDefaults(): ConfigurationSchema {
    return {
      uploadFolder: path.join(os.homedir(), 'Pictures', 'SnapBridge'),
      autoOpenFolder: true,
      autoCopyClipboard: true,
      startWithWindows: false,
      notificationsEnabled: true,
      port: DEFAULT_PORT,
    };
  }

  public load(): ConfigurationSchema {
    try {
      const defaults = this.getDefaults();
      const loaded: Partial<ConfigurationSchema> = {};

      const keys: Array<keyof ConfigurationSchema> = [
        'uploadFolder',
        'autoOpenFolder',
        'autoCopyClipboard',
        'startWithWindows',
        'notificationsEnabled',
        'port',
      ];

      for (const key of keys) {
        const valueStr = this.db.getSetting(key);
        if (valueStr !== null) {
          try {
            const parsed = JSON.parse(valueStr);
            // Verify types match default types to prevent corrupted settings
            if (typeof parsed === typeof defaults[key]) {
              loaded[key] = parsed as any;
            } else {
              this.logger.warn(`Configuration type mismatch for key "${key}". Expected ${typeof defaults[key]}, got ${typeof parsed}. Applying default.`);
            }
          } catch {
            this.logger.warn(`Failed to parse configuration value for key "${key}": ${valueStr}. Applying default.`);
          }
        }
      }

      this.currentConfig = {
        ...defaults,
        ...loaded,
      };

      this.logger.info('Configuration loaded successfully.');
      return this.currentConfig;
    } catch (error) {
      this.logger.error('Failed to load configuration. Falling back to default settings.', error);
      this.currentConfig = this.getDefaults();
      return this.currentConfig;
    }
  }

  public save(config: Partial<ConfigurationSchema>): void {
    const activeConfig = this.currentConfig || this.load();

    try {
      for (const [key, val] of Object.entries(config)) {
        if (val !== undefined) {
          const serializedValue = JSON.stringify(val);
          this.db.setSetting(key, serializedValue, SCHEMA_VERSION);
          (activeConfig as any)[key] = val;
        }
      }
      this.currentConfig = activeConfig;
      this.logger.info('Configuration updates saved successfully.');
    } catch (error) {
      this.logger.error('Failed to save configuration values:', error);
      throw error;
    }
  }

  public get<K extends keyof ConfigurationSchema>(key: K): ConfigurationSchema[K] {
    const activeConfig = this.currentConfig || this.load();
    return activeConfig[key];
  }

  public set<K extends keyof ConfigurationSchema>(key: K, value: ConfigurationSchema[K]): void {
    this.save({ [key]: value });
  }

  public reset(): void {
    try {
      const defaults = this.getDefaults();
      this.save(defaults);
      this.logger.info('Configuration has been reset to defaults.');
    } catch (error) {
      this.logger.error('Failed to reset configuration settings:', error);
      throw error;
    }
  }
}
