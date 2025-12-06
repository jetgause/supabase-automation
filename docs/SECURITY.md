# Security Documentation

## Authentication & Authorization

### API Key Authentication

The system uses HMAC-SHA256 based API key authentication for optimal security and performance.

#### Key Generation

```typescript
import { apiKeyAuthService } from './services';

const { key, hash } = apiKeyAuthService.generateApiKey();
// key: Store securely and share with client
// hash: Add to API_KEYS environment variable
```

#### Security Features

1. **HMAC-SHA256 Hashing**
   - Fast and cryptographically secure
   - ~1000x faster than bcrypt for API key validation
   - One-way hashing prevents key recovery

2. **Constant-Time Comparison**
   - Uses `crypto.timingSafeEqual` to prevent timing attacks
   - Equal comparison time regardless of input
   - Protects against side-channel attacks

3. **No Database Lookups**
   - Pre-loaded keys stored in memory
   - Reduces attack surface
   - Eliminates database timing leaks

#### Best Practices

- Use minimum 32-character API key secret
- Rotate API keys regularly
- Use different keys for different environments
- Never commit API keys to source control
- Use environment variables for key storage

### Request Validation

All requests are validated using Zod schemas before processing.

#### Validation Layers

1. **Schema Validation**: Type checking and constraints
2. **Business Logic Validation**: Application-specific rules
3. **Database Constraints**: Final data integrity checks

#### Protected Fields

##### Webhook URLs
- Protocol restriction: HTTP/HTTPS only
- Length limit: 2048 characters
- Private IP blocking in production
- Valid URL format required

##### Trading Symbols
- Uppercase letters and numbers only
- Length limit: 20 characters
- Automatic uppercase conversion
- Special chars: dots, slashes, hyphens only

##### API Keys
- Minimum length: 32 characters
- Alphanumeric with underscores and hyphens
- No special characters allowed

## SQL Injection Prevention

### Parameterized Queries

All database queries use parameterized statements:

```typescript
// ✅ SAFE: Parameterized query
await client.query('SELECT pg_advisory_lock($1)', [lockId]);

// ❌ UNSAFE: String interpolation
await client.query(`SELECT pg_advisory_lock(${lockId})`);
```

### Query Examples

```typescript
// Setting timeout safely
await client.query('SET statement_timeout = $1', [timeout]);

// Advisory lock with parameter
await client.query('SELECT pg_try_advisory_lock($1) as acquired', [lockId]);

// Release lock with parameter
await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
```

## Cross-Site Scripting (XSS) Prevention

### Output Handling

- All responses are JSON-formatted
- No HTML rendering
- Automatic content-type headers
- No user-supplied content in responses

### Input Sanitization

Zod validators automatically sanitize inputs:
- Remove dangerous characters
- Enforce strict patterns
- Transform to safe formats

## DoS Protection

### Rate Limiting

While not currently implemented, consider adding:
- Per-IP rate limiting
- Per-API-key rate limiting
- Burst protection

### Resource Limits

#### Connection Pooling
```typescript
max: 20,                    // Maximum connections
idleTimeoutMillis: 30000,   // Idle timeout
connectionTimeoutMillis: 30000  // Connection timeout
```

#### Cache Limits
```typescript
CACHE_MAX_MEMORY_SIZE: 100  // Maximum memory cache entries
```

#### Advisory Lock Timeout
```typescript
ADVISORY_LOCK_TIMEOUT: 30000  // 30 seconds
```

## Data Protection

### Sensitive Data

#### Never Log
- API keys (plain text)
- Database passwords
- Redis passwords
- Any authentication tokens

#### Safe to Log
- Request methods and paths
- Response status codes
- Performance metrics
- Error types (not details in production)

### Environment Variables

Store all secrets in environment variables:

```bash
# .env (never commit this file)
API_KEY_SECRET=...
DATABASE_URL=...
REDIS_PASSWORD=...
```

Use `.env.example` for documentation:

```bash
# .env.example (safe to commit)
API_KEY_SECRET=your-secret-key-min-32-chars
DATABASE_URL=postgresql://user:password@localhost:5432/db
```

## Network Security

### Private IP Blocking

In production, webhook URLs cannot point to:
- `localhost` / `127.0.0.1`
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`
- `::1` (IPv6 localhost)
- `fe80::/10` (IPv6 link-local)

This prevents SSRF attacks.

### TLS/SSL

#### Database Connection
```typescript
// Add to connection string for SSL
?ssl=true&sslmode=require
```

#### Redis Connection
```typescript
const client = new Redis({
  tls: {
    rejectUnauthorized: true
  }
});
```

## Security Headers

Consider adding security headers in production:

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

## Audit & Monitoring

### Security Events to Log

1. Authentication failures
2. Authorization failures
3. Invalid input attempts
4. Unusual trading patterns
5. Connection failures
6. Lock timeouts

### Monitoring Recommendations

- Set up alerts for repeated auth failures
- Monitor for unusual API usage patterns
- Track error rates and types
- Monitor database and Redis connections
- Alert on service degradation

## Incident Response

### Security Incident Checklist

1. **Detect**: Monitor logs and alerts
2. **Contain**: Revoke compromised API keys
3. **Investigate**: Analyze logs and access patterns
4. **Remediate**: Fix vulnerabilities
5. **Document**: Record incident details
6. **Review**: Update security measures

### Key Rotation Procedure

1. Generate new API keys
2. Add new keys to environment
3. Deploy with both old and new keys active
4. Update client applications
5. Remove old keys after migration
6. Verify all clients updated

## Security Checklist

### Pre-Production

- [ ] All secrets in environment variables
- [ ] API key secret is 32+ characters
- [ ] SSL/TLS enabled for database
- [ ] SSL/TLS enabled for Redis
- [ ] Private IP blocking enabled
- [ ] Error messages don't leak sensitive data
- [ ] All queries are parameterized
- [ ] Input validation on all endpoints
- [ ] Authentication on all protected routes
- [ ] Logging excludes sensitive data

### Runtime

- [ ] Monitor authentication failures
- [ ] Track API usage patterns
- [ ] Monitor for SQL injection attempts
- [ ] Check for unusual trading patterns
- [ ] Review error logs regularly
- [ ] Test incident response procedures

## Vulnerability Disclosure

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email security details to the maintainers
3. Include steps to reproduce
4. Allow reasonable time for fix
5. Coordinate disclosure timing

## Security Updates

- Review dependencies regularly
- Update to patch security issues
- Monitor security advisories
- Test updates in staging first
- Document security changes

## Compliance Considerations

Depending on your use case, consider:

- GDPR compliance for user data
- SOC 2 requirements for service providers
- PCI DSS if handling payment information
- Industry-specific regulations

## Security Tools

### Recommended Tools

1. **CodeQL**: Static analysis (integrated)
2. **npm audit**: Dependency vulnerability scanning
3. **Snyk**: Continuous security monitoring
4. **OWASP ZAP**: API security testing
5. **Burp Suite**: Penetration testing

### Regular Security Tasks

- Weekly: Review logs and monitor metrics
- Monthly: Update dependencies
- Quarterly: Security audit and penetration testing
- Annually: Full security review and certification
