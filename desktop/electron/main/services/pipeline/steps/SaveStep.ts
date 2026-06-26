import * as fs from 'fs/promises';
import * as path from 'path';
import { PipelineContext, ValidationError, StorageError } from 'shared';
import { PipelineStep } from '../PipelineStep';
import { IConfigurationService } from '../../../domain/IConfigurationService';
import { ILogger } from '../../../domain/ILogger';

export class SaveStep implements PipelineStep {
  public readonly name = 'SaveStep';
  
  private configService: IConfigurationService;
  private logger: ILogger;

  constructor(configService: IConfigurationService, logger: ILogger) {
    this.configService = configService;
    this.logger = logger;
  }

  public async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    this.logger.debug(`[${context.correlationId}] Executing SaveStep`);

    if (!context.imageBuffer) {
      throw new ValidationError('No image buffer found in context to save.');
    }

    const uploadFolder = this.configService.get('uploadFolder');
    if (!uploadFolder) {
      throw new StorageError('Upload folder path is not configured.');
    }

    // Ensure the folder exists
    try {
      await fs.mkdir(uploadFolder, { recursive: true });
    } catch (err: any) {
      throw new StorageError(`Failed to create upload directory "${uploadFolder}": ${err.message}`);
    }

    // Format timestamp filename: YYYY-MM-DD_HH-mm-ss.ext
    const date = context.timestamp;
    const pad = (num: number) => num.toString().padStart(2, '0');
    const timestampStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
    
    // Add correlation/unique suffix if files collide (e.g. multiple uploads in same second)
    const ext = context.fileExtension || '.jpg';
    let filename = `${timestampStr}${ext}`;
    let savePath = path.join(uploadFolder, filename);

    // Guard against collision by appending uploadId fragment
    try {
      const exists = await fs.access(savePath).then(() => true).catch(() => false);
      if (exists) {
        filename = `${timestampStr}_${context.uploadId.substring(0, 8)}${ext}`;
        savePath = path.join(uploadFolder, filename);
      }
    } catch {
      // Ignore checks and proceed
    }

    // Write file out
    try {
      await fs.writeFile(savePath, context.imageBuffer);
      context.savePath = savePath;
      context.metadata.filename = filename;
      this.logger.info(`[${context.correlationId}] File written successfully: ${savePath}`);
    } catch (err: any) {
      throw new StorageError(`Failed to write file to path "${savePath}": ${err.message}`);
    }

    await next();
  }
}
