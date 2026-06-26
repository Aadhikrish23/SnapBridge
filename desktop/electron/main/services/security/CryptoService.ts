import * as crypto from 'crypto';
import { ICryptoService } from 'shared';

export class CryptoService implements ICryptoService {
  public hmacSha256(key: string, message: string): string {
    return crypto.createHmac('sha256', key).update(message).digest('hex');
  }

  public verifySignature(key: string, message: string, signature: string): boolean {
    try {
      const calculated = this.hmacSha256(key, message);
      
      const calcBuf = Buffer.from(calculated, 'hex');
      const sigBuf = Buffer.from(signature, 'hex');
      
      if (calcBuf.length !== sigBuf.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(calcBuf, sigBuf);
    } catch {
      return false;
    }
  }

  public generateRandomToken(length = 32): string {
    // 32 bytes gives 64 hex characters
    return crypto.randomBytes(length).toString('hex');
  }
}
