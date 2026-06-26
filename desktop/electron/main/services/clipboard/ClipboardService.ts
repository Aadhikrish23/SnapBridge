import { PipelineContext } from 'shared';
import { IEventBus } from '../../domain/IEventBus';
import { IConfigurationService } from '../../domain/IConfigurationService';
import { ILogger } from '../../domain/ILogger';
import { IClipboard } from '../../domain/IClipboard';

export class ClipboardService {
  private configService: IConfigurationService;
  private logger: ILogger;
  private clipboard: IClipboard;

  constructor(
    eventBus: IEventBus,
    configService: IConfigurationService,
    logger: ILogger,
    clipboard: IClipboard
  ) {
    this.configService = configService;
    this.logger = logger;
    this.clipboard = clipboard;
    
    eventBus.subscribe('UploadCompleted', (event) => this.handleUploadCompleted(event.payload.context));
  }

  private handleUploadCompleted(context: PipelineContext): void {
    if (!this.configService.get('autoCopyClipboard')) {
      this.logger.debug(`[${context.correlationId}] Auto-copy to clipboard is disabled in settings.`);
      return;
    }

    if (!context.savePath) {
      this.logger.warn(`[${context.correlationId}] No save path in context. Cannot copy image.`);
      return;
    }

    try {
      this.clipboard.writeImage(context.savePath);
      this.logger.info(`[${context.correlationId}] Image copied to clipboard.`);
    } catch (err: any) {
      this.logger.error(`[${context.correlationId}] Clipboard copy failed:`, err);
    }
  }
}
