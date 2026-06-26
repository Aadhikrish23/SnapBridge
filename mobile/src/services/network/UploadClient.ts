import { CapturedImage, UploadProgress } from '../../types';
import { ServiceProvider } from '../ServiceProvider';
import { HEADERS, MAX_FILE_SIZE_BYTES } from 'shared';

export class UploadClient {
  public async uploadImage(
    image: CapturedImage,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; message: string; uploadId?: string }> {
    const storage = ServiceProvider.storage;
    const config = storage.loadConfig();
    const crypto = ServiceProvider.crypto;

    // 1. Verify size limit
    if (image.fileSize > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        message: `File size (${(image.fileSize / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of 15MB.`,
      };
    }

    if (!config.desktopHost || !config.pairingSecret) {
      throw new Error('Device is not paired with a desktop host.');
    }

    // 2. Perform pre-upload ping validation to verify host is online
    try {
      const pingUrl = `http://${config.desktopHost}:${config.desktopPort}/ping`;
      const pingController = new AbortController();
      const pingTimeout = setTimeout(() => pingController.abort(), 3000); // 3-second quick timeout
      const pingResponse = await fetch(pingUrl, { signal: pingController.signal });
      clearTimeout(pingTimeout);
      if (!pingResponse.ok) {
        throw new Error('Server returned error status on ping.');
      }
    } catch (pingErr) {
      // Save failed upload in queue
      storage.savePendingUpload(image);
      return {
        success: false,
        message: 'Desktop server is offline. Upload queued for manual retry.',
      };
    }

    const correlationId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    const timestamp = Date.now().toString();
    const version = '1';
    const contentLength = image.fileSize.toString();

    const signingString = `${version}:${config.deviceId}:${timestamp}:${correlationId}:${contentLength}`;
    const signature = crypto.hmacSha256(config.pairingSecret, signingString);

    const uploadUrl = `http://${config.desktopHost}:${config.desktopPort}/upload`;
    const maxAttempts = 2; // Original + 1 retry

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (onProgress) {
        onProgress({
          correlationId,
          bytesTotal: image.fileSize,
          bytesSent: 0,
          percent: attempt > 1 ? 10 : 0,
          status: attempt > 1 ? 'retrying' : 'uploading',
          attempt,
          maxAttempts,
        });
      }

      try {
        const localFileResponse = await fetch(image.uri);
        const blob = await localFileResponse.blob();

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            [HEADERS.VERSION]: version,
            [HEADERS.DEVICE_ID]: config.deviceId,
            [HEADERS.TIMESTAMP]: timestamp,
            [HEADERS.CORRELATION_ID]: correlationId,
            [HEADERS.SIGNATURE]: signature,
            'Content-Type': image.mimeType || 'image/jpeg',
            'Content-Length': contentLength,
          },
          body: blob,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errMsg = `Upload failed with status ${response.status}`;
          try {
            const parsed = JSON.parse(errorText);
            if (parsed.message) errMsg = parsed.message;
          } catch {}
          throw new Error(errMsg);
        }

        const result = await response.json();

        // Successful upload, clear pending failed queue
        storage.savePendingUpload(null);

        if (onProgress) {
          onProgress({
            correlationId,
            bytesTotal: image.fileSize,
            bytesSent: image.fileSize,
            percent: 100,
            status: 'success',
            attempt,
            maxAttempts,
          });
        }

        return {
          success: true,
          message: result.message || 'Image uploaded successfully.',
          uploadId: result.uploadId,
        };
      } catch (error: any) {
        console.warn(`[UploadClient] Upload attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxAttempts) {
          // Last attempt failed, store in queue and return failure
          storage.savePendingUpload(image);
          if (onProgress) {
            onProgress({
              correlationId,
              bytesTotal: image.fileSize,
              bytesSent: 0,
              percent: 0,
              status: 'failed',
              error: error.message || 'Upload failed.',
              attempt,
              maxAttempts,
            });
          }
          return {
            success: false,
            message: error.message || 'Upload failed after retry.',
          };
        }
        
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { success: false, message: 'Upload failed.' };
  }

  public async pairDevice(
    host: string,
    port: number,
    pairingSecret: string
  ): Promise<{ success: boolean; message: string; deviceId?: string; deviceName?: string }> {
    const storage = ServiceProvider.storage;
    const config = storage.loadConfig();

    const pairUrl = `http://${host}:${port}/pair`;

    const payload = {
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      pairingSecret,
    };

    try {
      const response = await fetch(pairUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = `Pairing failed with status ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.message) errMsg = parsed.message;
        } catch {}
        throw new Error(errMsg);
      }

      const result = await response.json();
      if (result.success) {
        // Save pairing details in config
        storage.updateConfig({
          desktopHost: host,
          desktopPort: port,
          pairingSecret: pairingSecret,
          pairedDesktopId: result.deviceId,
          pairedDesktopName: result.deviceName,
        });

        return {
          success: true,
          message: result.message || 'Device paired successfully.',
          deviceId: result.deviceId,
          deviceName: result.deviceName,
        };
      } else {
        throw new Error(result.message || 'Pairing was rejected by the server.');
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to the desktop server.',
      };
    }
  }
}
