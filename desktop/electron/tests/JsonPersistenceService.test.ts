import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { JsonPersistenceService } from '../main/services/storage/JsonPersistenceService';
import { Logger } from '../main/services/logging/Logger';

describe('JsonPersistenceService', () => {
  const testStorageDir = path.join(process.cwd(), 'storage', 'test-storage');
  let db: JsonPersistenceService;
  const logger = new Logger(path.join(process.cwd(), 'logs', 'test-json-db.log'));

  before(() => {
    // Clean old test directory
    try {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    } catch {}
    
    db = new JsonPersistenceService(logger, testStorageDir);
    db.connect();
  });

  after(() => {
    db.disconnect();
    try {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    } catch {}
  });

  test('should store and retrieve settings', () => {
    db.setSetting('testKey', 'testValue', 1);
    const val = db.getSetting('testKey');
    assert.strictEqual(val, 'testValue', 'Retrieved setting value should match');

    db.setSetting('testKey', 'updatedValue', 2);
    const updatedVal = db.getSetting('testKey');
    assert.strictEqual(updatedVal, 'updatedValue', 'Retrieved setting should match updated value');

    db.deleteSetting('testKey');
    const deletedVal = db.getSetting('testKey');
    assert.strictEqual(deletedVal, null, 'Deleted setting should return null');
  });

  test('should handle paired devices operations', () => {
    const dev = {
      deviceId: 'phone-uuid-1',
      deviceName: 'Pixel 8 Pro',
      pairingSecret: 'secret_token_123',
      pairedAt: new Date().toISOString()
    };

    db.savePairedDevice(dev);
    const retrieved = db.getPairedDevice(dev.deviceId);
    assert.ok(retrieved !== null, 'Paired device should be found');
    assert.strictEqual(retrieved.deviceName, dev.deviceName, 'Device name should match');
    assert.strictEqual(retrieved.pairingSecret, dev.pairingSecret, 'Secret should match');

    const all = db.getAllPairedDevices();
    assert.strictEqual(all.length, 1, 'Total paired devices should be 1');

    db.deletePairedDevice(dev.deviceId);
    const deleted = db.getPairedDevice(dev.deviceId);
    assert.strictEqual(deleted, null, 'Deleted device should return null');
  });

  test('should handle upload history records', () => {
    const record = {
      uploadId: 'upload-id-1',
      correlationId: 'corr-id-1',
      deviceId: 'phone-uuid-1',
      filename: '2026-06-26_15-40-22.jpg',
      filePath: 'C:\\Users\\aadhi\\Pictures\\SnapBridge\\2026-06-26_15-40-22.jpg',
      fileSize: 102456,
      fileHash: 'sha256_hash_abc_123',
      createdAt: new Date().toISOString()
    };

    db.saveUpload(record);
    const retrieved = db.getUpload(record.uploadId);
    assert.ok(retrieved !== null, 'Upload record should be found');
    assert.strictEqual(retrieved.filename, record.filename, 'Filename should match');
    assert.strictEqual(retrieved.fileSize, record.fileSize, 'File size should match');

    const all = db.getAllUploads();
    assert.strictEqual(all.length, 1, 'Total uploads should be 1');

    db.deleteUpload(record.uploadId);
    const deleted = db.getUpload(record.uploadId);
    assert.strictEqual(deleted, null, 'Deleted upload should return null');
  });

  test('should rotate backups on update and recover from corruption', async () => {
    // 1. Create an isolated test JsonStore instance to test internal recovery/rotation
    const { JsonStore } = require('../main/services/storage/JsonStore');
    const storePath = path.join(testStorageDir, 'test-rotation.json');
    
    // Clean up files if any
    try { fs.unlinkSync(storePath); } catch {}
    try { fs.unlinkSync(`${storePath}.bak`); } catch {}
    try { fs.unlinkSync(`${storePath}.bak.1`); } catch {}
    try { fs.unlinkSync(`${storePath}.bak.2`); } catch {}

    const store = new JsonStore(storePath, 1, { val: 0 });

    // Initial state
    assert.deepStrictEqual(store.get(), { val: 0 });

    // Update 1: creates .bak (which contains {val: 0}) and schedules write for {val: 1}
    store.set({ val: 1 });
    // Wait for the async write queue to settle
    await new Promise(r => setTimeout(r, 100));

    assert.ok(fs.existsSync(storePath), 'Primary store file should exist');
    assert.ok(fs.existsSync(`${storePath}.bak`), 'Backup file should exist');
    
    // Verify backup contains old state { val: 0 }
    const bakContent = JSON.parse(fs.readFileSync(`${storePath}.bak`, 'utf8'));
    assert.strictEqual(bakContent.data.val, 0);

    // Update 2: shifts .bak -> .bak.1, primary -> .bak, writes {val: 2}
    store.set({ val: 2 });
    await new Promise(r => setTimeout(r, 100));

    assert.ok(fs.existsSync(`${storePath}.bak.1`), 'Second generation backup file should exist');
    const bak1Content = JSON.parse(fs.readFileSync(`${storePath}.bak.1`, 'utf8'));
    assert.strictEqual(bak1Content.data.val, 0);

    // 2. Test Corruption Recovery
    // Corrupt primary file
    fs.writeFileSync(storePath, 'invalid json content {{{{', 'utf8');

    // Reinstantiate store - it should read primary, fail, read backup (.bak), recover and heal
    const store2 = new JsonStore(storePath, 1, { val: 99 });
    assert.strictEqual(store2.get().val, 1, 'Should have recovered from .bak (val: 1)');

    // Verify primary has been healed (rewritten with recovered data)
    const healedContent = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    assert.strictEqual(healedContent.data.val, 1, 'Primary file should be healed');
  });
});
