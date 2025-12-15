// packages/cloud-client/src/index.ts

/**
 * @ccg/cloud-client - License Gateway for Code Guardian Studio
 *
 * This package provides the LicenseGateway abstraction that connects
 * the open-core Code Guardian Studio with license verification services.
 *
 * @example
 * ```typescript
 * import { CloudLicenseGateway, getLicenseGateway } from '@ccg/cloud-client';
 *
 * // Use singleton
 * const gateway = getLicenseGateway();
 * const result = await gateway.verify({ licenseKey: 'CGS-TEAM-XXXX-YYYY' });
 *
 * // Or create custom instance
 * const customGateway = new CloudLicenseGateway({
 *   apiBaseUrl: 'https://custom.api.example.com',
 *   cacheTTL: 12 * 60 * 60 * 1000, // 12 hours
 * });
 * ```
 */

// Re-export everything from gateway module
export * from './gateway/index.js';
