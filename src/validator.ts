#!/usr/bin/env node

import { initializeValidationSystem } from './index';

/**
 * CLI tool for manual validation
 */
async function runValidator() {
  console.log('=== Repository Validation Tool ===\n');

  const { logger, validator, config } = initializeValidationSystem();

  // Display configuration
  console.log('Configuration:');
  console.log(`- Supabase Automation: ${config.supabaseAutomationRepo}`);
  console.log(`- VixGuardian: ${config.vixGuardianRepo}`);
  console.log(`- Auto-repair enabled: ${config.enableAutoRepair}`);
  console.log('');

  // Get all supported data types
  const supportedDataTypes = validator.getSupportedDataTypes();
  console.log(`Supported data types (${supportedDataTypes.length}):`);
  supportedDataTypes.forEach((dt) => console.log(`  - ${dt}`));
  console.log('');

  // Run validation for all data types
  console.log('Running validation for all data types...\n');
  
  const results = validator.validateBatch(
    supportedDataTypes.map((dt) => ({ dataType: dt }))
  );

  // Display results
  let validCount = 0;
  let invalidCount = 0;
  let repairedCount = 0;

  results.forEach((result) => {
    if (result.isValid) {
      validCount++;
      console.log(`✓ ${result.dataType} -> ${result.targetRepository}`);
    } else {
      invalidCount++;
      console.log(`✗ ${result.dataType}`);
      result.issues.forEach((issue) => console.log(`    Issue: ${issue}`));
      if (result.autoRepaired) {
        repairedCount++;
        result.repairActions.forEach((action) => console.log(`    Repair: ${action}`));
      }
    }
  });

  console.log('');
  console.log('=== Validation Summary ===');
  console.log(`Total: ${results.length}`);
  console.log(`Valid: ${validCount}`);
  console.log(`Invalid: ${invalidCount}`);
  console.log(`Auto-repaired: ${repairedCount}`);
  console.log('');

  if (invalidCount === 0 || (invalidCount > 0 && repairedCount === invalidCount)) {
    console.log('✓ All validations passed or were auto-repaired!');
    logger.info('Validation complete: All checks passed');
    process.exit(0);
  } else {
    console.log('✗ Some validations failed and could not be repaired');
    logger.error('Validation complete: Some checks failed');
    process.exit(1);
  }
}

// Run the validator
runValidator().catch((error) => {
  console.error('Error running validator:', error);
  process.exit(1);
});
