import * as crypto from 'crypto';
import { config } from '../config';

export class ApiKeyAuthService {
  private readonly secret: string;
  private readonly apiKeys: Map<string, string>;

  constructor() {
    this.secret = config.API_KEY_SECRET;
    this.apiKeys = this.loadApiKeys();
  }

  /**
   * Load API keys from environment configuration
   * Format: key1:hashed_value1,key2:hashed_value2
   */
  private loadApiKeys(): Map<string, string> {
    const keys = new Map<string, string>();
    const apiKeysStr = config.API_KEYS;

    if (!apiKeysStr) {
      return keys;
    }

    const pairs = apiKeysStr.split(',');
    for (const pair of pairs) {
      const [keyId, hashedValue] = pair.split(':');
      if (keyId && hashedValue) {
        keys.set(keyId.trim(), hashedValue.trim());
      }
    }

    return keys;
  }

  /**
   * Generate a secure HMAC hash for an API key
   * Uses HMAC-SHA256 for fast and secure hashing
   */
  public hashApiKey(apiKey: string): string {
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(apiKey);
    return hmac.digest('hex');
  }

  /**
   * Validate an API key using constant-time comparison
   * Prevents timing attacks
   */
  public validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    const hash = this.hashApiKey(apiKey);

    // Check against all configured API keys using constant-time comparison
    for (const [, storedHash] of this.apiKeys) {
      if (this.constantTimeCompare(hash, storedHash)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Generate a new API key
   * Returns both the key and its hash
   */
  public generateApiKey(): { key: string; hash: string } {
    const key = crypto.randomBytes(32).toString('base64url');
    const hash = this.hashApiKey(key);
    return { key, hash };
  }

  /**
   * Add a new API key to the service
   */
  public addApiKey(keyId: string, hashedValue: string): void {
    this.apiKeys.set(keyId, hashedValue);
  }

  /**
   * Remove an API key from the service
   */
  public removeApiKey(keyId: string): boolean {
    return this.apiKeys.delete(keyId);
  }

  /**
   * Get the count of configured API keys
   */
  public getKeyCount(): number {
    return this.apiKeys.size;
  }
}

// Singleton instance
export const apiKeyAuthService = new ApiKeyAuthService();
