// packages/cloud-client/src/gateway/types.ts

/**
 * License Gateway Types
 *
 * Shared types for license verification between open-core and cloud services.
 */

// ===================================================================
//                      LICENSE TYPES
// ===================================================================

/**
 * Available license tiers
 */
export type LicenseTier = 'dev' | 'team' | 'enterprise';

/**
 * License status
 */
export type LicenseStatus = 'active' | 'inactive' | 'cancelled' | 'expired';

/**
 * License information returned after verification
 */
export interface LicenseInfo {
  /** License tier */
  tier: LicenseTier;
  /** Current status */
  status: LicenseStatus;
  /** Expiration timestamp (ms) */
  expiresAt?: number;
  /** List of enabled features */
  features: string[];
  /** Total seats (for team/enterprise) */
  seats?: number;
  /** Seats currently in use */
  seatsUsed?: number;
}

/**
 * Request to verify a license
 */
export interface LicenseVerifyRequest {
  /** The license key to verify */
  licenseKey: string;
  /** Machine identifier for seat tracking */
  machineId?: string;
  /** Product version for compatibility checks */
  productVersion?: string;
}

/**
 * Response from license verification
 */
export interface LicenseVerifyResponse {
  /** Whether the license is valid */
  valid: boolean;
  /** License info if valid */
  license?: LicenseInfo;
  /** Error message if invalid */
  error?: string;
  /** Whether this result came from cache */
  cached?: boolean;
}

// ===================================================================
//                      GATEWAY INTERFACE
// ===================================================================

/**
 * LicenseGateway interface
 *
 * Provides abstraction between open-core and cloud license services.
 * Implementations handle caching, offline mode, and API communication.
 */
export interface LicenseGateway {
  /**
   * Verify a license key against the cloud backend.
   * Falls back to cached result if offline.
   *
   * @param request - License verification request
   * @returns Verification response with license info or error
   */
  verify(request: LicenseVerifyRequest): Promise<LicenseVerifyResponse>;

  /**
   * Check if a specific feature is enabled for the current license.
   * Returns true for dev-tier features even without a license.
   *
   * @param feature - Feature name to check
   * @returns Whether the feature is enabled
   */
  hasFeature(feature: string): boolean;

  /**
   * Get current license info from cache.
   * Returns null if no license has been verified.
   */
  getLicenseInfo(): LicenseInfo | null;

  /**
   * Get current license tier.
   * Returns 'dev' if no license has been verified.
   */
  getTier(): LicenseTier;

  /**
   * Force refresh license from cloud.
   * No-op if no license key is stored.
   */
  refresh(): Promise<void>;

  /**
   * Clear cached license (for logout/reset).
   */
  clearCache(): void;

  /**
   * Set the license key to use for verification.
   * Does not trigger immediate verification.
   *
   * @param licenseKey - The license key to store
   */
  setLicenseKey(licenseKey: string): void;

  /**
   * Get the currently stored license key.
   */
  getLicenseKey(): string | null;
}

// ===================================================================
//                      FEATURE CONSTANTS
// ===================================================================

/**
 * Features available in the free dev tier
 */
export const DEV_TIER_FEATURES = [
  'code_optimizer',
  'memory',
  'guard',
  'workflow',
  'basic_reports',
] as const;

/**
 * Features available in the team tier (includes dev features)
 */
export const TEAM_TIER_FEATURES = [
  ...DEV_TIER_FEATURES,
  'advanced_reports',
  'report_dashboard',
  'latent_chain',
  'agents',
  'thinking',
  'documents',
  'testing',
  'auto_agent',
  'priority_support',
] as const;

/**
 * Features available in the enterprise tier (includes team features)
 */
export const ENTERPRISE_TIER_FEATURES = [
  ...TEAM_TIER_FEATURES,
  'soc2_compliance',
  'sso',
  'audit_logs',
  'dedicated_support',
  'custom_integrations',
  'unlimited_seats',
  'multi_repo',
  'ci_integration',
  'pr_comments',
] as const;

/**
 * Get features for a specific tier
 */
export function getFeaturesForTier(tier: LicenseTier): string[] {
  switch (tier) {
    case 'enterprise':
      return [...ENTERPRISE_TIER_FEATURES];
    case 'team':
      return [...TEAM_TIER_FEATURES];
    case 'dev':
    default:
      return [...DEV_TIER_FEATURES];
  }
}

/**
 * Check if a feature is available in dev tier
 */
export function isDevFeature(feature: string): boolean {
  return (DEV_TIER_FEATURES as readonly string[]).includes(feature);
}

// ===================================================================
//                      CACHE TYPES
// ===================================================================

/**
 * Cached license data structure
 */
export interface CachedLicense {
  /** The license info */
  license: LicenseInfo;
  /** When the cache was created (ms) */
  cachedAt: number;
  /** When the cache expires (ms) */
  expiresAt: number;
  /** The license key used */
  licenseKey: string;
}

/**
 * Cache storage interface (for custom cache implementations)
 */
export interface CacheStore {
  get(key: string): CachedLicense | null;
  set(key: string, value: CachedLicense): void;
  delete(key: string): void;
  clear(): void;
}
