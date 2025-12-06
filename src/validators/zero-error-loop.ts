import { Logger } from 'winston';
import { RepositoryValidator, ValidationResult } from './repository-validator';

/**
 * Error detection and self-repair mechanisms for the zero-error loop
 */
export interface ErrorDetectionResult {
  errorsDetected: number;
  errorsRepaired: number;
  unrepairedErrors: Array<{
    dataType: string;
    issue: string;
    attemptedRepair: boolean;
  }>;
  timestamp: Date;
}

/**
 * Zero-error loop integration that continuously validates and repairs repository mappings
 */
export class ZeroErrorLoop {
  private validator: RepositoryValidator;
  private logger: Logger;
  private isRunning = false;
  private intervalMs: number;
  private intervalId?: NodeJS.Timeout;

  constructor(validator: RepositoryValidator, logger: Logger, intervalMs = 60000) {
    this.validator = validator;
    this.logger = logger;
    this.intervalMs = intervalMs;
  }

  /**
   * Start the zero-error validation loop
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Zero-error loop is already running');
      return;
    }

    this.logger.info('Starting zero-error validation loop', {
      intervalMs: this.intervalMs,
    });

    this.isRunning = true;

    // Run immediately on start
    this.runValidationCycle().catch((error) => {
      this.logger.error('Error in validation cycle', { error });
    });

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runValidationCycle().catch((error) => {
        this.logger.error('Error in validation cycle', { error });
      });
    }, this.intervalMs);
  }

  /**
   * Stop the zero-error validation loop
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Zero-error loop is not running');
      return;
    }

    this.logger.info('Stopping zero-error validation loop');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isRunning = false;
  }

  /**
   * Run a single validation cycle
   */
  private async runValidationCycle(): Promise<ErrorDetectionResult> {
    this.logger.info('Running validation cycle');

    const result: ErrorDetectionResult = {
      errorsDetected: 0,
      errorsRepaired: 0,
      unrepairedErrors: [],
      timestamp: new Date(),
    };

    try {
      // Get all supported data types
      const supportedDataTypes = this.validator.getSupportedDataTypes();

      // Validate each data type
      const validationResults: ValidationResult[] = [];
      
      for (const dataType of supportedDataTypes) {
        const validationResult = this.validator.validate(dataType);
        validationResults.push(validationResult);

        // Count errors
        if (!validationResult.isValid) {
          result.errorsDetected++;

          if (validationResult.autoRepaired) {
            result.errorsRepaired++;
            this.logger.info('Error auto-repaired', {
              dataType,
              repairActions: validationResult.repairActions,
            });
          } else {
            result.unrepairedErrors.push({
              dataType,
              issue: validationResult.issues.join('; '),
              attemptedRepair: validationResult.repairActions.length > 0,
            });
            this.logger.error('Error not repaired', {
              dataType,
              issues: validationResult.issues,
            });
          }
        }
      }

      // Log cycle summary
      this.logger.info('Validation cycle complete', {
        errorsDetected: result.errorsDetected,
        errorsRepaired: result.errorsRepaired,
        unrepairedErrors: result.unrepairedErrors.length,
        timestamp: result.timestamp,
      });

      // Alert if there are unrepaired errors
      if (result.unrepairedErrors.length > 0) {
        this.logger.error('ALERT: Unrepaired errors detected in zero-error loop', {
          unrepairedCount: result.unrepairedErrors.length,
          errors: result.unrepairedErrors,
        });
      }
    } catch (error) {
      this.logger.error('Critical error in validation cycle', { error });
      throw error;
    }

    return result;
  }

  /**
   * Run a single validation cycle manually (for testing)
   */
  async runOnce(): Promise<ErrorDetectionResult> {
    return this.runValidationCycle();
  }

  /**
   * Check if the loop is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current interval in milliseconds
   */
  getInterval(): number {
    return this.intervalMs;
  }

  /**
   * Update the validation interval (requires restart)
   */
  setInterval(intervalMs: number): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }

    this.intervalMs = intervalMs;
    this.logger.info('Validation interval updated', { intervalMs });

    if (wasRunning) {
      this.start();
    }
  }
}
