import { PipelineContext, ValidationError, SecurityError, ICryptoService, validateHeaders } from 'shared';
import { PipelineStep } from '../PipelineStep';
import { IPersistenceService } from '../../../domain/IPersistenceService';
import { ILogger } from '../../../domain/ILogger';

export class ValidationStep implements PipelineStep {
  public readonly name = 'ValidationStep';
  
  private db: IPersistenceService;
  private crypto: ICryptoService;
  private logger: ILogger;

  constructor(db: IPersistenceService, crypto: ICryptoService, logger: ILogger) {
    this.db = db;
    this.crypto = crypto;
    this.logger = logger;
  }

  public async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    this.logger.debug(`[${context.correlationId}] Executing ValidationStep`);

    const headers = context.metadata.headers;
    if (!headers) {
      throw new ValidationError('No request headers found in context metadata.');
    }

    // 1. Validate structure & clock skew drift
    const headerValidation = validateHeaders(headers, Date.now());
    if (!headerValidation.isValid) {
      if (headerValidation.errorType === 'SECURITY') {
        throw new SecurityError(headerValidation.error || 'Security validation failed.');
      }
      throw new ValidationError(headerValidation.error || 'Header validation failed.');
    }

    // 2. Validate paired device
    const device = this.db.getPairedDevice(context.deviceId);
    if (!device) {
      throw new SecurityError(`Unauthorized upload. Device ID ${context.deviceId} is not paired.`);
    }

    // 3. Cryptographic signature verification
    const version = headers['x-snapbridge-version'];
    const timestamp = headers['x-timestamp'];
    const signature = headers['x-signature'] as string;
    const contentLength = headers['content-length'] || '0';

    const signingString = `${version}:${context.deviceId}:${timestamp}:${context.correlationId}:${contentLength}`;
    const verified = this.crypto.verifySignature(device.pairingSecret, signingString, signature);

    if (!verified) {
      this.logger.warn(`[${context.correlationId}] Signature verification failed for device ${context.deviceId}`);
      throw new SecurityError('Cryptographic signature verification failed.');
    }

    this.logger.info(`[${context.correlationId}] Request verified for device: ${device.deviceName}`);
    
    await next();
  }
}
