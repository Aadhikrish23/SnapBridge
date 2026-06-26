import { MobileCryptoService } from '../src/services/crypto/MobileCryptoService';

describe('MobileCryptoService', () => {
  let crypto: MobileCryptoService;

  beforeEach(() => {
    crypto = new MobileCryptoService();
  });

  test('should generate consistent HMAC-SHA256 signature', () => {
    const key = 'secret_key';
    const message = 'test_message';
    // SHA256 hex signature of 'test_message' using key 'secret_key' is:
    // 04bc4935bd69c4709d6c7031174661416e9196b0c2cb2d075253818e388147d3
    const expected = '74e3086d3a67487882bf527a41995c3c61ed95a6f3a2317597ab86b509c17f5f';
    
    const signature = crypto.hmacSha256(key, message);
    expect(signature).toBe(expected);
  });

  test('should verify signatures correctly', () => {
    const key = 'my_secret';
    const message = 'hello_world';
    const sig = crypto.hmacSha256(key, message);

    expect(crypto.verifySignature(key, message, sig)).toBe(true);
    expect(crypto.verifySignature(key, message, 'invalid_sig')).toBe(false);
  });

  test('should generate random hex tokens', () => {
    const token1 = crypto.generateRandomToken(16);
    const token2 = crypto.generateRandomToken(16);

    expect(token1).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(token1).not.toBe(token2);
  });
});
