# Architecture Documentation

## Overview

The Supabase Automation system is designed for high-performance, secure paper trading operations with the following key architectural components:

## Core Components

### 1. PostgreSQL Advisory Locks

**Purpose**: Prevent concurrent execution conflicts during trading operations.

**Implementation**:
- Uses PostgreSQL's native advisory lock mechanism
- Generates numeric lock IDs from string keys using SHA-256 hashing
- Supports both blocking (`withLock`) and non-blocking (`tryWithLock`) acquisition
- Automatic lock release via try-finally blocks

**Key Features**:
- Thread-safe execution
- Distributed locking across multiple processes
- Configurable timeout
- Lock introspection (check active locks, lock status)

**Usage Example**:
```typescript
import { advisoryLockService } from './services';

// Execute with lock
const result = await advisoryLockService.withLock(
  'trade:AAPL',
  async (client) => {
    // Critical section - only one process can execute this at a time
    return performTrade(client);
  }
);
```

### 2. Multi-Layer Caching

**Purpose**: Provide low-latency data access with persistent fallback.

**Architecture**:
```
Request → Memory Cache (L1) → Redis Cache (L2) → Database
```

**Features**:
- **Memory Cache**: In-memory Map for sub-millisecond access
- **Redis Cache**: Distributed cache for persistent storage
- **TTL Management**: Configurable TTL for both layers
- **Pattern Invalidation**: Wildcard pattern matching for bulk invalidation
- **Automatic Cleanup**: Periodic cleanup of expired entries
- **LRU Eviction**: Enforces max memory size by removing oldest entries

**Cache Flow**:
1. Check memory cache first
2. If miss, check Redis
3. If Redis hit, populate memory cache
4. If both miss, fetch from source and populate both caches

**Usage Example**:
```typescript
import { cacheService } from './services';

// Set with default TTL
await cacheService.set('position:AAPL', positionData);

// Set with custom TTL (seconds)
await cacheService.set('price:AAPL', priceData, 60);

// Get (checks both layers)
const data = await cacheService.get('position:AAPL');

// Invalidate pattern
await cacheService.invalidatePattern('position:*');
```

### 3. HMAC-Based Authentication

**Purpose**: Fast, secure API key authentication without database lookups.

**Design**:
- Uses HMAC-SHA256 for key hashing
- Constant-time comparison to prevent timing attacks
- Pre-computed hashes stored in memory
- No bcrypt overhead - optimized for API key validation

**Security Features**:
- Timing-safe comparison using `crypto.timingSafeEqual`
- SHA-256 hashing with configurable secret
- Support for multiple API keys
- Keys never stored in plain text

**Flow**:
```
Request → Extract Bearer Token → HMAC Hash → Constant-Time Compare → Allow/Deny
```

**Usage Example**:
```typescript
import { apiKeyAuthService } from './services';

// Generate new API key
const { key, hash } = apiKeyAuthService.generateApiKey();
// Store hash in environment: API_KEYS=keyId:hash

// Validate key (in middleware)
const isValid = apiKeyAuthService.validateApiKey(apiKey);
```

### 4. Input Validation with Zod

**Purpose**: Type-safe validation with comprehensive error messages.

**Validators**:
- **Webhook URLs**: Protocol check, length limits, private IP blocking
- **Tool Names**: Alphanumeric with hyphens/underscores
- **Symbols**: Uppercase, limited character set
- **Alert Payloads**: Complex nested validation
- **Trading Parameters**: Enum validation, defaults

**Features**:
- Runtime type checking
- Automatic type inference
- Transform functions (e.g., uppercase conversion)
- Detailed error messages with paths
- Middleware integration

**Usage Example**:
```typescript
import { validateBody } from './middleware';
import { alertPayloadSchema } from './validators';

// Apply validation middleware
router.post('/alerts', validateBody(alertPayloadSchema), handler);
```

## Data Flow

### Trading Alert Processing

```
1. HTTP Request → API Gateway
2. Authentication Middleware → API Key Validation
3. Validation Middleware → Zod Schema Check
4. Route Handler → Business Logic
   a. Acquire Advisory Lock (lockKey: "trade:{symbol}")
   b. Fetch Current Position (cache → database)
   c. Calculate New Position
   d. Store Updated Position
   e. Invalidate Cache Pattern
   f. Release Advisory Lock
5. Response → JSON
```

### Caching Strategy

```
Write Path:
- Set in Memory Cache (O(1))
- Set in Redis (async)

Read Path:
- Check Memory (O(1))
  - If hit: return
  - If miss: check Redis
    - If hit: populate memory, return
    - If miss: fetch source, populate both
```

## Error Handling

### Graceful Degradation

1. **Redis Unavailable**: Falls back to memory cache only
2. **PostgreSQL Unavailable**: Connection pool retry with exponential backoff
3. **Lock Acquisition Failure**: Returns null or throws based on method used

### Error Recovery

- Connection pools automatically reconnect
- Cache service monitors Redis status
- Advisory locks released on error via try-finally

## Performance Considerations

### Optimizations

1. **Memory Cache**: Sub-millisecond access for hot data
2. **HMAC vs Bcrypt**: ~1000x faster authentication
3. **Advisory Locks**: No polling, uses PostgreSQL's efficient locking
4. **Connection Pooling**: Reuses database connections
5. **Lazy Redis Connection**: Only connects when first needed

### Scalability

- Stateless API design allows horizontal scaling
- Redis provides distributed caching
- PostgreSQL advisory locks work across processes
- Connection pools prevent resource exhaustion

## Security Design

### Defense in Depth

1. **Authentication Layer**: HMAC API keys with timing-safe comparison
2. **Validation Layer**: Strict Zod schemas with type checking
3. **Query Layer**: Parameterized queries prevent SQL injection
4. **Network Layer**: Private IP blocking in production
5. **Error Handling**: No stack traces in production

### Attack Prevention

- **SQL Injection**: Parameterized queries only
- **Timing Attacks**: Constant-time key comparison
- **DoS**: Connection pooling, cache limits
- **XSS**: JSON responses only, no HTML
- **CSRF**: Stateless API, no cookies

## Monitoring & Observability

### Built-in Metrics

- Cache hit/miss rates (`cacheService.getStats()`)
- Active advisory locks (`advisoryLockService.getActiveLocks()`)
- Connection pool statistics (`advisoryLockService.getStats()`)
- API key count (`apiKeyAuthService.getKeyCount()`)

### Logging

- Request/response logging with duration
- Error logging with context
- Connection status logging

## Deployment Considerations

### Environment Variables

Required for production:
```
DATABASE_URL=postgresql://...
REDIS_HOST=...
API_KEY_SECRET=... (min 32 chars)
API_KEYS=key1:hash1,key2:hash2
```

### Database Setup

PostgreSQL must be configured with:
- Advisory lock support (built-in)
- Connection pooling limits
- Appropriate timeout settings

### Redis Setup

- Configure persistence (AOF/RDB)
- Set max memory policy (e.g., allkeys-lru)
- Enable authentication in production

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure API keys (32+ chars)
- [ ] Set up PostgreSQL connection string
- [ ] Configure Redis with authentication
- [ ] Review timeout settings
- [ ] Enable SSL/TLS for Redis and PostgreSQL
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Test graceful shutdown
- [ ] Verify cache invalidation works
- [ ] Test advisory lock contention handling
