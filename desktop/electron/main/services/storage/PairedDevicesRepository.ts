import { JsonStore } from './JsonStore';
import { PairedDevice } from 'shared';

export class PairedDevicesRepository {
  private store: JsonStore<PairedDevice[]>;

  constructor(store: JsonStore<PairedDevice[]>) {
    this.store = store;
  }

  public get(deviceId: string): PairedDevice | null {
    const list = this.store.get();
    return list.find(d => d.deviceId === deviceId) || null;
  }

  public getAll(): PairedDevice[] {
    return this.store.get();
  }

  public save(device: PairedDevice): void {
    const list = this.store.get();
    const index = list.findIndex(d => d.deviceId === device.deviceId);
    if (index >= 0) {
      list[index] = device;
    } else {
      list.push(device);
    }
    this.store.set(list);
  }

  public delete(deviceId: string): void {
    const list = this.store.get();
    const filtered = list.filter(d => d.deviceId !== deviceId);
    if (filtered.length !== list.length) {
      this.store.set(filtered);
    }
  }

  public deleteAll(): void {
    this.store.set([]);
  }
}
