import { ZeroErrorLoop } from '../validators/zero-error-loop';
import { RepositoryValidator } from '../validators/repository-validator';
import { RoutingRules } from '../config/types';
import { createLogger } from '../utils/logger';

// Mock routing rules for testing
const mockRoutingRules: RoutingRules = {
  repositories: {
    'supabase-automation': {
      url: 'https://github.com/jetgause/supabase-automation',
      dataTypes: ['automation-config'],
      priority: 1,
    },
  },
  defaultRepository: 'supabase-automation',
  validationRules: {
    requireExactMatch: true,
    allowFallback: true,
    fallbackRepository: 'supabase-automation',
  },
};

describe('ZeroErrorLoop', () => {
  let validator: RepositoryValidator;
  let logger: ReturnType<typeof createLogger>;
  let loop: ZeroErrorLoop;

  beforeEach(() => {
    logger = createLogger('error');
    validator = new RepositoryValidator(mockRoutingRules, logger, true);
    loop = new ZeroErrorLoop(validator, logger, 1000);
  });

  afterEach(() => {
    if (loop.isActive()) {
      loop.stop();
    }
  });

  describe('start and stop', () => {
    it('should start the validation loop', () => {
      loop.start();
      expect(loop.isActive()).toBe(true);
    });

    it('should stop the validation loop', () => {
      loop.start();
      loop.stop();
      expect(loop.isActive()).toBe(false);
    });

    it('should not start if already running', () => {
      loop.start();
      const initialStatus = loop.isActive();
      loop.start(); // Try to start again
      expect(loop.isActive()).toBe(initialStatus);
    });

    it('should not stop if not running', () => {
      expect(loop.isActive()).toBe(false);
      loop.stop();
      expect(loop.isActive()).toBe(false);
    });
  });

  describe('runOnce', () => {
    it('should run a single validation cycle', async () => {
      const result = await loop.runOnce();
      
      expect(result).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.errorsDetected).toBe('number');
      expect(typeof result.errorsRepaired).toBe('number');
      expect(Array.isArray(result.unrepairedErrors)).toBe(true);
    });

    it('should detect no errors for valid configuration', async () => {
      const result = await loop.runOnce();
      
      expect(result.errorsDetected).toBe(0);
      expect(result.errorsRepaired).toBe(0);
      expect(result.unrepairedErrors).toHaveLength(0);
    });
  });

  describe('interval management', () => {
    it('should get the current interval', () => {
      expect(loop.getInterval()).toBe(1000);
    });

    it('should update the interval', () => {
      loop.setInterval(2000);
      expect(loop.getInterval()).toBe(2000);
    });

    it('should restart the loop when interval is updated while running', () => {
      loop.start();
      loop.setInterval(2000);
      expect(loop.isActive()).toBe(true);
      expect(loop.getInterval()).toBe(2000);
    });
  });
});
