import { z } from 'zod';

// URL validation with strict sanitization
export const webhookUrlSchema = z
  .string()
  .url({ message: 'Invalid webhook URL format' })
  .regex(/^https?:\/\//, { message: 'Webhook URL must use http or https protocol' })
  .max(2048, { message: 'Webhook URL is too long' })
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Prevent localhost and private IPs in production
        const hostname = parsed.hostname.toLowerCase();
        const privatePatterns = [
          /^localhost$/i,
          /^127\./,
          /^10\./,
          /^172\.(1[6-9]|2\d|3[01])\./,
          /^192\.168\./,
          /^::1$/,
          /^fe80:/i,
        ];
        
        // Allow localhost only in development
        if (process.env.NODE_ENV === 'production') {
          return !privatePatterns.some((pattern) => pattern.test(hostname));
        }
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Webhook URL points to a private or invalid address' }
  );

// Tool name validation
export const toolNameSchema = z
  .string()
  .min(1, { message: 'Tool name is required' })
  .max(100, { message: 'Tool name is too long' })
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Tool name can only contain alphanumeric characters, underscores, and hyphens',
  });

// Trading symbol validation
export const symbolSchema = z
  .string()
  .min(1, { message: 'Symbol is required' })
  .max(20, { message: 'Symbol is too long' })
  .transform((val) => val.toUpperCase())
  .pipe(
    z.string().regex(/^[A-Z0-9./-]+$/, {
      message: 'Symbol can only contain uppercase letters, numbers, dots, slashes, and hyphens',
    })
  );

// Alert payload validation
export const alertPayloadSchema = z.object({
  symbol: symbolSchema,
  action: z.enum(['buy', 'sell', 'close'], {
    errorMap: () => ({ message: 'Action must be buy, sell, or close' }),
  }),
  quantity: z
    .number()
    .positive({ message: 'Quantity must be positive' })
    .int({ message: 'Quantity must be an integer' })
    .max(1000000, { message: 'Quantity is too large' }),
  price: z
    .number()
    .positive({ message: 'Price must be positive' })
    .max(1000000, { message: 'Price is too large' })
    .optional(),
  strategy: toolNameSchema.optional(),
  timestamp: z
    .string()
    .datetime({ message: 'Timestamp must be in ISO 8601 format' })
    .optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

// Webhook registration schema
export const webhookRegistrationSchema = z.object({
  url: webhookUrlSchema,
  events: z
    .array(z.enum(['trade', 'alert', 'position_change', 'error']))
    .min(1, { message: 'At least one event type is required' }),
  enabled: z.boolean().default(true),
});

// API Key schema
export const apiKeySchema = z
  .string()
  .min(32, { message: 'API key must be at least 32 characters' })
  .max(512, { message: 'API key is too long' })
  .regex(/^[A-Za-z0-9_-]+$/, {
    message: 'API key can only contain alphanumeric characters, underscores, and hyphens',
  });

// Trading parameters schema
export const tradingParamsSchema = z.object({
  symbol: symbolSchema,
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive().int().max(1000000),
  orderType: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  timeInForce: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
});

export type AlertPayload = z.infer<typeof alertPayloadSchema>;
export type WebhookRegistration = z.infer<typeof webhookRegistrationSchema>;
export type TradingParams = z.infer<typeof tradingParamsSchema>;
