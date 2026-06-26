export interface UploadResponse {
  success: boolean;
  uploadId: string;
  correlationId: string;
  filename: string;
  path?: string;
  message?: string;
}
