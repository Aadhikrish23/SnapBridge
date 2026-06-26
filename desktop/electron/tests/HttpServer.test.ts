import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { JsonPersistenceService } from '../main/services/storage/JsonPersistenceService';
import { Logger } from '../main/services/logging/Logger';
import { ConfigurationService } from '../main/services/config/ConfigurationService';
import { NodeEventBus } from '../main/core/NodeEventBus';
import { CryptoService } from '../main/services/security/CryptoService';
import { ImagePipeline } from '../main/services/pipeline/ImagePipeline';
import { HttpServer } from '../main/services/network/HttpServer';

// Steps
import { ValidationStep } from '../main/services/pipeline/steps/ValidationStep';
import { DecodeStep } from '../main/services/pipeline/steps/DecodeStep';
import { SaveStep } from '../main/services/pipeline/steps/SaveStep';
import { HistoryStep } from '../main/services/pipeline/steps/HistoryStep';
import { PublishStep } from '../main/services/pipeline/steps/PublishStep';

describe('HttpServer and ImagePipeline Integration', () => {
  const testStorageDir = path.join(process.cwd(), 'storage', 'test-server-storage');
  const testUploadFolder = path.join(process.cwd(), 'storage', 'test-uploads');
  const testPort = 53220;

  let db: JsonPersistenceService;
  let logger: Logger;
  let configService: ConfigurationService;
  let eventBus: NodeEventBus;
  let cryptoService: CryptoService;
  let pipeline: ImagePipeline;
  let server: HttpServer;

  before(async () => {
    try { fs.rmSync(testStorageDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(testUploadFolder, { recursive: true, force: true }); } catch {}

    logger = new Logger(path.join(process.cwd(), 'logs', 'test-server.log'));
    db = new JsonPersistenceService(logger, testStorageDir);
    db.connect();

    configService = new ConfigurationService(db, logger);
    configService.load();
    configService.set('uploadFolder', testUploadFolder);

    eventBus = new NodeEventBus();
    cryptoService = new CryptoService();
    pipeline = new ImagePipeline();

    pipeline
      .use(new ValidationStep(db, cryptoService, logger))
      .use(new DecodeStep(logger))
      .use(new SaveStep(configService, logger))
      .use(new HistoryStep(db, logger))
      .use(new PublishStep(eventBus, logger));

    server = new HttpServer(logger, db, configService, pipeline);
    await server.start(testPort);
  });

  after(async () => {
    await server.stop();
    db.disconnect();
    try { fs.rmSync(testStorageDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(testUploadFolder, { recursive: true, force: true }); } catch {}
  });

  test('GET /ping should return status ok', async () => {
    const res = await fetch(`http://localhost:${testPort}/ping`);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.version, '1');
  });

  test('POST /pair should pair device on correct secret', async () => {
    const secret = 'pairing_secret_123';
    db.setSetting('pairing_secret_temp', secret, 1);

    const pairBody = {
      deviceId: 'client-device-id',
      deviceName: 'Pixel 8',
      pairingSecret: secret
    };

    const res = await fetch(`http://localhost:${testPort}/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pairBody)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.success, true);

    const paired = db.getPairedDevice('client-device-id');
    assert.ok(paired !== null);
    assert.strictEqual(paired.deviceName, 'Pixel 8');
  });

  test('POST /pair should reject malformed JSON', async () => {
    const res = await fetch(`http://localhost:${testPort}/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed json: true '
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json() as any;
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Malformed'));
  });

  test('POST /upload should reject unauthorized signature', async () => {
    const testImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const correlationId = 'test-corr-1';

    const res = await fetch(`http://localhost:${testPort}/upload`, {
      method: 'POST',
      headers: {
        'x-snapbridge-version': '1',
        'x-device-id': 'client-device-id',
        'x-timestamp': Date.now().toString(),
        'x-correlation-id': correlationId,
        'x-signature': 'invalid_signature_hex',
        'Content-Type': 'image/jpeg'
      },
      body: testImage
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json() as any;
    assert.strictEqual(data.success, false);
    assert.ok(data.message.toLowerCase().includes('signature'));
  });

  test('POST /upload should reject expired timestamp (clock skew)', async () => {
    const correlationId = 'test-corr-expired';
    const expiredTimestamp = (Date.now() - 600 * 1000).toString(); // 10 minutes ago
    const deviceId = 'client-device-id';
    const paired = db.getPairedDevice(deviceId);
    assert.ok(paired !== null);

    const testImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]);
    const contentLength = testImage.length.toString();
    const signingString = `1:${deviceId}:${expiredTimestamp}:${correlationId}:${contentLength}`;
    const signature = cryptoService.hmacSha256(paired.pairingSecret, signingString);

    const res = await fetch(`http://localhost:${testPort}/upload`, {
      method: 'POST',
      headers: {
        'x-snapbridge-version': '1',
        'x-device-id': deviceId,
        'x-timestamp': expiredTimestamp,
        'x-correlation-id': correlationId,
        'x-signature': signature,
        'content-length': contentLength,
        'Content-Type': 'image/jpeg'
      },
      body: testImage
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json() as any;
    assert.ok(data.message.includes('skew'));
  });

  test('POST /upload should reject unknown device', async () => {
    const correlationId = 'test-corr-unknown-device';
    const timestamp = Date.now().toString();
    const unknownDeviceId = 'unknown-device-uuid';

    const testImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]);
    const contentLength = testImage.length.toString();
    const signingString = `1:${unknownDeviceId}:${timestamp}:${correlationId}:${contentLength}`;
    const signature = cryptoService.hmacSha256('fake_secret', signingString);

    const res = await fetch(`http://localhost:${testPort}/upload`, {
      method: 'POST',
      headers: {
        'x-snapbridge-version': '1',
        'x-device-id': unknownDeviceId,
        'x-timestamp': timestamp,
        'x-correlation-id': correlationId,
        'x-signature': signature,
        'content-length': contentLength,
        'Content-Type': 'image/jpeg'
      },
      body: testImage
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json() as any;
    assert.ok(data.message.includes('not paired'));
  });

  test('POST /upload should reject invalid image type (magic bytes failure)', async () => {
    const correlationId = 'test-corr-invalid-type';
    const timestamp = Date.now().toString();
    const deviceId = 'client-device-id';
    const paired = db.getPairedDevice(deviceId);
    assert.ok(paired !== null);

    const testText = Buffer.from('this is a plain text file pretending to be jpeg');
    const contentLength = testText.length.toString();
    const signingString = `1:${deviceId}:${timestamp}:${correlationId}:${contentLength}`;
    const signature = cryptoService.hmacSha256(paired.pairingSecret, signingString);

    const res = await fetch(`http://localhost:${testPort}/upload`, {
      method: 'POST',
      headers: {
        'x-snapbridge-version': '1',
        'x-device-id': deviceId,
        'x-timestamp': timestamp,
        'x-correlation-id': correlationId,
        'x-signature': signature,
        'content-length': contentLength,
        'Content-Type': 'image/jpeg'
      },
      body: testText
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json() as any;
    assert.ok(data.message.includes('Magic byte') || data.message.includes('verification failed'));
  });

  test('POST /upload should reject oversized upload (size limit breach)', async () => {
    const correlationId = 'test-corr-oversized';
    const timestamp = Date.now().toString();
    const deviceId = 'client-device-id';
    const paired = db.getPairedDevice(deviceId);
    assert.ok(paired !== null);

    // 16MB file
    const oversizedBuffer = Buffer.alloc(16 * 1024 * 1024);
    oversizedBuffer[0] = 0xFF; oversizedBuffer[1] = 0xD8; oversizedBuffer[2] = 0xFF; // mock header

    const contentLength = oversizedBuffer.length.toString();
    const signingString = `1:${deviceId}:${timestamp}:${correlationId}:${contentLength}`;
    const signature = cryptoService.hmacSha256(paired.pairingSecret, signingString);

    const res = await fetch(`http://localhost:${testPort}/upload`, {
      method: 'POST',
      headers: {
        'x-snapbridge-version': '1',
        'x-device-id': deviceId,
        'x-timestamp': timestamp,
        'x-correlation-id': correlationId,
        'x-signature': signature,
        'content-length': contentLength,
        'Content-Type': 'image/jpeg'
      },
      body: oversizedBuffer
    });

    assert.strictEqual(res.status, 413);
    const data = await res.json() as any;
    assert.ok(data.message.includes('exceeds maximum'));
  });

  test('POST /upload should handle database connection failures with 500', async () => {
    db.disconnect();

    try {
      const correlationId = 'test-corr-db-fail';
      const timestamp = Date.now().toString();
      const deviceId = 'client-device-id';

      const testImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]);
      const contentLength = testImage.length.toString();

      const res = await fetch(`http://localhost:${testPort}/upload`, {
        method: 'POST',
        headers: {
          'x-snapbridge-version': '1',
          'x-device-id': deviceId,
          'x-timestamp': timestamp,
          'x-correlation-id': correlationId,
          'x-signature': 'fake_signature',
          'content-length': contentLength,
          'Content-Type': 'image/jpeg'
        },
        body: testImage
      });

      assert.strictEqual(res.status, 500);
      const data = await res.json() as any;
      assert.ok(data.message.includes('not connected') || data.message.includes('Database'));
    } finally {
      db.connect();
    }
  });

  test('POST /upload should handle file system write failure with 500', async () => {
    configService.set('uploadFolder', 'C:\\illegal<>path\\:*?');

    try {
      const correlationId = 'test-corr-fs-fail';
      const timestamp = Date.now().toString();
      const deviceId = 'client-device-id';
      const paired = db.getPairedDevice(deviceId);
      assert.ok(paired !== null);

      // 8 bytes mock JPEG to pass DecodeStep magic validation
      const testImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      const contentLength = testImage.length.toString();
      const signingString = `1:${deviceId}:${timestamp}:${correlationId}:${contentLength}`;
      const validSignature = cryptoService.hmacSha256(paired.pairingSecret, signingString);

      const res = await fetch(`http://localhost:${testPort}/upload`, {
        method: 'POST',
        headers: {
          'x-snapbridge-version': '1',
          'x-device-id': deviceId,
          'x-timestamp': timestamp,
          'x-correlation-id': correlationId,
          'x-signature': validSignature,
          'content-length': contentLength,
          'Content-Type': 'image/jpeg'
        },
        body: testImage
      });

      assert.strictEqual(res.status, 500);
      const data = await res.json() as any;
      assert.ok(data.message.includes('Failed to write') || data.message.includes('directory'));
    } finally {
      configService.set('uploadFolder', testUploadFolder);
    }
  });

  test('POST /upload should successfully validate, save, record, and publish event on valid signature', async () => {
    const correlationId = 'test-corr-upload-success';
    const timestamp = Date.now().toString();
    const deviceId = 'client-device-id';
    
    const paired = db.getPairedDevice(deviceId);
    assert.ok(paired !== null);
    
    const testImage = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xFF, 0xD9
    ]);
    
    const contentLength = testImage.length.toString();
    const signingString = `1:${deviceId}:${timestamp}:${correlationId}:${contentLength}`;
    const validSignature = cryptoService.hmacSha256(paired.pairingSecret, signingString);

    let eventTriggered = false;
    eventBus.subscribe('UploadCompleted', (event) => {
      if (event.correlationId === correlationId) {
        eventTriggered = true;
      }
    });

    const res = await fetch(`http://localhost:${testPort}/upload`, {
      method: 'POST',
      headers: {
        'x-snapbridge-version': '1',
        'x-device-id': deviceId,
        'x-timestamp': timestamp,
        'x-correlation-id': correlationId,
        'x-signature': validSignature,
        'content-length': contentLength,
        'Content-Type': 'image/jpeg'
      },
      body: testImage
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.correlationId, correlationId);
    
    const savedPath = data.path;
    assert.ok(savedPath && fs.existsSync(savedPath), 'File should be saved on disk');

    const uploadId = data.uploadId;
    const dbRecord = db.getUpload(uploadId);
    assert.ok(dbRecord !== null, 'Upload record should exist in DB');
    assert.strictEqual(dbRecord.filename, data.filename);
    assert.strictEqual(dbRecord.fileSize, testImage.length);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(eventTriggered, true, 'UploadCompleted event should be published');
  });
  test('POST /upload should reject malformed request with missing required headers', async () => {
    const testImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);

    const res = await fetch(`http://localhost:${testPort}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg'
        // Missing all required SnapBridge headers
      },
      body: testImage
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json() as any;
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('version') || data.message.includes('Missing') || data.message.includes('Invalid'));
  });
});

function osHostname(): string {
  try {
    const os = require('os');
    return os.hostname();
  } catch {
    return 'Windows-PC';
  }
}
