import CryptoJS from 'crypto-js';
import { ICryptoService } from 'shared';

export class MobileCryptoService implements ICryptoService {
  public hmacSha256(key: string, message: string): string {
    const hash = CryptoJS.HmacSHA256(message, key);
    return hash.toString(CryptoJS.enc.Hex);
  }

  public verifySignature(key: string, message: string, signature: string): boolean {
    try {
      const calculated = this.hmacSha256(key, message);
      return calculated.toLowerCase() === signature.toLowerCase();
    } catch {
      return false;
    }
  }

  public generateRandomToken(length: number = 32): string {
    const randomWords = CryptoJS.lib.WordArray.random(length);
    return randomWords.toString(CryptoJS.enc.Hex);
  }
}
