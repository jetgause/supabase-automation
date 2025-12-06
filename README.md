# Supabase Automation

A high-performance, secure automation system for paper trading with enhanced reliability features.

## Features

### 1. PostgreSQL Advisory Locks
- Prevents concurrent execution conflicts during paper trading operations
- Uses PostgreSQL's native advisory locks for robust synchronization
- Thread-safe trade execution with automatic lock management

### 2. Multi-Layer Caching Strategy
- **Memory Cache**: Low-latency in-memory storage for frequently accessed data
- **Redis Cache**: Distributed cache for persistent storage and fallback
- Automatic cache invalidation with pattern matching
- Configurable TTL for both layers

### 3. HMAC-Based API Key Authentication
- Fast and secure authentication using HMAC-SHA256
- Constant-time comparison to prevent timing attacks
- Efficient key validation without database lookups
- Support for multiple API keys

### 4. Input Sanitization with Zod
- Strict validation for webhook URLs, tool names, symbols, and alert payloads
- Type-safe request validation at runtime
- Protection against malicious inputs and injection attacks
- Comprehensive error messages

### 5. Environment Configuration
- Type-safe environment variable validation
- Secure secrets management
- Clear separation of development and production configs

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration options:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis server host
- `API_KEY_SECRET`: Secret for HMAC hashing (min 32 chars)
- `API_KEYS`: Comma-separated list of key:hash pairs

## API Endpoints

### Health Check
```
GET /health
```

### Trading Alerts
```
POST /api/alerts
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "symbol": "AAPL",
  "action": "buy",
  "quantity": 100,
  "price": 150.5
}
```

### Execute Trade
```
POST /api/trades
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "symbol": "AAPL",
  "side": "buy",
  "quantity": 100,
  "orderType": "market"
}
```

### Get Positions
```
GET /api/positions
Authorization: Bearer <api-key>
```

### Get Position by Symbol
```
GET /api/positions/:symbol
Authorization: Bearer <api-key>
```

### Cache Management
```
GET /api/cache/stats
DELETE /api/cache
Authorization: Bearer <api-key>
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## Security Features

- HMAC-SHA256 authentication for API keys
- Timing-safe key comparison
- Input validation with Zod schemas
- SQL injection protection via parameterized queries
- Protection against concurrent execution conflicts
- Private IP blocking in production

## Architecture

- **Advisory Locks**: PostgreSQL-based distributed locking
- **Caching**: Two-tier cache (Memory + Redis) with automatic fallback
- **Authentication**: HMAC-based API key validation
- **Validation**: Zod schemas for type-safe request validation
- **Error Handling**: Comprehensive error handling with detailed logging

## License

MIT

## Documentation

For detailed information, see the documentation in the `docs/` directory:

- [API Documentation](docs/API.md) - Complete API reference with examples
- [Architecture](docs/ARCHITECTURE.md) - System design and component details
- [Security](docs/SECURITY.md) - Security features and best practices
- [Deployment](docs/DEPLOYMENT.md) - Deployment guide for various platforms