import { PipelineContext } from 'shared';
import { IEventBus } from '../../domain/IEventBus';
import { IConfigurationService } from '../../domain/IConfigurationService';
import { ILogger } from '../../domain/ILogger';
import { INotificationGateway } from '../../domain/INotificationGateway';

export class NotificationService {
  private configService: IConfigurationService;
  private logger: ILogger;
  private gateway: INotificationGateway;

  constructor(
    eventBus: IEventBus,
    configService: IConfigurationService,
    logger: ILogger,
    gateway: INotificationGateway
  ) {
    this.configService = configService;
    this.logger = logger;
    this.gateway = gateway;

    eventBus.subscribe('UploadCompleted', (event) => this.handleUploadCompleted(event.payload.context));
  }

  private handleUploadCompleted(context: PipelineContext): void {
    if (!this.configService.get('notificationsEnabled')) {
      this.logger.debug(`[${context.correlationId}] Notifications are disabled in settings.`);
      return;
    }

    try {
      this.gateway.show('✓ Image Received', 'Saved Successfully\nCopied to Clipboard\nFolder Opened');
      this.logger.debug(`[${context.correlationId}] Notification displayed.`);
    } catch (err: any) {
      this.logger.error(`[${context.correlationId}] Failed to show notification:`, err);
    }
  }
}
