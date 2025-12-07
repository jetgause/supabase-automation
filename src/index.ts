import { loadConfig } from './config/config';
import { createLogger } from './utils/logger';
import { RepositoryValidator } from './validators/repository-validator';
import { ZeroErrorLoop } from './validators/zero-error-loop';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize the repository validation system
 */
export function initializeValidationSystem() {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Load configuration
  const config = loadConfig();
  
  // Create logger
  const logger = createLogger(config.logLevel);
  
  logger.info('Initializing repository validation system', {
    supabaseAutomationRepo: config.supabaseAutomationRepo,
    vixGuardianRepo: config.vixGuardianRepo,
    enableAutoRepair: config.enableAutoRepair,
  });

  // Create validator
  const validator = new RepositoryValidator(
    config.routingRules,
    logger,
    config.enableAutoRepair
  );

  // Create zero-error loop
  const zeroErrorLoop = new ZeroErrorLoop(validator, logger);

  return {
    config,
    logger,
    validator,
    zeroErrorLoop,
  };
}

/**
 * Main entry point for the validation system
 */
export async function main() {
  const { logger, zeroErrorLoop } = initializeValidationSystem();

  logger.info('Starting repository validation system');

  // Start the zero-error loop
  zeroErrorLoop.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    zeroErrorLoop.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    zeroErrorLoop.stop();
    process.exit(0);
  });

  logger.info('Repository validation system is running. Press Ctrl+C to stop.');
}

// Run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
