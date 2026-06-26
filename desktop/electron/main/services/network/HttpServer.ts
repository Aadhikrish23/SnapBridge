import * as http from 'http';
import * as crypto from 'crypto';
import { INetworkServer } from '../../domain/INetworkServer';
import { ILogger } from '../../domain/ILogger';
import { IPersistenceService } from '../../domain/IPersistenceService';
import { IConfigurationService } from '../../domain/IConfigurationService';
import { ImagePipeline } from '../pipeline/ImagePipeline';
import { Router } from './Router';
import { PipelineContext } from 'shared';
import { PairRequest, PairResponse, PingResponse, UploadResponse } from 'shared';

export class HttpServer implements INetworkServer {
  private server: http.Server | null = null;
  private logger: ILogger;
  private db: IPersistenceService;
  private configService: IConfigurationService;
  private pipeline: ImagePipeline;
  private router = new Router();
  private activePort: number | null = null;

  constructor(
    logger: ILogger,
    db: IPersistenceService,
    configService: IConfigurationService,
    pipeline: ImagePipeline
  ) {
    this.logger = logger;
    this.db = db;
    this.configService = configService;
    this.pipeline = pipeline;
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.register('GET', '/ping', (req, res, correlationId) => this.handlePing(res, correlationId));
    this.router.register('POST', '/pair', (req, res, correlationId) => this.handlePair(req, res, correlationId));
    this.router.register('POST', '/upload', (req, res, correlationId) => this.handleUpload(req, res, correlationId));
  }

  public async start(port: number): Promise<void> {
    if (this.server) {
      this.logger.warn('HTTP Server is already running.');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer((req, res) => {
          this.handleRequest(req, res);
        });

        this.server.listen(port, () => {
          this.activePort = port;
          this.logger.info(`HTTP background server listening on port: ${port}`);
          resolve();
        });

        this.server.on('error', (err) => {
          this.logger.error(`HTTP server failed to start on port ${port}`, err);
          this.server = null;
          reject(err);
        });
      } catch (err) {
        this.logger.error(`Critical error starting HTTP server on port ${port}`, err);
        this.server = null;
        reject(err);
      }
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((err) => {
        if (err) {
          this.logger.error('Error stopping HTTP server', err);
          reject(err);
        } else {
          this.logger.info('HTTP background server stopped.');
          this.server = null;
          this.activePort = null;
          resolve();
        }
      });
    });
  }

  public isListening(): boolean {
    return this.server !== null && this.server.listening;
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();

    // Set CORS headers for local LAN communication
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const handled = this.router.dispatch(req, res, correlationId);
    if (!handled) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  }

  private handlePing(res: http.ServerResponse, correlationId: string): void {
    const response: PingResponse = {
      status: 'ok',
      version: '1',
      desktopName: this.osHostname(),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  private handlePair(req: http.IncomingMessage, res: http.ServerResponse, correlationId: string): void {
    const chunks: any[] = [];
    
    req.on('data', chunk => chunks.push(chunk));
    
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        let payload: PairRequest;
        
        try {
          payload = JSON.parse(body);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Malformed JSON payload.' }));
          return;
        }

        if (!payload.deviceId || !payload.deviceName || !payload.pairingSecret) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid pairing request payload structure.' }));
          return;
        }

        const activeSecret = this.db.getSetting('pairing_secret_temp');
        if (!activeSecret || activeSecret !== payload.pairingSecret) {
          this.logger.warn(`[${correlationId}] Unauthorized pairing attempt from device: ${payload.deviceName}`);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid or expired pairing code.' }));
          return;
        }

        this.db.savePairedDevice({
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
          pairingSecret: payload.pairingSecret,
          pairedAt: new Date().toISOString(),
        });

        this.db.deleteSetting('pairing_secret_temp');

        const response: PairResponse = {
          success: true,
          message: 'Device paired successfully.',
          deviceId: 'desktop-host-id',
          deviceName: this.osHostname(),
        };

        this.logger.info(`[${correlationId}] Successfully paired with device: ${payload.deviceName}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (err: any) {
        this.logger.error(`[${correlationId}] Exception processing pair request:`, err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Internal server error.' }));
      }
    });
  }

  private async handleUpload(req: http.IncomingMessage, res: http.ServerResponse, correlationId: string): Promise<void> {
    const uploadId = crypto.randomUUID();
    const deviceId = req.headers['x-device-id'] as string || '';

    const context: PipelineContext = {
      uploadId,
      correlationId,
      imageStream: req,
      timestamp: new Date(),
      deviceId,
      metadata: {
        headers: req.headers,
      },
    };

    try {
      await this.pipeline.execute(context);

      const response: UploadResponse = {
        success: true,
        uploadId,
        correlationId,
        filename: context.metadata.filename || 'unknown',
        path: context.savePath,
        message: 'Upload processed successfully.',
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (error: any) {
      const isClientError = error.code === 'VALIDATION_ERROR' || error.code === 'SECURITY_ERROR' || error.code === 'PAYLOAD_TOO_LARGE';
      let statusCode = 500;
      
      if (error.code === 'SECURITY_ERROR') {
        statusCode = 401;
      } else if (error.code === 'PAYLOAD_TOO_LARGE') {
        statusCode = 413;
      } else if (isClientError) {
        statusCode = 400;
      }

      this.logger.error(`[${correlationId}] Pipeline execution failed with error: ${error.message} (${error.code})`);

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        uploadId,
        correlationId,
        filename: context.metadata.filename || 'unknown',
        message: error.message || 'Pipeline execution failed.',
      }));
    }
  }

  private osHostname(): string {
    try {
      const os = require('os');
      return os.hostname();
    } catch {
      return 'Windows-PC';
    }
  }
}
