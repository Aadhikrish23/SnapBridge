import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import { ClipboardService } from '../main/services/clipboard/ClipboardService';
import { NodeEventBus } from '../main/core/NodeEventBus';
import { ConfigurationService } from '../main/services/config/ConfigurationService';
import { Logger } from '../main/services/logging/Logger';
import { IClipboard } from '../main/domain/IClipboard';

class MockClipboard implements IClipboard {
  public copiedPath: string | null = null;
  public writeImage(filePath: string): void {
    this.copiedPath = filePath;
  }
}

describe('ClipboardService', () => {
  test('should copy image to clipboard when autoCopyClipboard is enabled', async () => {
    const logger = new Logger(path.join(process.cwd(), 'logs', 'test-clip.log'));
    const eventBus = new NodeEventBus();
    
    const mockDb = {
      getSetting: (key: string) => key === 'autoCopyClipboard' ? 'true' : null,
      setSetting: () => {},
      deleteSetting: () => {}
    } as any;

    const configService = new ConfigurationService(mockDb, logger);
    configService.load();

    const mockClipboard = new MockClipboard();
    new ClipboardService(eventBus, configService, logger, mockClipboard);

    const context: any = {
      uploadId: 'up-123',
      correlationId: 'corr-123',
      savePath: 'C:\\Users\\Pictures\\test.jpg'
    };

    eventBus.publish('UploadCompleted', 'corr-123', {
      context,
      timestamp: new Date()
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(mockClipboard.copiedPath, 'C:\\Users\\Pictures\\test.jpg');
  });

  test('should not copy image to clipboard when autoCopyClipboard is disabled', async () => {
    const logger = new Logger(path.join(process.cwd(), 'logs', 'test-clip.log'));
    const eventBus = new NodeEventBus();
    
    const mockDb = {
      getSetting: (key: string) => key === 'autoCopyClipboard' ? 'false' : null,
      setSetting: () => {},
      deleteSetting: () => {}
    } as any;

    const configService = new ConfigurationService(mockDb, logger);
    configService.load();

    const mockClipboard = new MockClipboard();
    new ClipboardService(eventBus, configService, logger, mockClipboard);

    const context: any = {
      uploadId: 'up-123',
      correlationId: 'corr-123',
      savePath: 'C:\\Users\\Pictures\\test.jpg'
    };

    eventBus.publish('UploadCompleted', 'corr-123', {
      context,
      timestamp: new Date()
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(mockClipboard.copiedPath, null);
  });
});
