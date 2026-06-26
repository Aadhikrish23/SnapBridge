import { ConfigurationSchema } from 'shared';

export interface IConfigurationService {
  /**
   * Loads the current configuration from storage, applying default values where missing.
   */
  load(): ConfigurationSchema;

  /**
   * Saves updates to the configuration.
   */
  save(config: Partial<ConfigurationSchema>): void;

  /**
   * Reads a single configuration key.
   */
  get<K extends keyof ConfigurationSchema>(key: K): ConfigurationSchema[K];

  /**
   * Sets a single configuration key and persists it.
   */
  set<K extends keyof ConfigurationSchema>(key: K, value: ConfigurationSchema[K]): void;

  /**
   * Resets configuration to default values.
   */
  reset(): void;
}
