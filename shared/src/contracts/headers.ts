export const HEADERS = {
  VERSION: 'x-snapbridge-version',
  DEVICE_ID: 'x-device-id',
  TIMESTAMP: 'x-timestamp',
  CORRELATION_ID: 'x-correlation-id',
  SIGNATURE: 'x-signature',
} as const;

export interface SnapBridgeHeaders {
  [HEADERS.VERSION]: string;
  [HEADERS.DEVICE_ID]: string;
  [HEADERS.TIMESTAMP]: string;
  [HEADERS.CORRELATION_ID]: string;
  [HEADERS.SIGNATURE]: string;
}
