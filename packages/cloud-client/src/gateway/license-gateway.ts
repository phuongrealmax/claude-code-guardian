// packages/cloud-client/src/gateway/license-gateway.ts

/**
 * CloudLicenseGateway Implementation
 *
 * Provides license verification with offline-first design.
 * - In-memory cache with optional disk persistence
 * - 24-hour cache TTL
 * - Falls back to dev tier when offline/no license
 */

import type {
  LicenseGateway,
  LicenseInfo,
  LicenseTier,
  LicenseVerifyRequest,
  LicenseVerifyResponse,
  CachedLicense,
  CacheStore,
} from './types.js';
import { DEV_TIER_FEATURES, getFeaturesForTier, isDevFeature } from './types.js';

// ===================================================================
//                      IN-MEMORY CACHE STORE
// ===================================================================

/**
 * Simple in-memory cache implementation
 */
class InMemoryCacheStore implements CacheStore {
  private cache = new Map<string, CachedLicense>();

  get(key: string): CachedLicense | null {
    return this.cache.get(key) ?? null;
  }

  set(key: string, value: CachedLicense): void {
    this.cache.set(key, value);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ===================================================================
//                      CLOUD LICENSE GATEWAY
// ===================================================================

/**
 * Configuration options for CloudLicenseGateway
 */
export interface CloudLicenseGatewayOptions {
  /** Base URL for the license API (default: https://api.codeguardian.studio) */
  apiBaseUrl?: string;
  /** Cache TTL in milliseconds (default: 24 hours) */
  cacheTTL?: number;
  /** Custom cache store implementation */
  cacheStore?: CacheStore;
  /** Initial license key to use */
  licenseKey?: string;
}

/**
 * CloudLicenseGateway - License verification with offline support
 *
 * This gateway provides:
 * - License verification against cloud API (stub for now)
 * - In-memory caching with 24-hour TTL
 * - Offline fallback to dev tier
 * - Feature flag checking
 */
export class CloudLicenseGateway implements LicenseGateway {
  private readonly apiBaseUrl: string;
  private readonly cacheTTL: number;
  private readonly cacheStore: CacheStore;
  private licenseKey: string | null = null;
  private cachedLicense: LicenseInfo | null = null;
  private cacheExpiry: number = 0;

  /** Default cache TTL: 24 hours */
  static readonly DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000;

  /** Default API base URL */
  static readonly DEFAULT_API_URL = 'https://api.codeguardian.studio';

  constructor(options: CloudLicenseGatewayOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? CloudLicenseGateway.DEFAULT_API_URL;
    this.cacheTTL = options.cacheTTL ?? CloudLicenseGateway.DEFAULT_CACHE_TTL;
    this.cacheStore = options.cacheStore ?? new InMemoryCacheStore();
    this.licenseKey = options.licenseKey ?? null;

    // Load from cache if license key provided
    if (this.licenseKey) {
      this.loadFromCache();
    }
  }

  // -----------------------------------------------------------------
  //                      PUBLIC METHODS
  // -----------------------------------------------------------------

  /**
   * Verify a license key
   */
  async verify(request: LicenseVerifyRequest): Promise<LicenseVerifyResponse> {
    const { licenseKey } = request;

    // No license key = dev tier
    if (!licenseKey) {
      return this.devTierResponse();
    }

    // Check cache first
    const cached = this.getCachedLicense(licenseKey);
    if (cached) {
      this.cachedLicense = cached.license;
      this.cacheExpiry = cached.expiresAt;
      return {
        valid: true,
        license: cached.license,
        cached: true,
      };
    }

    // Try cloud verification (stub for now)
    try {
      const result = await this.verifyWithCloud(request);

      if (result.valid && result.license) {
        this.updateCache(licenseKey, result.license);
        this.cachedLicense = result.license;
        this.licenseKey = licenseKey;
      }

      return result;
    } catch (error) {
      // Network error - check for stale cache
      const staleCache = this.getStaleCache(licenseKey);
      if (staleCache) {
        return {
          valid: true,
          license: staleCache.license,
          cached: true,
        };
      }

      // No cache available - fall back to dev tier
      return this.devTierResponse('Unable to verify license (offline)');
    }
  }

  /**
   * Check if a feature is enabled
   */
  hasFeature(feature: string): boolean {
    // Dev features are always available
    if (isDevFeature(feature)) {
      return true;
    }

    // Check cached license features
    if (this.cachedLicense) {
      return this.cachedLicense.features.includes(feature);
    }

    // No license = only dev features
    return false;
  }

  /**
   * Get current license info
   */
  getLicenseInfo(): LicenseInfo | null {
    return this.cachedLicense;
  }

  /**
   * Get current tier
   */
  getTier(): LicenseTier {
    return this.cachedLicense?.tier ?? 'dev';
  }

  /**
   * Force refresh from cloud
   */
  async refresh(): Promise<void> {
    if (!this.licenseKey) {
      return;
    }

    // Clear cache and re-verify
    this.cacheStore.delete(this.getCacheKey(this.licenseKey));
    await this.verify({ licenseKey: this.licenseKey });
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cachedLicense = null;
    this.cacheExpiry = 0;
    this.licenseKey = null;
    this.cacheStore.clear();
  }

  /**
   * Set license key
   */
  setLicenseKey(licenseKey: string): void {
    this.licenseKey = licenseKey;
    this.loadFromCache();
  }

  /**
   * Get stored license key
   */
  getLicenseKey(): string | null {
    return this.licenseKey;
  }

  // -----------------------------------------------------------------
  //                      PRIVATE METHODS
  // -----------------------------------------------------------------

  /**
   * Verify with cloud API (STUB - returns mock response)
   *
   * In future versions, this will make actual HTTP requests to:
   * POST ${this.apiBaseUrl}/v1/license/verify
   */
  private async verifyWithCloud(
    request: LicenseVerifyRequest
  ): Promise<LicenseVerifyResponse> {
    const { licenseKey } = request;

    // STUB IMPLEMENTATION
    // In production, this would call the cloud API:
    //
    // const response = await fetch(`${this.apiBaseUrl}/v1/license/verify`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(request),
    // });
    // return response.json();

    // For now, parse license key format to determine tier
    // Format: CGS-{TIER}-{RANDOM}-{RANDOM}
    const tier = this.parseTierFromKey(licenseKey);

    if (tier) {
      return {
        valid: true,
        license: {
          tier,
          status: 'active',
          features: getFeaturesForTier(tier),
          seats: tier === 'team' ? 5 : tier === 'enterprise' ? 999 : undefined,
        },
      };
    }

    // Invalid key format
    return {
      valid: false,
      error: 'Invalid license key format',
    };
  }

  /**
   * Parse tier from license key format
   * CGS-TEAM-XXXX-YYYY => 'team'
   * CGS-ENTE-XXXX-YYYY => 'enterprise'
   * CGS-DEV-XXXX-YYYY => 'dev'
   */
  private parseTierFromKey(licenseKey: string): LicenseTier | null {
    const match = licenseKey.match(/^CGS-(\w{3,4})-[A-Z0-9]{4}-[A-Z0-9]{4}$/i);
    if (!match) {
      return null;
    }

    const tierPrefix = match[1].toUpperCase();

    if (tierPrefix === 'TEAM') return 'team';
    if (tierPrefix === 'ENTE' || tierPrefix === 'ENT') return 'enterprise';
    if (tierPrefix === 'DEV') return 'dev';

    return null;
  }

  /**
   * Get dev tier response
   */
  private devTierResponse(error?: string): LicenseVerifyResponse {
    const license: LicenseInfo = {
      tier: 'dev',
      status: 'active',
      features: [...DEV_TIER_FEATURES],
    };

    // Cache dev tier locally
    this.cachedLicense = license;

    if (error) {
      return { valid: false, error, license };
    }

    return { valid: true, license };
  }

  /**
   * Get cache key for a license
   */
  private getCacheKey(licenseKey: string): string {
    return `license:${licenseKey}`;
  }

  /**
   * Get cached license if not expired
   */
  private getCachedLicense(licenseKey: string): CachedLicense | null {
    const cached = this.cacheStore.get(this.getCacheKey(licenseKey));

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      return null;
    }

    return cached;
  }

  /**
   * Get stale cache (for offline fallback)
   */
  private getStaleCache(licenseKey: string): CachedLicense | null {
    return this.cacheStore.get(this.getCacheKey(licenseKey));
  }

  /**
   * Update cache with new license info
   */
  private updateCache(licenseKey: string, license: LicenseInfo): void {
    const now = Date.now();
    const cached: CachedLicense = {
      license,
      licenseKey,
      cachedAt: now,
      expiresAt: now + this.cacheTTL,
    };

    this.cacheStore.set(this.getCacheKey(licenseKey), cached);
    this.cacheExpiry = cached.expiresAt;
  }

  /**
   * Load license from cache on startup
   */
  private loadFromCache(): void {
    if (!this.licenseKey) {
      return;
    }

    const cached = this.getCachedLicense(this.licenseKey);
    if (cached) {
      this.cachedLicense = cached.license;
      this.cacheExpiry = cached.expiresAt;
    }
  }
}

// ===================================================================
//                      SINGLETON INSTANCE
// ===================================================================

let defaultGateway: CloudLicenseGateway | null = null;

/**
 * Get the default license gateway instance
 */
export function getLicenseGateway(): LicenseGateway {
  if (!defaultGateway) {
    defaultGateway = new CloudLicenseGateway();
  }
  return defaultGateway;
}

/**
 * Set the default license gateway instance (for testing)
 */
export function setLicenseGateway(gateway: LicenseGateway): void {
  defaultGateway = gateway as CloudLicenseGateway;
}

/**
 * Reset the default gateway (for testing)
 */
export function resetLicenseGateway(): void {
  defaultGateway = null;
}
