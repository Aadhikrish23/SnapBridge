import { PipelineContext } from 'shared';
import { PipelineStep } from '../PipelineStep';
import { IEventBus } from '../../../domain/IEventBus';
import { ILogger } from '../../../domain/ILogger';

export class PublishStep implements PipelineStep {
  public readonly name = 'PublishStep';
  
  private eventBus: IEventBus;
  private logger: ILogger;

  constructor(eventBus: IEventBus, logger: ILogger) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  public async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    this.logger.debug(`[${context.correlationId}] Executing PublishStep`);

    try {
      this.eventBus.publish('UploadCompleted', context.correlationId, {
        context,
        timestamp: new Date()
      });
      this.logger.info(`[${context.correlationId}] Published 'UploadCompleted' event on EventBus.`);
    } catch (err: any) {
      this.logger.error(`[${context.correlationId}] Failed to publish UploadCompleted event:`, err);
      // We do not fail the upload just because notification/event publishing failed
    }

    await next();
  }
}
