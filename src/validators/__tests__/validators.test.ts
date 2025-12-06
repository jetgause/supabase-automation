import {
  webhookUrlSchema,
  toolNameSchema,
  symbolSchema,
  alertPayloadSchema,
  apiKeySchema,
  tradingParamsSchema,
} from '../index';

describe('Validators', () => {
  describe('webhookUrlSchema', () => {
    it('should accept valid HTTP URL', () => {
      const result = webhookUrlSchema.safeParse('http://example.com/webhook');
      expect(result.success).toBe(true);
    });

    it('should accept valid HTTPS URL', () => {
      const result = webhookUrlSchema.safeParse('https://example.com/webhook');
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const result = webhookUrlSchema.safeParse('not-a-url');
      expect(result.success).toBe(false);
    });

    it('should reject URL without protocol', () => {
      const result = webhookUrlSchema.safeParse('example.com');
      expect(result.success).toBe(false);
    });

    it('should reject FTP protocol', () => {
      const result = webhookUrlSchema.safeParse('ftp://example.com/webhook');
      expect(result.success).toBe(false);
    });

    it('should reject URL that is too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2100);
      const result = webhookUrlSchema.safeParse(longUrl);
      expect(result.success).toBe(false);
    });
  });

  describe('toolNameSchema', () => {
    it('should accept valid tool names', () => {
      expect(toolNameSchema.safeParse('my-tool').success).toBe(true);
      expect(toolNameSchema.safeParse('tool_123').success).toBe(true);
      expect(toolNameSchema.safeParse('TOOL-NAME').success).toBe(true);
    });

    it('should reject tool names with spaces', () => {
      const result = toolNameSchema.safeParse('my tool');
      expect(result.success).toBe(false);
    });

    it('should reject tool names with special characters', () => {
      expect(toolNameSchema.safeParse('tool@123').success).toBe(false);
      expect(toolNameSchema.safeParse('tool#name').success).toBe(false);
    });

    it('should reject empty tool name', () => {
      const result = toolNameSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject tool name that is too long', () => {
      const longName = 'a'.repeat(101);
      const result = toolNameSchema.safeParse(longName);
      expect(result.success).toBe(false);
    });
  });

  describe('symbolSchema', () => {
    it('should accept valid symbols', () => {
      expect(symbolSchema.safeParse('AAPL').success).toBe(true);
      expect(symbolSchema.safeParse('SPY').success).toBe(true);
      expect(symbolSchema.safeParse('BRK.B').success).toBe(true);
    });

    it('should convert to uppercase', () => {
      const result = symbolSchema.safeParse('aapl');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('AAPL');
      }
    });

    it('should reject symbols with spaces', () => {
      const result = symbolSchema.safeParse('AA PL');
      expect(result.success).toBe(false);
    });

    it('should reject symbols with special characters', () => {
      expect(symbolSchema.safeParse('AAPL@').success).toBe(false);
      expect(symbolSchema.safeParse('AA#PL').success).toBe(false);
    });

    it('should reject empty symbol', () => {
      const result = symbolSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('alertPayloadSchema', () => {
    it('should accept valid alert payload', () => {
      const payload = {
        symbol: 'AAPL',
        action: 'buy',
        quantity: 100,
        price: 150.5,
      };
      const result = alertPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept alert without optional fields', () => {
      const payload = {
        symbol: 'AAPL',
        action: 'sell',
        quantity: 50,
      };
      const result = alertPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid action', () => {
      const payload = {
        symbol: 'AAPL',
        action: 'invalid',
        quantity: 100,
      };
      const result = alertPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const payload = {
        symbol: 'AAPL',
        action: 'buy',
        quantity: -100,
      };
      const result = alertPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer quantity', () => {
      const payload = {
        symbol: 'AAPL',
        action: 'buy',
        quantity: 100.5,
      };
      const result = alertPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('apiKeySchema', () => {
    it('should accept valid API keys', () => {
      const key = 'a'.repeat(32);
      const result = apiKeySchema.safeParse(key);
      expect(result.success).toBe(true);
    });

    it('should reject API key that is too short', () => {
      const key = 'a'.repeat(31);
      const result = apiKeySchema.safeParse(key);
      expect(result.success).toBe(false);
    });

    it('should reject API key with invalid characters', () => {
      const key = 'a'.repeat(30) + '@#';
      const result = apiKeySchema.safeParse(key);
      expect(result.success).toBe(false);
    });
  });

  describe('tradingParamsSchema', () => {
    it('should accept valid trading parameters', () => {
      const params = {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        orderType: 'market',
      };
      const result = tradingParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should use default timeInForce', () => {
      const params = {
        symbol: 'AAPL',
        side: 'sell',
        quantity: 50,
        orderType: 'limit',
        price: 150,
      };
      const result = tradingParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeInForce).toBe('day');
      }
    });

    it('should reject invalid side', () => {
      const params = {
        symbol: 'AAPL',
        side: 'invalid',
        quantity: 100,
        orderType: 'market',
      };
      const result = tradingParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject invalid order type', () => {
      const params = {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        orderType: 'invalid',
      };
      const result = tradingParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });
});
