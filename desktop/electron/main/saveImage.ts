import { shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getSaveFolder } from './config';

export function ensureSaveFolder(): string {
  const folder = getSaveFolder();
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  return folder;
}

export function saveImage(buffer: Buffer, originalFilename?: string): string {
  const folder = ensureSaveFolder();
  const ext = originalFilename ? path.extname(originalFilename) : '.jpg';
  const filename = `${Date.now()}${ext || '.jpg'}`;
  fs.writeFileSync(path.join(folder, filename), buffer);
  return filename;
}

export function openSaveFolder(): void {
  shell.openPath(getSaveFolder());
}
