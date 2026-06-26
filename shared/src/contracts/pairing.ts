export interface PairRequest {
  deviceId: string;
  deviceName: string;
  pairingSecret: string; // Dynamic secret scanned from QR
}

export interface PairResponse {
  success: boolean;
  message: string;
  deviceId: string; // Desktop's own identifier
  deviceName: string; // Desktop name
}

export interface PingResponse {
  status: 'ok';
  version: string;
  desktopName: string;
}
