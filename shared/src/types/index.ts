export interface ConfigurationSchema {
  uploadFolder: string;
  autoOpenFolder: boolean;
  autoCopyClipboard: boolean;
  startWithWindows: boolean;
  notificationsEnabled: boolean;
  port: number;
}

export interface PairedDevice {
  deviceId: string;
  deviceName: string;
  pairingSecret: string;
  pairedAt: string; // ISO timestamp
}

export interface UploadHistoryRecord {
  uploadId: string;
  correlationId: string;
  deviceId: string;
  filename: string;
  filePath: string;
  fileSize: number;
  fileHash: string; // SHA-256 hash of the image file
  createdAt: string; // ISO timestamp
}

export interface PipelineContext {
  uploadId: string;        // Unique ID for this upload
  correlationId: string;   // Trace identifier for logs & diagnostic events
  imageStream: any;        // Incoming HTTP request stream (buffered fully into memory in DecodeStep)
  imageBuffer?: Uint8Array;    // Populated once buffered in memory
  mimeType?: string;       // Extracted MIME type (e.g. image/jpeg)
  fileExtension?: string;  // Extracted extension (e.g. .jpg)
  timestamp: Date;
  deviceId: string;
  savePath?: string;       // Absolute path where saved on Windows
  metadata: Record<string, any>;
}

