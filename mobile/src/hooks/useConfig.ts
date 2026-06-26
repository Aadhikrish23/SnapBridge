import { useState, useCallback } from 'react';
import { MobileConfig } from '../types';
import { ServiceProvider } from '../services/ServiceProvider';

export function useConfig() {
  const [config, setConfig] = useState<MobileConfig>(() => ServiceProvider.storage.loadConfig());

  const updateConfig = useCallback((partial: Partial<MobileConfig>) => {
    const updated = ServiceProvider.storage.updateConfig(partial);
    setConfig(updated);
    return updated;
  }, []);

  const reloadConfig = useCallback(() => {
    const loaded = ServiceProvider.storage.loadConfig();
    setConfig(loaded);
    return loaded;
  }, []);

  return { config, updateConfig, reloadConfig };
}
