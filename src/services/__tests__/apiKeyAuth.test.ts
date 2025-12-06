import { ApiKeyAuthService } from '../apiKeyAuth';

describe('ApiKeyAuthService', () => {
  let service: ApiKeyAuthService;

  beforeEach(() => {
    // Create a new instance for each test
    process.env.API_KEY_SECRET = 'test-secret-key-with-at-least-32-characters';
    process.env.API_KEYS = '';
    service = new ApiKeyAuthService();
  });

  describe('hashApiKey', () => {
    it('should generate consistent hash for same input', () => {
      const key = 'test-api-key';
      const hash1 = service.hashApiKey(key);
      const hash2 = service.hashApiKey(key);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe('string');
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = service.hashApiKey('key1');
      const hash2 = service.hashApiKey('key2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate hex string', () => {
      const hash = service.hashApiKey('test-key');
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('validateApiKey', () => {
    it('should reject invalid API key when no keys configured', () => {
      const result = service.validateApiKey('invalid-key');
      expect(result).toBe(false);
    });

    it('should validate correct API key', () => {
      const apiKey = 'test-api-key-12345';
      const hash = service.hashApiKey(apiKey);
      service.addApiKey('test-key', hash);

      const result = service.validateApiKey(apiKey);
      expect(result).toBe(true);
    });

    it('should reject incorrect API key', () => {
      const apiKey = 'correct-key';
      const hash = service.hashApiKey(apiKey);
      service.addApiKey('test-key', hash);

      const result = service.validateApiKey('wrong-key');
      expect(result).toBe(false);
    });

    it('should reject null or undefined API key', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(service.validateApiKey(null as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(service.validateApiKey(undefined as any)).toBe(false);
    });

    it('should reject non-string API key', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(service.validateApiKey(123 as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(service.validateApiKey({} as any)).toBe(false);
    });
  });

  describe('generateApiKey', () => {
    it('should generate valid API key and hash', () => {
      const { key, hash } = service.generateApiKey();

      expect(key).toBeTruthy();
      expect(hash).toBeTruthy();
      expect(typeof key).toBe('string');
      expect(typeof hash).toBe('string');
      expect(key.length).toBeGreaterThan(0);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate unique keys', () => {
      const result1 = service.generateApiKey();
      const result2 = service.generateApiKey();

      expect(result1.key).not.toBe(result2.key);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('generated key should validate against its hash', () => {
      const { key, hash } = service.generateApiKey();
      service.addApiKey('generated', hash);

      expect(service.validateApiKey(key)).toBe(true);
    });
  });

  describe('addApiKey and removeApiKey', () => {
    it('should add and remove API keys', () => {
      const hash = service.hashApiKey('test-key');
      
      service.addApiKey('key1', hash);
      expect(service.getKeyCount()).toBe(1);

      service.removeApiKey('key1');
      expect(service.getKeyCount()).toBe(0);
    });

    it('should return false when removing non-existent key', () => {
      const result = service.removeApiKey('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getKeyCount', () => {
    it('should return correct count', () => {
      expect(service.getKeyCount()).toBe(0);

      service.addApiKey('key1', 'hash1');
      expect(service.getKeyCount()).toBe(1);

      service.addApiKey('key2', 'hash2');
      expect(service.getKeyCount()).toBe(2);

      service.removeApiKey('key1');
      expect(service.getKeyCount()).toBe(1);
    });
  });
});
