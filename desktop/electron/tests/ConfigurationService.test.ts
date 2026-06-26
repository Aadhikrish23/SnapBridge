import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { JsonPersistenceService } from '../main/services/storage/JsonPersistenceService';
import { Logger } from '../main/services/logging/Logger';
import { ConfigurationService } from '../main/services/config/ConfigurationService';

describe('ConfigurationService', () => {
  const testStorageDir = path.join(process.cwd(), 'storage', 'test-config-storage');
  let db: JsonPersistenceService;
  let configService: ConfigurationService;
  const logger = new Logger(path.join(process.cwd(), 'logs', 'test-config-logger.log'));

  before(() => {
    try {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    } catch {}

    db = new JsonPersistenceService(logger, testStorageDir);
    db.connect();
    configService = new ConfigurationService(db, logger);
  });

  after(() => {
    db.disconnect();
    try {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    } catch {}
  });

  test('should load default configuration settings when db is empty', () => {
    const config = configService.load();
    
    assert.strictEqual(config.autoCopyClipboard, true, 'Default autoCopyClipboard should be true');
    assert.strictEqual(config.autoOpenFolder, true, 'Default autoOpenFolder should be true');
    assert.strictEqual(config.notificationsEnabled, true, 'Default notificationsEnabled should be true');
    assert.strictEqual(config.port, 53210, 'Default port should be 53210');
    assert.ok(config.uploadFolder.endsWith('SnapBridge'), 'Default upload folder should end with SnapBridge');
  });

  test('should save and get single configuration values', () => {
    configService.set('port', 12345);
    const port = configService.get('port');
    assert.strictEqual(port, 12345, 'Port should match updated value');

    configService.set('autoCopyClipboard', false);
    const copy = configService.get('autoCopyClipboard');
    assert.strictEqual(copy, false, 'AutoCopyClipboard should match updated value');
  });

  test('should save partial configuration schemas', () => {
    configService.save({
      autoOpenFolder: false,
      notificationsEnabled: false
    });

    assert.strictEqual(configService.get('autoOpenFolder'), false, 'Should update autoOpenFolder');
    assert.strictEqual(configService.get('notificationsEnabled'), false, 'Should update notificationsEnabled');
  });

  test('should reset to default values', () => {
    configService.set('port', 9999);
    configService.reset();

    assert.strictEqual(configService.get('port'), 53210, 'Should reset port back to default');
    assert.strictEqual(configService.get('autoOpenFolder'), true, 'Should reset autoOpenFolder back to true');
  });
});
