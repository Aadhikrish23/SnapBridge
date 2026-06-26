export interface ICryptoService {
  /**
   * Generates an HMAC-SHA256 signature for a message using a key, returning a hex-encoded string.
   */
  hmacSha256(key: string, message: string): string;

  /**
   * Verifies an HMAC-SHA256 signature.
   */
  verifySignature(key: string, message: string, signature: string): boolean;

  /**
   * Generates a high-entropy random hex token.
   */
  generateRandomToken(length?: number): string;
}
