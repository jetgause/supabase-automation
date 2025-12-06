import Redis from 'ioredis';
import { config } from '../config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry<unknown>>;
  private redisClient: Redis | null;
  private readonly memoryTtl: number;
  private readonly redisTtl: number;
  private readonly maxMemorySize: number;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.memoryCache = new Map();
    this.memoryTtl = config.CACHE_MEMORY_TTL * 1000; // Convert to milliseconds
    this.redisTtl = config.CACHE_REDIS_TTL;
    this.maxMemorySize = config.CACHE_MAX_MEMORY_SIZE;
    this.cleanupInterval = null;

    // Initialize Redis client
    this.redisClient = this.initializeRedis();

    // Start cleanup interval for memory cache
    this.startCleanup();
  }

  private initializeRedis(): Redis | null {
    try {
      const client = new Redis({
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        password: config.REDIS_PASSWORD || undefined,
        db: config.REDIS_DB,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      client.on('error', (err) => {
        console.error('Redis connection error:', err);
      });

      client.on('connect', () => {
        console.log('Redis connected successfully');
      });

      // Connect asynchronously
      client.connect().catch((err) => {
        console.error('Failed to connect to Redis:', err);
      });

      return client;
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      return null;
    }
  }

  /**
   * Get value from cache (checks memory first, then Redis)
   */
  public async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      const now = Date.now();
      if (now - memoryEntry.timestamp < memoryEntry.ttl) {
        return memoryEntry.data as T;
      } else {
        // Expired, remove from memory
        this.memoryCache.delete(key);
      }
    }

    // Fallback to Redis
    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const value = await this.redisClient.get(key);
        if (value) {
          const data = JSON.parse(value) as T;
          // Populate memory cache for subsequent fast access
          this.setMemory(key, data);
          return data;
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    return null;
  }

  /**
   * Set value in both memory and Redis cache
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const memoryTtl = ttl ? ttl * 1000 : this.memoryTtl;
    const redisTtl = ttl || this.redisTtl;

    // Set in memory cache
    this.setMemory(key, value, memoryTtl);

    // Set in Redis cache
    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const serialized = JSON.stringify(value);
        await this.redisClient.setex(key, redisTtl, serialized);
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }
  }

  /**
   * Set value only in memory cache
   */
  private setMemory<T>(key: string, value: T, ttl?: number): void {
    // Enforce max memory size
    if (this.memoryCache.size >= this.maxMemorySize) {
      // Remove oldest entry
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.memoryTtl,
    });
  }

  /**
   * Delete value from both caches
   */
  public async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidatePattern(pattern: string): Promise<void> {
    // Clear matching keys from memory
    const keysToDelete: string[] = [];
    for (const key of this.memoryCache.keys()) {
      if (this.matchPattern(key, pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.memoryCache.delete(key));

    // Clear matching keys from Redis
    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (error) {
        console.error('Redis pattern invalidation error:', error);
      }
    }
  }

  /**
   * Simple pattern matching (supports * wildcard)
   */
  private matchPattern(str: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(str);
  }

  /**
   * Clear all caches
   */
  public async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        await this.redisClient.flushdb();
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
  }

  /**
   * Start periodic cleanup of expired memory cache entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.memoryCache.entries()) {
        if (now - entry.timestamp >= entry.ttl) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => this.memoryCache.delete(key));
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup interval and disconnect Redis
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    memorySize: number;
    redisConnected: boolean;
  } {
    return {
      memorySize: this.memoryCache.size,
      redisConnected: this.redisClient?.status === 'ready' || false,
    };
  }
}

// Singleton instance
export const cacheService = new CacheService();
