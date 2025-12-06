import { RepositoryValidator } from '../validators/repository-validator';
import { RoutingRules } from '../config/types';
import { createLogger } from '../utils/logger';

// Mock routing rules for testing
const mockRoutingRules: RoutingRules = {
  repositories: {
    'supabase-automation': {
      url: 'https://github.com/jetgause/supabase-automation',
      dataTypes: ['automation-config', 'workflow-definitions'],
      priority: 1,
    },
    'VixGuardian': {
      url: 'https://github.com/jetgause/VixGuardian',
      dataTypes: ['trading-data', 'market-analysis'],
      priority: 2,
    },
  },
  defaultRepository: 'supabase-automation',
  validationRules: {
    requireExactMatch: true,
    allowFallback: true,
    fallbackRepository: 'supabase-automation',
  },
};

describe('RepositoryValidator', () => {
  let validator: RepositoryValidator;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    logger = createLogger('error'); // Use error level to reduce noise in tests
    validator = new RepositoryValidator(mockRoutingRules, logger, true);
  });

  describe('validate', () => {
    it('should validate correct data-repository mapping', () => {
      const result = validator.validate('automation-config', 'supabase-automation');
      
      expect(result.isValid).toBe(true);
      expect(result.targetRepository).toBe('supabase-automation');
      expect(result.issues).toHaveLength(0);
      expect(result.autoRepaired).toBe(false);
    });

    it('should detect repository misalignment', () => {
      const result = validator.validate('automation-config', 'VixGuardian');
      
      expect(result.isValid).toBe(false);
      expect(result.targetRepository).toBe('supabase-automation');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.autoRepaired).toBe(true);
    });

    it('should handle unknown data types with fallback', () => {
      const result = validator.validate('unknown-data-type');
      
      expect(result.isValid).toBe(false);
      expect(result.targetRepository).toBe('supabase-automation');
      expect(result.autoRepaired).toBe(true);
      expect(result.repairActions.length).toBeGreaterThan(0);
    });

    it('should validate VixGuardian data types correctly', () => {
      const result = validator.validate('trading-data', 'VixGuardian');
      
      expect(result.isValid).toBe(true);
      expect(result.targetRepository).toBe('VixGuardian');
      expect(result.issues).toHaveLength(0);
    });

    it('should not auto-repair when disabled', () => {
      const validatorNoRepair = new RepositoryValidator(mockRoutingRules, logger, false);
      const result = validatorNoRepair.validate('automation-config', 'VixGuardian');
      
      expect(result.isValid).toBe(false);
      expect(result.autoRepaired).toBe(false);
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple items', () => {
      const items = [
        { dataType: 'automation-config', currentRepository: 'supabase-automation' },
        { dataType: 'trading-data', currentRepository: 'VixGuardian' },
        { dataType: 'workflow-definitions' },
      ];

      const results = validator.validateBatch(items);
      
      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.isValid)).toHaveLength(3);
    });

    it('should detect multiple misalignments', () => {
      const items = [
        { dataType: 'automation-config', currentRepository: 'VixGuardian' },
        { dataType: 'trading-data', currentRepository: 'supabase-automation' },
      ];

      const results = validator.validateBatch(items);
      
      expect(results).toHaveLength(2);
      expect(results.filter((r) => !r.isValid)).toHaveLength(2);
      expect(results.filter((r) => r.autoRepaired)).toHaveLength(2);
    });
  });

  describe('getSupportedDataTypes', () => {
    it('should return all supported data types', () => {
      const dataTypes = validator.getSupportedDataTypes();
      
      expect(dataTypes).toContain('automation-config');
      expect(dataTypes).toContain('workflow-definitions');
      expect(dataTypes).toContain('trading-data');
      expect(dataTypes).toContain('market-analysis');
      expect(dataTypes.length).toBe(4);
    });
  });

  describe('getRepositoryConfig', () => {
    it('should return repository configuration', () => {
      const config = validator.getRepositoryConfig('supabase-automation');
      
      expect(config).toBeDefined();
      expect(config?.url).toBe('https://github.com/jetgause/supabase-automation');
      expect(config?.dataTypes).toContain('automation-config');
    });

    it('should return undefined for unknown repository', () => {
      const config = validator.getRepositoryConfig('unknown-repo');
      
      expect(config).toBeUndefined();
    });
  });
});
