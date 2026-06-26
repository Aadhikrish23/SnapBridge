import { PipelineContext } from 'shared';
import { IEventBus } from '../../domain/IEventBus';
import { IConfigurationService } from '../../domain/IConfigurationService';
import { ILogger } from '../../domain/ILogger';
import { IFolderGateway } from '../../domain/IFolderGateway';

export class FolderService {
  private configService: IConfigurationService;
  private logger: ILogger;
  private gateway: IFolderGateway;

  constructor(
    eventBus: IEventBus,
    configService: IConfigurationService,
    logger: ILogger,
    gateway: IFolderGateway
  ) {
    this.configService = configService;
    this.logger = logger;
    this.gateway = gateway;

    eventBus.subscribe('UploadCompleted', (event) => this.handleUploadCompleted(event.payload.context));
  }

  private async handleUploadCompleted(context: PipelineContext): Promise<void> {
    if (!this.configService.get('autoOpenFolder')) {
      this.logger.debug(`[${context.correlationId}] Auto-open folder is disabled in settings.`);
      return;
    }

    const uploadFolder = this.configService.get('uploadFolder');
    if (!uploadFolder) {
      this.logger.warn(`[${context.correlationId}] Upload folder is not configured. Cannot open.`);
      return;
    }

    try {
      await this.gateway.open(uploadFolder);
      this.logger.info(`[${context.correlationId}] Automatically opened upload directory: ${uploadFolder}`);
    } catch (err: any) {
      this.logger.error(`[${context.correlationId}] Failed to open upload directory:`, err);
    }
  }
}
