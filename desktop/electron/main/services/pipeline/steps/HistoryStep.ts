import * as crypto from 'crypto';
import { PipelineContext, ValidationError, StorageError, UploadHistoryRecord } from 'shared';
import { PipelineStep } from '../PipelineStep';
import { IPersistenceService } from '../../../domain/IPersistenceService';
import { ILogger } from '../../../domain/ILogger';

export class HistoryStep implements PipelineStep {
  public readonly name = 'HistoryStep';
  
  private db: IPersistenceService;
  private logger: ILogger;

  constructor(db: IPersistenceService, logger: ILogger) {
    this.db = db;
    this.logger = logger;
  }

  public async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    this.logger.debug(`[${context.correlationId}] Executing HistoryStep`);

    if (!context.imageBuffer) {
      throw new ValidationError('No image buffer found in context to compute hash.');
    }

    if (!context.savePath || !context.metadata.filename) {
      throw new ValidationError('Missing save path or filename metadata in context.');
    }

    // 1. Calculate SHA-256 hash of the saved image buffer
    let fileHash = '';
    try {
      fileHash = crypto.createHash('sha256').update(context.imageBuffer).digest('hex');
    } catch (err: any) {
      throw new StorageError(`Failed to generate SHA-256 hash: ${err.message}`);
    }

    // 2. Build history record
    const historyRecord: UploadHistoryRecord = {
      uploadId: context.uploadId,
      correlationId: context.correlationId,
      deviceId: context.deviceId,
      filename: context.metadata.filename,
      filePath: context.savePath,
      fileSize: context.imageBuffer.length,
      fileHash,
      createdAt: context.timestamp.toISOString(),
    };

    // 3. Save to storage
    try {
      this.db.saveUpload(historyRecord);
      this.logger.info(`[${context.correlationId}] Upload history saved to JSON store (ID: ${context.uploadId})`);
    } catch (err: any) {
      throw new StorageError(`Failed to persist upload history record: ${err.message}`);
    }

    await next();
  }
}
