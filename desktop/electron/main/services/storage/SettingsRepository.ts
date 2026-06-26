import { JsonStore } from './JsonStore';

export interface SettingEntry {
  value: string;
  schemaVersion: number;
}

export class SettingsRepository {
  private store: JsonStore<{ [key: string]: SettingEntry }>;

  constructor(store: JsonStore<{ [key: string]: SettingEntry }>) {
    this.store = store;
  }

  public get(key: string): string | null {
    const data = this.store.get();
    const entry = data[key];
    return entry ? entry.value : null;
  }

  public set(key: string, value: string, schemaVersion: number): void {
    const data = this.store.get();
    data[key] = { value, schemaVersion };
    this.store.set(data);
  }

  public delete(key: string): void {
    const data = this.store.get();
    if (key in data) {
      delete data[key];
      this.store.set(data);
    }
  }
}
