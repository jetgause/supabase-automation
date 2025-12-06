import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import * as crypto from 'crypto';

export class AdvisoryLockService {
  private pool: Pool;
  private readonly timeout: number;

  constructor() {
    this.pool = new Pool({
      host: config.POSTGRES_HOST,
      port: config.POSTGRES_PORT,
      database: config.POSTGRES_DATABASE,
      user: config.POSTGRES_USER,
      password: config.POSTGRES_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: config.ADVISORY_LOCK_TIMEOUT,
    });

    this.timeout = config.ADVISORY_LOCK_TIMEOUT;

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  /**
   * Generate a numeric lock ID from a string key
   * PostgreSQL advisory locks require bigint (int8) identifiers
   */
  private generateLockId(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest();
    // Use first 8 bytes of hash as bigint, ensure it's positive
    const buffer = hash.slice(0, 8);
    const bigintValue = buffer.readBigInt64BE();
    // Take absolute value to ensure positive number
    return (bigintValue >= 0n ? bigintValue : -bigintValue).toString();
  }

  /**
   * Acquire an advisory lock for a specific trading operation
   * Returns a client that holds the lock, or null if lock cannot be acquired
   */
  public async acquireLock(
    lockKey: string,
    timeout?: number
  ): Promise<PoolClient | null> {
    const lockId = this.generateLockId(lockKey);
    const client = await this.pool.connect();
    const lockTimeout = timeout || this.timeout;

    try {
      // Set statement timeout using parameterized query
      await client.query('SET statement_timeout = $1', [lockTimeout]);

      // Try to acquire advisory lock (non-blocking)
      // pg_try_advisory_lock returns immediately with true/false
      const result = await client.query(
        'SELECT pg_try_advisory_lock($1) as acquired',
        [lockId]
      );

      if (result.rows[0].acquired) {
        return client;
      } else {
        // Lock not acquired, release client
        client.release();
        return null;
      }
    } catch (error) {
      // Error occurred, release client
      client.release();
      throw error;
    }
  }

  /**
   * Release an advisory lock
   */
  public async releaseLock(client: PoolClient, lockKey: string): Promise<void> {
    const lockId = this.generateLockId(lockKey);

    try {
      await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    } finally {
      client.release();
    }
  }

  /**
   * Execute a function with an advisory lock
   * Automatically acquires and releases the lock
   */
  public async withLock<T>(
    lockKey: string,
    fn: (client: PoolClient) => Promise<T>,
    timeout?: number
  ): Promise<T> {
    const client = await this.acquireLock(lockKey, timeout);

    if (!client) {
      throw new Error(`Failed to acquire lock for key: ${lockKey}`);
    }

    try {
      return await fn(client);
    } finally {
      await this.releaseLock(client, lockKey);
    }
  }

  /**
   * Try to execute a function with an advisory lock
   * Returns null if lock cannot be acquired instead of throwing
   */
  public async tryWithLock<T>(
    lockKey: string,
    fn: (client: PoolClient) => Promise<T>,
    timeout?: number
  ): Promise<T | null> {
    const client = await this.acquireLock(lockKey, timeout);

    if (!client) {
      return null;
    }

    try {
      return await fn(client);
    } finally {
      await this.releaseLock(client, lockKey);
    }
  }

  /**
   * Check if a lock is currently held
   */
  public async isLocked(lockKey: string): Promise<boolean> {
    const lockId = this.generateLockId(lockKey);
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT EXISTS(
          SELECT 1 FROM pg_locks 
          WHERE locktype = 'advisory' 
          AND objid = $1::bigint
        ) as locked`,
        [lockId]
      );

      return result.rows[0].locked;
    } finally {
      client.release();
    }
  }

  /**
   * Get all currently held advisory locks
   */
  public async getActiveLocks(): Promise<Array<{ lockId: string; pid: number }>> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT objid as lock_id, pid 
         FROM pg_locks 
         WHERE locktype = 'advisory'
         ORDER BY pid`
      );

      return result.rows.map((row) => ({
        lockId: row.lock_id,
        pid: row.pid,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Close the connection pool
   */
  public async shutdown(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get pool statistics
   */
  public getStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Singleton instance
export const advisoryLockService = new AdvisoryLockService();
