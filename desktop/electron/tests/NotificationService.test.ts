import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import { NotificationService } from '../main/services/notifications/NotificationService';
import { NodeEventBus } from '../main/core/NodeEventBus';
import { ConfigurationService } from '../main/services/config/ConfigurationService';
import { Logger } from '../main/services/logging/Logger';
import { INotificationGateway } from '../main/domain/INotificationGateway';

class MockNotificationGateway implements INotificationGateway {
  public shownTitle: string | null = null;
  public shownBody: string | null = null;
  public show(title: string, body: string): void {
    this.shownTitle = title;
    this.shownBody = body;
  }
}

describe('NotificationService', () => {
  test('should trigger notification when notificationsEnabled is true', async () => {
    const logger = new Logger(path.join(process.cwd(), 'logs', 'test-notify.log'));
    const eventBus = new NodeEventBus();
    
    const mockDb = {
      getSetting: (key: string) => key === 'notificationsEnabled' ? 'true' : null,
      setSetting: () => {},
      deleteSetting: () => {}
    } as any;

    const configService = new ConfigurationService(mockDb, logger);
    configService.load();

    const mockGateway = new MockNotificationGateway();
    new NotificationService(eventBus, configService, logger, mockGateway);

    const context: any = {
      uploadId: 'up-123',
      correlationId: 'corr-123'
    };

    eventBus.publish('UploadCompleted', 'corr-123', {
      context,
      timestamp: new Date()
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(mockGateway.shownTitle, '✓ Image Received');
    assert.ok(mockGateway.shownBody?.includes('Saved Successfully'));
  });

  test('should not trigger notification when notificationsEnabled is false', async () => {
    const logger = new Logger(path.join(process.cwd(), 'logs', 'test-notify.log'));
    const eventBus = new NodeEventBus();
    
    const mockDb = {
      getSetting: (key: string) => key === 'notificationsEnabled' ? 'false' : null,
      setSetting: () => {},
      deleteSetting: () => {}
    } as any;

    const configService = new ConfigurationService(mockDb, logger);
    configService.load();

    const mockGateway = new MockNotificationGateway();
    new NotificationService(eventBus, configService, logger, mockGateway);

    const context: any = {
      uploadId: 'up-123',
      correlationId: 'corr-123'
    };

    eventBus.publish('UploadCompleted', 'corr-123', {
      context,
      timestamp: new Date()
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(mockGateway.shownTitle, null);
  });
});
