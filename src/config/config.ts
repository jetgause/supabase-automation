import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, RoutingRulesSchema } from './types';

/**
 * Load and validate configuration from environment variables and config files
 */
export function loadConfig(): AppConfig {
  // Load routing rules from JSON file
  const routingRulesPath = path.join(__dirname, 'routing-rules.json');
  const routingRulesData = fs.readFileSync(routingRulesPath, 'utf-8');
  const routingRules = RoutingRulesSchema.parse(JSON.parse(routingRulesData));

  // Load environment variables with defaults
  const config: AppConfig = {
    supabaseAutomationRepo: process.env.SUPABASE_AUTOMATION_REPO || 'https://github.com/jetgause/supabase-automation',
    vixGuardianRepo: process.env.VIXGUARDIAN_REPO || 'https://github.com/jetgause/VixGuardian',
    enableAutoRepair: process.env.ENABLE_AUTO_REPAIR !== 'false',
    enableValidationLogging: process.env.ENABLE_VALIDATION_LOGGING !== 'false',
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    routingRules,
  };

  return config;
}
