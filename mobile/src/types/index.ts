export interface MobileConfig {
  desktopHost: string | null;
  desktopPort: number;
  deviceId: string;
  deviceName: string;
  pairingSecret: string | null;
  pairedDesktopId: string | null;
  pairedDesktopName: string | null;
  qualityPreset: 'High' | 'Balanced' | 'Fast';
  autoUpload: boolean;
  autoReturn: boolean;
}

export interface DesktopTarget {
  host: string;
  port: number;
  name: string;
  uuid: string;
}

export interface CapturedImage {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  fileName: string;
}

export interface UploadProgress {
  correlationId: string;
  bytesTotal: number;
  bytesSent: number;
  percent: number;
  status: 'pending' | 'uploading' | 'success' | 'failed' | 'retrying';
  error?: string;
  attempt: number;
  maxAttempts: number;
}

export interface QrPayload {
  uuid: string;
  secret: string;
  service: string;
  port: number;
}
