import { Logger } from 'winston';
import { RoutingRules, RepositoryConfig } from '../config/types';

/**
 * Validation result containing routing information and any detected issues
 */
export interface ValidationResult {
  isValid: boolean;
  targetRepository: string;
  dataType: string;
  issues: string[];
  autoRepaired: boolean;
  repairActions: string[];
}

/**
 * Repository validator class that handles data-repository mapping validation
 */
export class RepositoryValidator {
  private routingRules: RoutingRules;
  private logger: Logger;
  private enableAutoRepair: boolean;

  constructor(routingRules: RoutingRules, logger: Logger, enableAutoRepair = true) {
    this.routingRules = routingRules;
    this.logger = logger;
    this.enableAutoRepair = enableAutoRepair;
  }

  /**
   * Validate that data is routed to the correct repository
   */
  validate(dataType: string, currentRepository?: string): ValidationResult {
    this.logger.info('Validating data-repository mapping', { dataType, currentRepository });

    const result: ValidationResult = {
      isValid: true,
      targetRepository: '',
      dataType,
      issues: [],
      autoRepaired: false,
      repairActions: [],
    };

    // Find the correct target repository for this data type
    const targetRepo = this.findTargetRepository(dataType);
    
    if (!targetRepo) {
      result.isValid = false;
      result.issues.push(`No repository mapping found for data type: ${dataType}`);
      
      // Apply fallback if enabled
      if (this.routingRules.validationRules.allowFallback) {
        result.targetRepository = this.routingRules.validationRules.fallbackRepository;
        result.repairActions.push(`Applied fallback repository: ${result.targetRepository}`);
        if (this.enableAutoRepair) {
          result.autoRepaired = true;
          this.logger.warn('Auto-repair applied: using fallback repository', {
            dataType,
            fallbackRepository: result.targetRepository,
          });
        }
      } else {
        this.logger.error('Validation failed: no repository mapping and fallback disabled', { dataType });
      }
    } else {
      result.targetRepository = targetRepo;
    }

    // Check if current repository matches target (if provided)
    if (currentRepository && result.targetRepository) {
      const currentRepoName = this.getRepositoryName(currentRepository);
      const targetRepoName = result.targetRepository;
      
      if (currentRepoName !== targetRepoName) {
        result.isValid = false;
        result.issues.push(
          `Repository misalignment detected. Data type '${dataType}' should be in '${targetRepoName}' but is in '${currentRepoName}'`
        );
        
        if (this.enableAutoRepair) {
          result.autoRepaired = true;
          result.repairActions.push(`Route data from '${currentRepoName}' to '${targetRepoName}'`);
          this.logger.warn('Auto-repair: repository misalignment detected and corrected', {
            dataType,
            from: currentRepoName,
            to: targetRepoName,
          });
        }
      }
    }

    // Log the validation result
    if (result.isValid) {
      this.logger.info('Validation successful', {
        dataType,
        targetRepository: result.targetRepository,
      });
    } else {
      this.logger.error('Validation failed', {
        dataType,
        issues: result.issues,
        autoRepaired: result.autoRepaired,
        repairActions: result.repairActions,
      });
    }

    return result;
  }

  /**
   * Batch validate multiple data items
   */
  validateBatch(items: Array<{ dataType: string; currentRepository?: string }>): ValidationResult[] {
    this.logger.info('Starting batch validation', { itemCount: items.length });
    
    const results = items.map((item) => this.validate(item.dataType, item.currentRepository));
    
    const failedCount = results.filter((r) => !r.isValid).length;
    const repairedCount = results.filter((r) => r.autoRepaired).length;
    
    this.logger.info('Batch validation complete', {
      total: results.length,
      failed: failedCount,
      repaired: repairedCount,
    });
    
    return results;
  }

  /**
   * Find the target repository for a given data type
   */
  private findTargetRepository(dataType: string): string | null {
    for (const [repoName, repoConfig] of Object.entries(this.routingRules.repositories)) {
      if (repoConfig.dataTypes.includes(dataType)) {
        return repoName;
      }
    }
    return null;
  }

  /**
   * Extract repository name from URL or full path
   */
  private getRepositoryName(repository: string): string {
    // If it's a URL, extract the repository name using URL constructor
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\//;
    if (githubUrlPattern.test(repository)) {
      try {
        const url = new URL(repository);
        const pathParts = url.pathname.split('/').filter((part) => part.length > 0);
        if (pathParts.length >= 2) {
          // GitHub URLs are typically: /owner/repo or /owner/repo.git
          return pathParts[pathParts.length - 1].replace(/\.git$/, '');
        }
      } catch (error) {
        // If URL parsing fails, fall back to original method
        this.logger.warn('Failed to parse repository URL', { repository, error });
      }
    }
    // Otherwise, assume it's already a repository name
    return repository;
  }

  /**
   * Get all supported data types across all repositories
   */
  getSupportedDataTypes(): string[] {
    const dataTypes = new Set<string>();
    
    for (const repoConfig of Object.values(this.routingRules.repositories)) {
      repoConfig.dataTypes.forEach((dt) => dataTypes.add(dt));
    }
    
    return Array.from(dataTypes).sort();
  }

  /**
   * Get repository configuration for a specific repository
   */
  getRepositoryConfig(repositoryName: string): RepositoryConfig | undefined {
    return this.routingRules.repositories[repositoryName];
  }
}
