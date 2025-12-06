#!/usr/bin/env node

/**
 * Demo script showing the repository validation system in action
 */

import { initializeValidationSystem } from './index';

async function demo() {
  console.log('========================================');
  console.log('Repository Validation System Demo');
  console.log('========================================\n');

  const { logger, validator } = initializeValidationSystem();

  console.log('1. Testing correct mappings...\n');
  
  const correctMappings = [
    { dataType: 'automation-config', currentRepository: 'supabase-automation' },
    { dataType: 'trading-data', currentRepository: 'VixGuardian' },
  ];

  correctMappings.forEach(({ dataType, currentRepository }) => {
    const result = validator.validate(dataType, currentRepository);
    console.log(`   ${result.isValid ? '✓' : '✗'} ${dataType} in ${currentRepository}`);
  });

  console.log('\n2. Testing misaligned mappings (auto-repair enabled)...\n');
  
  const misalignedMappings = [
    { dataType: 'automation-config', currentRepository: 'VixGuardian' },
    { dataType: 'trading-data', currentRepository: 'supabase-automation' },
  ];

  misalignedMappings.forEach(({ dataType, currentRepository }) => {
    const result = validator.validate(dataType, currentRepository);
    console.log(`   ${result.autoRepaired ? '🔧' : '✗'} ${dataType} in ${currentRepository}`);
    if (result.autoRepaired) {
      console.log(`      → Auto-repaired: ${result.repairActions[0]}`);
    }
  });

  console.log('\n3. Testing unknown data type (fallback)...\n');
  
  const unknownResult = validator.validate('unknown-data-type');
  console.log(`   ${unknownResult.autoRepaired ? '🔧' : '✗'} unknown-data-type`);
  if (unknownResult.autoRepaired) {
    console.log(`      → ${unknownResult.repairActions[0]}`);
  }

  console.log('\n4. All supported data types:\n');
  const supportedTypes = validator.getSupportedDataTypes();
  supportedTypes.forEach((type) => {
    const repoName = Object.keys(validator['routingRules'].repositories).find((repo) =>
      validator['routingRules'].repositories[repo].dataTypes.includes(type)
    );
    console.log(`   • ${type} → ${repoName}`);
  });

  console.log('\n========================================');
  console.log('Demo Complete!');
  console.log('========================================\n');
  
  logger.info('Demo completed successfully');
}

demo().catch((error) => {
  console.error('Demo error:', error);
  process.exit(1);
});
