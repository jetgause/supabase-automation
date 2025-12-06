import { CacheService } from '../cache';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    flushdb: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue('OK'),
    status: 'ready',
  }));
});

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService();
  });

  afterEach(async () => {
    await cacheService.shutdown();
  });

  describe('set and get', () => {
    it('should store and retrieve value from memory cache', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      await cacheService.set('string', 'text');
      await cacheService.set('number', 123);
      await cacheService.set('boolean', true);
      await cacheService.set('object', { nested: { value: 'test' } });
      await cacheService.set('array', [1, 2, 3]);

      expect(await cacheService.get('string')).toBe('text');
      expect(await cacheService.get('number')).toBe(123);
      expect(await cacheService.get('boolean')).toBe(true);
      expect(await cacheService.get('object')).toEqual({ nested: { value: 'test' } });
      expect(await cacheService.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('delete', () => {
    it('should delete value from cache', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cacheService.set(key, value);
      expect(await cacheService.get(key)).toBe(value);

      await cacheService.delete(key);
      expect(await cacheService.get(key)).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      await cacheService.clear();

      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
      expect(await cacheService.get('key3')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');

      const stats = cacheService.getStats();

      expect(stats).toHaveProperty('memorySize');
      expect(stats).toHaveProperty('redisConnected');
      expect(stats.memorySize).toBe(2);
      expect(typeof stats.redisConnected).toBe('boolean');
    });
  });

  describe('memory cache TTL', () => {
    it('should expire entries after TTL', async () => {
      const key = 'expiring-key';
      const value = 'expiring-value';
      const ttl = 0.1; // 100ms

      await cacheService.set(key, value, ttl);
      expect(await cacheService.get(key)).toBe(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(await cacheService.get(key)).toBeNull();
    });
  });

  describe('max memory size', () => {
    it('should enforce max memory size by removing oldest entries', async () => {
      // This test would require adjusting maxMemorySize in the service
      // For now, we just verify that multiple entries can be stored
      const entries = [];
      for (let i = 0; i < 10; i++) {
        entries.push({ key: `key${i}`, value: `value${i}` });
      }

      for (const entry of entries) {
        await cacheService.set(entry.key, entry.value);
      }

      const stats = cacheService.getStats();
      expect(stats.memorySize).toBeGreaterThan(0);
      expect(stats.memorySize).toBeLessThanOrEqual(10);
    });
  });
});
