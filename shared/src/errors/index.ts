export class SnapBridgeError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends SnapBridgeError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, code);
  }
}

export class SecurityError extends SnapBridgeError {
  constructor(message: string, code = 'SECURITY_ERROR') {
    super(message, code);
  }
}

export class NetworkError extends SnapBridgeError {
  constructor(message: string, code = 'NETWORK_ERROR') {
    super(message, code);
  }
}

export class StorageError extends SnapBridgeError {
  constructor(message: string, code = 'STORAGE_ERROR') {
    super(message, code);
  }
}

export class PairingError extends SnapBridgeError {
  constructor(message: string, code = 'PAIRING_ERROR') {
    super(message, code);
  }
}
