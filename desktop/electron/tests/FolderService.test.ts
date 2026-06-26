import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import { FolderService } from '../main/services/storage/FolderService';
import { NodeEventBus } from '../main/core/NodeEventBus';
import { ConfigurationService } from '../main/services/config/ConfigurationService';
import { Logger } from '../main/services/logging/Logger';
import { IFolderGateway } from '../main/domain/IFolderGateway';

class MockFolderGateway implements IFolderGateway {
  public openedPath: string | null = null;
  public async open(folderPath: string): Promise<void> {
    this.openedPath = folderPath;
  }
}

describe('FolderService', () => {
  test('should open upload folder when autoOpenFolder is true', async () => {
    const logger = new Logger(path.join(process.cwd(), 'logs', 'test-folder.log'));
    const eventBus = new NodeEventBus();
    
    const mockDb = {
      getSetting: (key: string) => {
        if (key === 'autoOpenFolder') return 'true';
        if (key === 'uploadFolder') return JSON.stringify('C:\\Users\\Pictures\\SnapBridge');
        return null;
      },
      setSetting: () => {},
      deleteSetting: () => {}
    } as any;

    const configService = new ConfigurationService(mockDb, logger);
    configService.load();

    const mockGateway = new MockFolderGateway();
    new FolderService(eventBus, configService, logger, mockGateway);

    const context: any = {
      uploadId: 'up-123',
      correlationId: 'corr-123'
    };

    eventBus.publish('UploadCompleted', 'corr-123', {
      context,
      timestamp: new Date()
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(mockGateway.openedPath, 'C:\\Users\\Pictures\\SnapBridge');
  });

  test('should not open upload folder when autoOpenFolder is false', async () => {
    const logger = new Logger(path.join(process.cwd(), 'logs', 'test-folder.log'));
    const eventBus = new NodeEventBus();
    
    const mockDb = {
      getSetting: (key: string) => {
        if (key === 'autoOpenFolder') return 'false';
        if (key === 'uploadFolder') return JSON.stringify('C:\\Users\\Pictures\\SnapBridge');
        return null;
      },
      setSetting: () => {},
      deleteSetting: () => {}
    } as any;

    const configService = new ConfigurationService(mockDb, logger);
    configService.load();

    const mockGateway = new MockFolderGateway();
    new FolderService(eventBus, configService, logger, mockGateway);

    const context: any = {
      uploadId: 'up-123',
      correlationId: 'corr-123'
    };

    eventBus.publish('UploadCompleted', 'corr-123', {
      context,
      timestamp: new Date()
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(mockGateway.openedPath, null);
  });
});
