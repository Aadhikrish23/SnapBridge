import { PROTOCOL_VERSION, MAX_CLOCK_SKEW_MS, SUPPORTED_MIME_TYPES, SUPPORTED_EXTENSIONS } from '../constants';
import { HEADERS } from '../contracts/headers';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorType?: 'VALIDATION' | 'SECURITY';
}

export interface ImageTypeResult {
  isValid: boolean;
  mimeType?: typeof SUPPORTED_MIME_TYPES[number];
  extension?: typeof SUPPORTED_EXTENSIONS[number];
}

/**
 * Validates request headers for version, timestamp drift, and required fields.
 */
export function validateHeaders(headers: Record<string, string | string[] | undefined>, serverTimeMs: number = Date.now()): ValidationResult {
  const version = headers[HEADERS.VERSION];
  const deviceId = headers[HEADERS.DEVICE_ID];
  const timestampStr = headers[HEADERS.TIMESTAMP];
  const correlationId = headers[HEADERS.CORRELATION_ID];
  const signature = headers[HEADERS.SIGNATURE];

  if (!version || version !== PROTOCOL_VERSION) {
    return { isValid: false, error: `Invalid or missing protocol version. Expected ${PROTOCOL_VERSION}, got ${version}` };
  }

  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
    return { isValid: false, error: 'Missing or invalid device identifier header.' };
  }

  if (!correlationId || typeof correlationId !== 'string' || correlationId.trim() === '') {
    return { isValid: false, error: 'Missing or invalid correlation identifier header.' };
  }

  if (!signature || typeof signature !== 'string' || signature.trim() === '') {
    return { isValid: false, error: 'Missing or invalid cryptographic signature header.' };
  }

  if (!timestampStr || typeof timestampStr !== 'string') {
    return { isValid: false, error: 'Missing or invalid timestamp header.' };
  }

  const timestampMs = parseInt(timestampStr, 10);
  if (isNaN(timestampMs)) {
    return { isValid: false, error: 'Timestamp header is not a valid integer.' };
  }

  const skew = Math.abs(serverTimeMs - timestampMs);
  if (skew > MAX_CLOCK_SKEW_MS) {
    return { isValid: false, errorType: 'SECURITY', error: `Clock skew too large. Skew is ${Math.round(skew / 1000)} seconds (max allowed: ${MAX_CLOCK_SKEW_MS / 1000}s). Please check device time settings.` };
  }

  return { isValid: true };
}

/**
 * Validates file magic bytes to determine if the payload is a valid JPEG or PNG.
 * Prevents disguised files (e.g. executable renamed as .jpg).
 */
export function validateImageMagicBytes(buffer: Uint8Array): ImageTypeResult {
  if (buffer.length < 8) {
    return { isValid: false };
  }

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { isValid: true, mimeType: 'image/jpeg', extension: '.jpg' };
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { isValid: true, mimeType: 'image/png', extension: '.png' };
  }

  return { isValid: false };
}
