import { PipelineContext, ValidationError, validateImageMagicBytes, MAX_FILE_SIZE_BYTES } from 'shared';
import { PipelineStep } from '../PipelineStep';
import { ILogger } from '../../../domain/ILogger';

/**
 * Buffers the incoming HTTP request body fully into memory, validates file
 * size against the configured limit, and verifies magic bytes to ensure
 * the payload is a genuine image (JPEG or PNG).
 *
 * This is a buffered read, not a streaming pipeline. The entire body is
 * collected before any downstream step can access `context.imageBuffer`.
 */
export class DecodeStep implements PipelineStep {
  public readonly name = 'DecodeStep';
  
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  public async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    this.logger.debug(`[${context.correlationId}] Executing DecodeStep`);

    const stream = context.imageStream;
    if (!stream) {
      throw new ValidationError('No image input stream provided in context.');
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    try {
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: any) => {
          totalSize += chunk.length;
          if (totalSize > MAX_FILE_SIZE_BYTES) {
            reject(new ValidationError(`File size exceeds maximum limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`, 'PAYLOAD_TOO_LARGE'));
            return;
          }
          chunks.push(chunk);
        });

        stream.on('end', () => {
          resolve();
        });

        stream.on('error', (err: any) => {
          reject(err);
        });
      });
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(`Stream reading error: ${err.message || err}`);
    }

    // Merge chunks
    const fullBuffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    context.imageBuffer = fullBuffer;

    // Validate magic bytes
    const imageResult = validateImageMagicBytes(context.imageBuffer);
    if (!imageResult.isValid) {
      throw new ValidationError('Invalid image payload. Magic byte verification failed.');
    }

    context.mimeType = imageResult.mimeType;
    context.fileExtension = imageResult.extension;

    this.logger.info(`[${context.correlationId}] Decoded and verified ${context.mimeType} | Size: ${totalSize} bytes`);

    await next();
  }
}
