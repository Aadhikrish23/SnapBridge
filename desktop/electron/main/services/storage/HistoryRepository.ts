import { JsonStore } from './JsonStore';
import { UploadHistoryRecord } from 'shared';

export class HistoryRepository {
  private store: JsonStore<UploadHistoryRecord[]>;

  constructor(store: JsonStore<UploadHistoryRecord[]>) {
    this.store = store;
  }

  public save(upload: UploadHistoryRecord): void {
    const list = this.store.get();
    const index = list.findIndex(r => r.uploadId === upload.uploadId);
    if (index >= 0) {
      list[index] = upload;
    } else {
      list.push(upload);
    }
    this.store.set(list);
  }

  public get(uploadId: string): UploadHistoryRecord | null {
    const list = this.store.get();
    return list.find(r => r.uploadId === uploadId) || null;
  }

  public getAll(): UploadHistoryRecord[] {
    const list = this.store.get();
    // Sort by createdAt DESC to match index.ts/SQLiteDatabase expected order
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public delete(uploadId: string): void {
    const list = this.store.get();
    const filtered = list.filter(r => r.uploadId !== uploadId);
    if (filtered.length !== list.length) {
      this.store.set(filtered);
    }
  }

  public deleteAll(): void {
    this.store.set([]);
  }
}
