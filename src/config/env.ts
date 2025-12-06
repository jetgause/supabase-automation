import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  POSTGRES_DATABASE: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),

  // Redis
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().min(0).default(0),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // API
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // API Key Authentication
  API_KEY_SECRET: z.string().min(32),
  API_KEYS: z.string().optional().default(''),

  // Cache
  CACHE_MEMORY_TTL: z.coerce.number().int().positive().default(300),
  CACHE_REDIS_TTL: z.coerce.number().int().positive().default(3600),
  CACHE_MAX_MEMORY_SIZE: z.coerce.number().int().positive().default(100),

  // Paper Trading
  PAPER_TRADING_ENABLED: z.coerce.boolean().default(true),
  ADVISORY_LOCK_TIMEOUT: z.coerce.number().int().positive().default(30000),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
};

export const config = parseEnv();

export type Config = z.infer<typeof envSchema>;
