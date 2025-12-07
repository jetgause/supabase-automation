# supabase-automation

Automated repository validation and zero-error cycle management for the `supabase-automation` and `VixGuardian` integration.

## Features

- **Repository Validation**: Automatically validates data-repository mappings to ensure data is routed to the correct repository
- **Zero-Error Loop**: Continuous validation and auto-repair mechanism that operates without manual intervention
- **Dynamic Error Detection**: Detects misalignments between repositories in real-time
- **Self-Repair Mechanisms**: Automatically corrects routing errors when detected
- **Comprehensive Logging**: All validation actions and repairs are logged for monitoring purposes
- **GitHub Actions Integration**: Automated workflows for continuous validation

## Installation

```bash
npm install
```

## Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Configuration options:
- `SUPABASE_AUTOMATION_REPO`: URL of the supabase-automation repository
- `VIXGUARDIAN_REPO`: URL of the VixGuardian repository
- `ENABLE_AUTO_REPAIR`: Enable automatic repair of misalignments (default: true)
- `ENABLE_VALIDATION_LOGGING`: Enable detailed logging (default: true)
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Usage

### Build the Project

```bash
npm run build
```

### Run Manual Validation

```bash
npm run validate
```

This will:
1. Load the routing rules from `src/config/routing-rules.json`
2. Validate all configured data types
3. Report any misalignments and auto-repair actions
4. Exit with code 0 if all validations pass, 1 otherwise

### Start the Zero-Error Loop

```bash
npm start
```

This starts the continuous validation loop that runs every 60 seconds by default.

### Development Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Lint Code

```bash
npm run lint
```

## Architecture

### Components

1. **Repository Validator** (`src/validators/repository-validator.ts`)
   - Validates data-repository mappings
   - Detects misalignments
   - Implements auto-repair logic
   - Supports batch validation

2. **Zero-Error Loop** (`src/validators/zero-error-loop.ts`)
   - Continuous validation cycle
   - Automatic error detection
   - Self-repair mechanisms
   - Configurable validation interval

3. **Configuration System** (`src/config/`)
   - Routing rules for data types
   - Repository mappings
   - Validation settings

4. **Logging System** (`src/utils/logger.ts`)
   - Winston-based logging
   - Separate log files for errors and general logs
   - Configurable log levels

### Data Types and Repository Mappings

The system manages the following data types:

**supabase-automation**:
- automation-config
- workflow-definitions
- validation-rules
- repository-mappings

**VixGuardian**:
- trading-data
- market-analysis
- paper-trading
- guardian-config

These mappings are defined in `src/config/routing-rules.json` and can be customized.

## GitHub Actions Workflows

### Repository Validation Workflow
- Runs on push, pull request, and every 6 hours
- Validates all data-repository mappings
- Uploads validation logs as artifacts

### Zero-Error Loop Monitor
- Runs every hour
- Monitors for validation failures
- Alerts on unrepaired errors

## Logging

Logs are written to the `logs/` directory:
- `validation.log`: All validation events
- `validation-error.log`: Errors only

Log format includes:
- Timestamp
- Log level
- Message
- Metadata (data types, repositories, issues, repair actions)

## API

### RepositoryValidator

```typescript
import { RepositoryValidator } from './validators/repository-validator';

// Validate a single data type
const result = validator.validate('automation-config', 'supabase-automation');

// Batch validation
const results = validator.validateBatch([
  { dataType: 'automation-config', currentRepository: 'supabase-automation' },
  { dataType: 'trading-data', currentRepository: 'VixGuardian' }
]);

// Get supported data types
const dataTypes = validator.getSupportedDataTypes();

// Get repository configuration
const config = validator.getRepositoryConfig('supabase-automation');
```

### ZeroErrorLoop

```typescript
import { ZeroErrorLoop } from './validators/zero-error-loop';

// Start the loop
zeroErrorLoop.start();

// Stop the loop
zeroErrorLoop.stop();

// Run a single cycle
const result = await zeroErrorLoop.runOnce();

// Update interval
zeroErrorLoop.setInterval(30000); // 30 seconds
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT