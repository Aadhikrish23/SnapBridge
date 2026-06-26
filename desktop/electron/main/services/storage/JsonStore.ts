import * as fs from 'fs';
import * as path from 'path';

interface VersionedDocument<T> {
  version: number;
  data: T;
}

export class JsonStore<T> {
  private filePath: string;
  private version: number;
  private defaultData: T;
  private cache: T;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath: string, version: number, defaultData: T) {
    this.filePath = filePath;
    this.version = version;
    this.defaultData = defaultData;
    this.cache = this.loadWithRecovery();
  }

  /**
   * Loads the file with corruption recovery and backup restoration logic.
   */
  private loadWithRecovery(): T {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Try loading from primary file
    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf8');
        const doc = JSON.parse(content) as VersionedDocument<T>;
        if (doc && typeof doc.version === 'number' && doc.data !== undefined) {
          return doc.data;
        }
        throw new Error('Invalid versioned document format');
      } catch (err: any) {
        console.warn(`[JsonStore] Primary file corrupted or unreadable at ${this.filePath}: ${err.message}. Attempting recovery from backup...`);
        
        // Recover from backup rotation chain
        const recoveredData = this.tryRecoverFromBackups();
        if (recoveredData !== null) {
          // Re-save the recovered data to the primary file path to heal the store
          try {
            this.saveSync(recoveredData);
            console.log(`[JsonStore] Successfully healed primary file from backup at ${this.filePath}`);
          } catch (saveErr: any) {
            console.error(`[JsonStore] Failed to write healed primary file: ${saveErr.message}`);
          }
          return recoveredData;
        }
      }
    }

    // If primary doesn't exist or is corrupted, and backups also fail/don't exist:
    console.warn(`[JsonStore] Initializing new store with defaults at ${this.filePath}`);
    this.saveSync(this.defaultData);
    return this.defaultData;
  }

  /**
   * Tries to read/parse backup files in order (.bak, .bak.1, .bak.2).
   * Returns the parsed data if successful, or null if all backups fail.
   */
  private tryRecoverFromBackups(): T | null {
    const backupPaths = [
      `${this.filePath}.bak`,
      `${this.filePath}.bak.1`,
      `${this.filePath}.bak.2`
    ];

    for (const backupPath of backupPaths) {
      if (fs.existsSync(backupPath)) {
        try {
          const content = fs.readFileSync(backupPath, 'utf8');
          const doc = JSON.parse(content) as VersionedDocument<T>;
          if (doc && typeof doc.version === 'number' && doc.data !== undefined) {
            console.log(`[JsonStore] Successfully recovered data from backup: ${backupPath}`);
            return doc.data;
          }
        } catch (backupErr: any) {
          console.warn(`[JsonStore] Backup at ${backupPath} was also corrupted: ${backupErr.message}`);
        }
      }
    }
    return null;
  }

  /**
   * Returns a copy of the cached in-memory data to ensure immutability.
   */
  public get(): T {
    return JSON.parse(JSON.stringify(this.cache));
  }

  /**
   * Updates in-memory cache and schedules a serialized, atomic write to disk.
   */
  public set(data: T): void {
    this.cache = JSON.parse(JSON.stringify(data));

    this.writeQueue = this.writeQueue.then(() => {
      return new Promise<void>((resolve, reject) => {
        try {
          // Before overwriting the primary file, rotate backups to preserve history
          if (fs.existsSync(this.filePath)) {
            try {
              this.rotateBackups();
            } catch (rotErr: any) {
              console.warn(`[JsonStore] Backup rotation failed: ${rotErr.message}`);
            }
          }

          const tempPath = this.filePath + '.tmp';
          const doc: VersionedDocument<T> = {
            version: this.version,
            data: this.cache
          };

          fs.writeFile(tempPath, JSON.stringify(doc, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              reject(writeErr);
              return;
            }
            fs.rename(tempPath, this.filePath, (renameErr) => {
              if (renameErr) {
                // If rename fails, try unlinking temp file
                try { fs.unlinkSync(tempPath); } catch {}
                reject(renameErr);
              } else {
                resolve();
              }
            });
          });
        } catch (error) {
          reject(error);
        }
      });
    }).catch(err => {
      console.error(`[JsonStore] Failed serialization write to ${this.filePath}:`, err);
    });
  }

  /**
   * Performs standard 3-generation backup rotation:
   * .bak.1 -> .bak.2
   * .bak -> .bak.1
   * primary -> .bak
   */
  private rotateBackups(): void {
    const bakPath = `${this.filePath}.bak`;
    const bak1Path = `${this.filePath}.bak.1`;
    const bak2Path = `${this.filePath}.bak.2`;

    // .bak.1 -> .bak.2
    if (fs.existsSync(bak1Path)) {
      try {
        fs.renameSync(bak1Path, bak2Path);
      } catch (err: any) {
        console.warn(`[JsonStore] Failed to rotate backup from ${bak1Path} to ${bak2Path}: ${err.message}`);
      }
    }

    // .bak -> .bak.1
    if (fs.existsSync(bakPath)) {
      try {
        fs.renameSync(bakPath, bak1Path);
      } catch (err: any) {
        console.warn(`[JsonStore] Failed to rotate backup from ${bakPath} to ${bak1Path}: ${err.message}`);
      }
    }

    // primary -> .bak (copy to ensure primary remains readable during write)
    try {
      fs.copyFileSync(this.filePath, bakPath);
    } catch (err: any) {
      console.warn(`[JsonStore] Failed to copy primary file to backup ${bakPath}: ${err.message}`);
    }
  }

  /**
   * Synchronous write helper for default values initialization.
   */
  private saveSync(data: T): void {
    const tempPath = this.filePath + '.tmp';
    const doc: VersionedDocument<T> = {
      version: this.version,
      data
    };
    fs.writeFileSync(tempPath, JSON.stringify(doc, null, 2), 'utf8');
    fs.renameSync(tempPath, this.filePath);
  }
}
