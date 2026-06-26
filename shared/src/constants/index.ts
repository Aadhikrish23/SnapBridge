export const PROTOCOL_VERSION = '1';

export const DEFAULT_PORT = 53210;

export const MDNS_SERVICE_TYPE = 'snapbridge'; // will resolve to _snapbridge._tcp.local.
export const MDNS_SERVICE_PROTOCOL = 'tcp';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

// Max allowed clock skew between device and desktop to prevent replay attacks (5 minutes)
export const MAX_CLOCK_SKEW_MS = 300 * 1000;

export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png'] as const;

export const DEFAULT_UPLOAD_SUBFOLDER = 'SnapBridge';
