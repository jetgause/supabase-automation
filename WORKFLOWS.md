# Workflow Documentation

## Overview

This repository includes two GitHub Actions workflows for automated repository validation:

1. **Repository Validation** (`validation.yml`) - Continuous validation on code changes
2. **Zero-Error Loop Monitor** (`zero-error-monitor.yml`) - Hourly monitoring for errors

## Validation Workflow

**File**: `.github/workflows/validation.yml`

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Every 6 hours (scheduled)
- Manual trigger via workflow_dispatch

**Actions**:
1. Checks out the repository
2. Sets up Node.js environment
3. Installs dependencies
4. Builds the project
5. Runs repository validation
6. Uploads validation logs as artifacts (retained for 30 days)
7. Notifies on failure

**Exit Codes**:
- `0`: All validations passed or were auto-repaired
- `1`: Validation failures that could not be auto-repaired

## Zero-Error Loop Monitor

**File**: `.github/workflows/zero-error-monitor.yml`

**Triggers**:
- Every hour (scheduled)
- Manual trigger via workflow_dispatch

**Actions**:
1. Checks out the repository
2. Sets up Node.js environment
3. Installs dependencies
4. Builds the project
5. Runs validation cycle with 5-minute timeout
6. Checks for unrepaired errors
7. Uploads monitoring logs as artifacts (retained for 7 days)

**Purpose**:
This workflow ensures continuous monitoring and early detection of repository misalignments. It runs independently of code changes to catch any drift in data-repository mappings.

## Environment Variables

Both workflows use the following environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `SUPABASE_AUTOMATION_REPO` | `https://github.com/jetgause/supabase-automation` | URL of the supabase-automation repository |
| `VIXGUARDIAN_REPO` | `https://github.com/jetgause/VixGuardian` | URL of the VixGuardian repository |
| `ENABLE_AUTO_REPAIR` | `true` | Enable automatic repair of misalignments |
| `ENABLE_VALIDATION_LOGGING` | `true` | Enable detailed validation logging |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

## Artifacts

### Validation Logs
- **Workflow**: Repository Validation
- **Retention**: 30 days
- **Contents**: Full validation logs including all checks and repairs

### Monitoring Logs
- **Workflow**: Zero-Error Loop Monitor
- **Retention**: 7 days
- **Contents**: Hourly validation cycle logs

## Viewing Artifacts

1. Navigate to the Actions tab in GitHub
2. Select the workflow run
3. Scroll to the "Artifacts" section at the bottom
4. Download the artifact to view logs

## Permissions

Both workflows use minimal permissions:
- `contents: read` - Only read access to repository contents

This follows the principle of least privilege for security.

## Troubleshooting

### Workflow Failures

If a workflow fails:

1. **Check the logs**: Click on the failed job to view detailed logs
2. **Review validation results**: Look for the "Validation Summary" section
3. **Check for unrepaired errors**: These indicate issues that need manual intervention
4. **Review repair actions**: See what auto-repairs were attempted

### Common Issues

**Issue**: "No repository mapping found for data type"
- **Cause**: A data type is not defined in `src/config/routing-rules.json`
- **Solution**: Add the data type to the appropriate repository configuration

**Issue**: "Repository misalignment detected"
- **Cause**: Data is being routed to the wrong repository
- **Solution**: If auto-repair is enabled, this will be fixed automatically. Otherwise, update the routing rules.

**Issue**: "Previous validation cycle still in progress"
- **Cause**: A validation cycle is taking longer than the interval
- **Solution**: This is handled gracefully by skipping the interval. Consider increasing the interval if this happens frequently.

## Manual Workflow Execution

To manually trigger a workflow:

1. Go to the Actions tab
2. Select the workflow (Validation or Monitor)
3. Click "Run workflow"
4. Select the branch
5. Click "Run workflow" button

This is useful for:
- Testing changes to the workflow
- Running validation on-demand
- Debugging issues
