import { z } from 'zod';

// Schema for repository configuration
export const RepositoryConfigSchema = z.object({
  url: z.string().url(),
  dataTypes: z.array(z.string()),
  priority: z.number().int().positive(),
});

// Schema for routing rules
export const RoutingRulesSchema = z.object({
  repositories: z.record(RepositoryConfigSchema),
  defaultRepository: z.string(),
  validationRules: z.object({
    requireExactMatch: z.boolean(),
    allowFallback: z.boolean(),
    fallbackRepository: z.string(),
  }),
});

// Infer types from schemas
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type RoutingRules = z.infer<typeof RoutingRulesSchema>;

// Configuration type for the application
export interface AppConfig {
  supabaseAutomationRepo: string;
  vixGuardianRepo: string;
  enableAutoRepair: boolean;
  enableValidationLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  routingRules: RoutingRules;
}
