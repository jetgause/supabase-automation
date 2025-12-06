import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, RoutingRulesSchema } from './types';

/**
 * Load and validate configuration from environment variables and config files
 */
export function loadConfig(): AppConfig {
  // Load routing rules from JSON file
  const routingRulesPath = path.join(__dirname, 'routing-rules.json');
  
  let routingRulesData: string;
  try {
    routingRulesData = fs.readFileSync(routingRulesPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to load routing rules from ${routingRulesPath}. ` +
      `Please ensure the file exists and is readable. Error: ${error}`
    );
  }

  let routingRules;
  try {
    routingRules = RoutingRulesSchema.parse(JSON.parse(routingRulesData));
  } catch (error) {
    throw new Error(
      `Failed to parse routing rules from ${routingRulesPath}. ` +
      `Please check the JSON syntax and schema. Error: ${error}`
    );
  }

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
