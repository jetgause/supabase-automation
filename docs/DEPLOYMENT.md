# Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Redis 6+
- Git

## Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/jetgause/supabase-automation.git
cd supabase-automation
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/supabase_automation
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=supabase_automation
POSTGRES_USER=user
POSTGRES_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Supabase (if using)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# API
PORT=3000
NODE_ENV=development

# Security
API_KEY_SECRET=your-secret-key-for-hmac-hashing-min-32-chars
API_KEYS=

# Cache
CACHE_MEMORY_TTL=300
CACHE_REDIS_TTL=3600
CACHE_MAX_MEMORY_SIZE=100

# Trading
PAPER_TRADING_ENABLED=true
ADVISORY_LOCK_TIMEOUT=30000
```

### 3. Generate API Keys

```bash
npm run dev
```

In another terminal:

```bash
node -e "
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('base64url');
const secret = 'your-secret-key-for-hmac-hashing-min-32-chars';
const hash = crypto.createHmac('sha256', secret).update(key).digest('hex');
console.log('API Key:', key);
console.log('Hash:', hash);
console.log('Add to .env: API_KEYS=key1:' + hash);
"
```

### 4. Run Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`.

### 5. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Execute trade (replace with your API key)
curl -X POST http://localhost:3000/api/trades \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "side": "buy",
    "quantity": 100,
    "orderType": "market"
  }'
```

## Docker Deployment

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/supabase_automation
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - API_KEY_SECRET=${API_KEY_SECRET}
      - API_KEYS=${API_KEYS}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=supabase_automation
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Build and Run

```bash
docker-compose up -d
```

## Production Deployment

### Heroku

1. **Create Heroku App**

```bash
heroku create supabase-automation
```

2. **Add PostgreSQL and Redis**

```bash
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
```

3. **Set Environment Variables**

```bash
heroku config:set NODE_ENV=production
heroku config:set API_KEY_SECRET=your-secret-key-min-32-chars
heroku config:set API_KEYS=key1:hash1,key2:hash2
heroku config:set PAPER_TRADING_ENABLED=true
```

4. **Deploy**

```bash
git push heroku main
```

### AWS ECS

1. **Build and Push Docker Image**

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

docker build -t supabase-automation .
docker tag supabase-automation:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/supabase-automation:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/supabase-automation:latest
```

2. **Create ECS Task Definition**

```json
{
  "family": "supabase-automation",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/supabase-automation:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT:secret:db-url"
        },
        {
          "name": "API_KEY_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT:secret:api-secret"
        }
      ]
    }
  ]
}
```

3. **Create ECS Service**

Use AWS Console or CLI to create service with load balancer.

### Digital Ocean App Platform

1. **Create App**

```bash
doctl apps create --spec .do/app.yaml
```

2. **App Specification (.do/app.yaml)**

```yaml
name: supabase-automation
services:
  - name: api
    github:
      repo: jetgause/supabase-automation
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: node dist/index.js
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    http_port: 3000
    envs:
      - key: NODE_ENV
        value: production
      - key: API_KEY_SECRET
        value: ${API_KEY_SECRET}
        type: SECRET
      - key: API_KEYS
        value: ${API_KEYS}
        type: SECRET
databases:
  - name: db
    engine: PG
    version: "15"
  - name: redis
    engine: REDIS
    version: "7"
```

## Database Setup

### PostgreSQL

No special setup required. Advisory locks are built into PostgreSQL.

Optional: Create indexes for better performance:

```sql
-- Example: If you add a trades table
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
```

### Redis

Configure persistence:

```bash
# In redis.conf
appendonly yes
appendfsync everysec
```

## Monitoring

### Application Logs

```bash
# Local
npm run dev

# Docker
docker-compose logs -f app

# Heroku
heroku logs --tail

# AWS ECS
aws logs tail /ecs/supabase-automation --follow
```

### Health Checks

```bash
curl http://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T21:52:23.845Z"
}
```

### Monitoring Tools

- **Datadog**: APM and infrastructure monitoring
- **New Relic**: Application performance
- **Sentry**: Error tracking
- **Grafana**: Metrics visualization

## Backup Strategy

### PostgreSQL Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup.sql

# Automated (cron)
0 0 * * * pg_dump $DATABASE_URL > /backups/backup-$(date +\%Y\%m\%d).sql
```

### Redis Backups

Redis RDB snapshots are automatic. Optionally:

```bash
# Manual snapshot
redis-cli BGSAVE

# Copy snapshot
cp /var/lib/redis/dump.rdb /backups/
```

## Scaling

### Horizontal Scaling

The application is stateless and can be scaled horizontally:

```bash
# Docker Compose
docker-compose up --scale app=3

# Kubernetes
kubectl scale deployment supabase-automation --replicas=3
```

### Vertical Scaling

Increase resources for services:

1. **Database**: Upgrade PostgreSQL instance size
2. **Redis**: Increase memory allocation
3. **App**: Increase CPU/memory limits

### Performance Tuning

#### Database Connection Pool

```typescript
// Increase pool size for high load
max: 50,  // Default: 20
```

#### Cache Configuration

```bash
# Increase cache sizes
CACHE_MEMORY_TTL=600
CACHE_REDIS_TTL=7200
CACHE_MAX_MEMORY_SIZE=500
```

#### Redis Max Memory

```bash
# In redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

## Troubleshooting

### Common Issues

#### Connection Refused

```bash
# Check services are running
docker-compose ps

# Check logs
docker-compose logs db redis
```

#### Lock Timeout

Increase timeout:
```bash
ADVISORY_LOCK_TIMEOUT=60000  # 60 seconds
```

#### Cache Not Working

Check Redis connection:
```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

#### Authentication Failed

Verify API key setup:
```bash
# Generate test hash
node -e "
const crypto = require('crypto');
const key = 'YOUR_API_KEY';
const secret = process.env.API_KEY_SECRET;
const hash = crypto.createHmac('sha256', secret).update(key).digest('hex');
console.log('Hash:', hash);
"
```

## Security Hardening

1. **Use SSL/TLS for all connections**
2. **Enable firewall rules**
3. **Rotate API keys regularly**
4. **Use secrets management (AWS Secrets Manager, HashiCorp Vault)**
5. **Enable audit logging**
6. **Set up intrusion detection**
7. **Regular security updates**

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Deploy to production
        run: |
          # Your deployment commands
```

## Post-Deployment

1. **Verify health endpoint**
2. **Test API endpoints**
3. **Monitor error rates**
4. **Check database connections**
5. **Verify cache functionality**
6. **Test advisory locks**
7. **Review logs for errors**

## Support

For issues and questions:
- GitHub Issues: https://github.com/jetgause/supabase-automation/issues
- Documentation: See `docs/` directory
- Security: Contact maintainers directly
