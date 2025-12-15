# @ccg/cloud-client

License gateway client for Code Guardian Studio.

## Overview

This package provides the `LicenseGateway` abstraction that connects the open-core Code Guardian Studio CLI/MCP server with license verification services.

## Installation

```bash
npm install @ccg/cloud-client
```

## Usage

```typescript
import { CloudLicenseGateway, DEV_TIER_FEATURES } from '@ccg/cloud-client';

// Create gateway instance
const gateway = new CloudLicenseGateway();

// Verify a license (returns dev tier if no license/offline)
const result = await gateway.verify({ licenseKey: 'CGS-TEAM-XXXX-YYYY' });

if (result.valid) {
  console.log('License tier:', result.license?.tier);
}

// Check feature access
if (gateway.hasFeature('advanced_reports')) {
  // Enable advanced reporting
}
```

## Offline-First Design

The gateway is designed to work offline:

| Scenario | Behavior |
|----------|----------|
| No license key | Dev tier features |
| Valid license + online | Full tier features |
| Valid license + offline | Cached tier (24h grace) |
| Expired cache | Falls back to dev tier |

## Dev Tier Features

The following features are available without a license:

- `code_optimizer` - Basic code optimization
- `memory` - Persistent memory module
- `guard` - Code validation rules
- `workflow` - Task management
- `basic_reports` - Basic markdown reports

## License

MIT - Code Guardian Studio
