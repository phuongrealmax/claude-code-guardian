// src/core/license-integration.ts

/**
 * License Gateway Integration
 *
 * Provides a centralized way for modules to check license tier and features.
 * Wraps the @ccg/cloud-client gateway with project-specific configuration.
 */

import {
  CloudLicenseGateway,
  getLicenseGateway,
  setLicenseGateway,
  type LicenseGateway,
  type LicenseInfo,
  type LicenseTier,
  type LicenseVerifyResponse,
  DEV_TIER_FEATURES,
  TEAM_TIER_FEATURES,
  ENTERPRISE_TIER_FEATURES,
} from '@ccg/cloud-client';
import * as fs from 'fs';
import * as path from 'path';

// Re-export types for convenience
export type {
  LicenseGateway,
  LicenseInfo,
  LicenseTier,
  LicenseVerifyResponse,
};

export {
  DEV_TIER_FEATURES,
  TEAM_TIER_FEATURES,
  ENTERPRISE_TIER_FEATURES,
};

// ===================================================================
//                      FEATURE NAMES
// ===================================================================

/**
 * Named features for type-safe feature checks
 */
export const Features = {
  // Dev tier (free)
  CODE_OPTIMIZER: 'code_optimizer',
  MEMORY: 'memory',
  GUARD: 'guard',
  WORKFLOW: 'workflow',
  BASIC_REPORTS: 'basic_reports',

  // Team tier
  ADVANCED_REPORTS: 'advanced_reports',
  REPORT_DASHBOARD: 'report_dashboard',
  LATENT_CHAIN: 'latent_chain',
  AGENTS: 'agents',
  THINKING: 'thinking',
  DOCUMENTS: 'documents',
  TESTING: 'testing',
  AUTO_AGENT: 'auto_agent',
  PRIORITY_SUPPORT: 'priority_support',

  // Enterprise tier
  SOC2_COMPLIANCE: 'soc2_compliance',
  SSO: 'sso',
  AUDIT_LOGS: 'audit_logs',
  DEDICATED_SUPPORT: 'dedicated_support',
  CUSTOM_INTEGRATIONS: 'custom_integrations',
  UNLIMITED_SEATS: 'unlimited_seats',
  MULTI_REPO: 'multi_repo',
  CI_INTEGRATION: 'ci_integration',
  PR_COMMENTS: 'pr_comments',
} as const;

export type FeatureName = (typeof Features)[keyof typeof Features];

// ===================================================================
//                      LICENSE FILE MANAGEMENT
// ===================================================================

const LICENSE_FILE = '.ccg/license.key';

/**
 * Load license key from project config
 */
export function loadLicenseKey(projectRoot: string = process.cwd()): string | null {
  const licensePath = path.join(projectRoot, LICENSE_FILE);

  try {
    if (fs.existsSync(licensePath)) {
      const content = fs.readFileSync(licensePath, 'utf-8').trim();
      if (content && content.startsWith('CGS-')) {
        return content;
      }
    }
  } catch {
    // Ignore errors - treat as no license
  }

  return null;
}

/**
 * Save license key to project config
 */
export function saveLicenseKey(
  licenseKey: string,
  projectRoot: string = process.cwd()
): void {
  const ccgDir = path.join(projectRoot, '.ccg');
  const licensePath = path.join(ccgDir, 'license.key');

  // Ensure .ccg directory exists
  if (!fs.existsSync(ccgDir)) {
    fs.mkdirSync(ccgDir, { recursive: true });
  }

  fs.writeFileSync(licensePath, licenseKey, 'utf-8');
}

/**
 * Remove license key from project config
 */
export function removeLicenseKey(projectRoot: string = process.cwd()): void {
  const licensePath = path.join(projectRoot, LICENSE_FILE);

  try {
    if (fs.existsSync(licensePath)) {
      fs.unlinkSync(licensePath);
    }
  } catch {
    // Ignore errors
  }
}

// ===================================================================
//                      GATEWAY INITIALIZATION
// ===================================================================

let initialized = false;

/**
 * Initialize the license gateway with project configuration
 */
export async function initLicenseGateway(
  projectRoot: string = process.cwd()
): Promise<LicenseGateway> {
  const gateway = getLicenseGateway();

  if (!initialized) {
    // Load license key from project config
    const licenseKey = loadLicenseKey(projectRoot);

    if (licenseKey) {
      gateway.setLicenseKey(licenseKey);
      // Verify on startup (async, don't block)
      gateway.verify({ licenseKey }).catch(() => {
        // Ignore verification errors on startup
      });
    }

    initialized = true;
  }

  return gateway;
}

/**
 * Get the license gateway (initializes if needed)
 */
export function getGateway(): LicenseGateway {
  return getLicenseGateway();
}

// ===================================================================
//                      CONVENIENCE FUNCTIONS
// ===================================================================

/**
 * Check if a feature is enabled
 */
export function hasFeature(feature: FeatureName | string): boolean {
  return getGateway().hasFeature(feature);
}

/**
 * Get current license tier
 */
export function getCurrentTier(): LicenseTier {
  return getGateway().getTier();
}

/**
 * Get current license info
 */
export function getLicenseInfo(): LicenseInfo | null {
  return getGateway().getLicenseInfo();
}

/**
 * Check if using dev (free) tier
 */
export function isDevTier(): boolean {
  return getCurrentTier() === 'dev';
}

/**
 * Check if using team tier or higher
 */
export function isTeamTierOrHigher(): boolean {
  const tier = getCurrentTier();
  return tier === 'team' || tier === 'enterprise';
}

/**
 * Check if using enterprise tier
 */
export function isEnterpriseTier(): boolean {
  return getCurrentTier() === 'enterprise';
}

/**
 * Verify a license key and update the gateway
 */
export async function verifyLicense(
  licenseKey: string,
  projectRoot: string = process.cwd()
): Promise<LicenseVerifyResponse> {
  const gateway = getGateway();
  const result = await gateway.verify({ licenseKey });

  if (result.valid) {
    // Save to project config
    saveLicenseKey(licenseKey, projectRoot);
  }

  return result;
}

/**
 * Clear license and reset to dev tier
 */
export function clearLicense(projectRoot: string = process.cwd()): void {
  getGateway().clearCache();
  removeLicenseKey(projectRoot);
}

// ===================================================================
//                      TIER DISPLAY HELPERS
// ===================================================================

/**
 * Get display name for tier
 */
export function getTierDisplayName(tier: LicenseTier): string {
  switch (tier) {
    case 'enterprise':
      return 'Enterprise';
    case 'team':
      return 'Team';
    case 'dev':
    default:
      return 'Dev (Free)';
  }
}

/**
 * Get tier badge for CLI output
 */
export function getTierBadge(tier: LicenseTier): string {
  switch (tier) {
    case 'enterprise':
      return '[ENTERPRISE]';
    case 'team':
      return '[TEAM]';
    case 'dev':
    default:
      return '[DEV]';
  }
}

/**
 * Get feature availability message
 */
export function getFeatureMessage(feature: string, requiredTier: LicenseTier): string {
  const current = getCurrentTier();

  if (hasFeature(feature)) {
    return `Feature "${feature}" is available with your ${getTierDisplayName(current)} license.`;
  }

  return `Feature "${feature}" requires ${getTierDisplayName(requiredTier)} tier. ` +
    `Upgrade at https://codeguardian.studio/pricing`;
}
