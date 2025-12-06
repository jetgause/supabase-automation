# API Documentation

## Authentication

All API requests require authentication using an API key in the Authorization header:

```
Authorization: Bearer <your-api-key>
```

### Generating API Keys

Use the `ApiKeyAuthService` to generate new API keys:

```typescript
import { apiKeyAuthService } from './services';

const { key, hash } = apiKeyAuthService.generateApiKey();
console.log('API Key:', key);
console.log('Hash (store in env):', hash);
```

Add the hash to your `.env` file:
```
API_KEYS=key1:hash1,key2:hash2
```

## Endpoints

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T21:52:23.845Z"
}
```

### Root Info

```
GET /
```

**Response:**
```json
{
  "name": "Supabase Automation API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "alerts": "POST /api/alerts",
    "trades": "POST /api/trades",
    "positions": "GET /api/positions",
    "positionBySymbol": "GET /api/positions/:symbol",
    "cacheStats": "GET /api/cache/stats",
    "clearCache": "DELETE /api/cache"
  }
}
```

### Trading Alerts

Process a trading alert and execute a paper trade.

```
POST /api/alerts
Authorization: Bearer <api-key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "symbol": "AAPL",
  "action": "buy",
  "quantity": 100,
  "price": 150.5,
  "strategy": "momentum",
  "timestamp": "2025-12-06T21:52:23.845Z",
  "metadata": {
    "source": "tradingview",
    "signal_strength": 0.85
  }
}
```

**Fields:**
- `symbol` (required): Trading symbol (e.g., "AAPL", "SPY")
- `action` (required): "buy", "sell", or "close"
- `quantity` (required): Number of shares (integer)
- `price` (optional): Execution price
- `strategy` (optional): Strategy name
- `timestamp` (optional): ISO 8601 timestamp
- `metadata` (optional): Additional key-value data

**Response:**
```json
{
  "success": true,
  "message": "Trade executed",
  "trade": {
    "id": "trade_1733518343845_abc123",
    "symbol": "AAPL",
    "side": "buy",
    "quantity": 100,
    "price": 150.5,
    "timestamp": "2025-12-06T21:52:23.845Z",
    "status": "filled"
  }
}
```

### Execute Trade

Execute a paper trade directly.

```
POST /api/trades
Authorization: Bearer <api-key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "symbol": "AAPL",
  "side": "buy",
  "quantity": 100,
  "orderType": "market",
  "timeInForce": "day"
}
```

**Fields:**
- `symbol` (required): Trading symbol
- `side` (required): "buy" or "sell"
- `quantity` (required): Number of shares (integer)
- `orderType` (required): "market", "limit", "stop", or "stop_limit"
- `price` (optional): Limit price for limit orders
- `stopPrice` (optional): Stop price for stop orders
- `timeInForce` (optional): "day", "gtc", "ioc", or "fok" (default: "day")

**Response:**
```json
{
  "success": true,
  "trade": {
    "id": "trade_1733518343845_xyz789",
    "symbol": "AAPL",
    "side": "buy",
    "quantity": 100,
    "price": 150.5,
    "timestamp": "2025-12-06T21:52:23.845Z",
    "status": "filled"
  }
}
```

### Get All Positions

```
GET /api/positions
Authorization: Bearer <api-key>
```

**Response:**
```json
{
  "success": true,
  "positions": [
    {
      "symbol": "AAPL",
      "quantity": 100,
      "averagePrice": 150.5,
      "unrealizedPnL": 250.0,
      "realizedPnL": 0
    }
  ]
}
```

### Get Position by Symbol

```
GET /api/positions/:symbol
Authorization: Bearer <api-key>
```

**Response:**
```json
{
  "success": true,
  "position": {
    "symbol": "AAPL",
    "quantity": 100,
    "averagePrice": 150.5,
    "unrealizedPnL": 250.0,
    "realizedPnL": 0
  }
}
```

### Cache Statistics

```
GET /api/cache/stats
Authorization: Bearer <api-key>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "memorySize": 42,
    "redisConnected": true
  }
}
```

### Clear Cache

```
DELETE /api/cache
Authorization: Bearer <api-key>
```

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": [
    {
      "path": "field.name",
      "message": "Validation error message"
    }
  ]
}
```

### Common Error Codes

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

Currently, there are no rate limits. Consider implementing rate limiting for production use.

## Webhooks

Webhook registration is supported via the validation schemas but not yet implemented in the routes. This feature can be added based on requirements.
