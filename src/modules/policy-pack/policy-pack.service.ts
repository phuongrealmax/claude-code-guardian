/**
 * Policy Pack Service
 *
 * Manages Policy Packs: loading, validation, caching, and application.
 * Supports both local and cloud policies with precedence rules.
 *
 * Precedence: Cloud > Local > Default
 *
 * @module modules/policy-pack/service
 * @since v2.1.0
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  PolicyPack,
  PolicyRules,
  IPolicyProvider,
  PolicyValidationResult,
  PolicyValidationError,
  PolicyValidationWarning,
  SignatureVerificationResult,
  PolicyLoadedEvent,
} from './policy-pack.types.js';
import {
  createDefaultPolicy,
  DEFAULT_POLICY_RULES,
  POLICY_SCHEMA_URL,
} from './policy-pack.types.js';
import { verifyPolicySignature, isSigned, getPolicyFingerprint } from './signature.js';
import type { EventBus } from '../../core/event-bus.js';

// ============================================================================
// Types
// ============================================================================

export interface PolicyPackServiceConfig {
  /** Enable cloud policy fetching */
  cloudEnabled?: boolean;
  /** Local policy file path */
  localPolicyPath?: string;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
  /** Require signed policies */
  requireSigned?: boolean;
  /** Trusted publisher public keys */
  trustedPublicKeys?: string[];
}

interface CachedPolicy {
  policy: PolicyPack;
  loadedAt: number;
  source: 'cloud' | 'local' | 'default';
}

// ============================================================================
// Service
// ============================================================================

/**
 * Policy Pack Service implementation
 */
export class PolicyPackService implements IPolicyProvider {
  private config: Required<PolicyPackServiceConfig>;
  private cache: Map<string, CachedPolicy> = new Map();
  private eventBus?: EventBus;

  constructor(config: PolicyPackServiceConfig = {}, eventBus?: EventBus) {
    this.config = {
      cloudEnabled: config.cloudEnabled ?? false,
      localPolicyPath: config.localPolicyPath ?? '.ccg/policy.json',
      cacheTtlMs: config.cacheTtlMs ?? 5 * 60 * 1000, // 5 minutes
      requireSigned: config.requireSigned ?? false,
      trustedPublicKeys: config.trustedPublicKeys ?? [],
    };
    this.eventBus = eventBus;
  }

  /**
   * Get active policy for a repository
   * Precedence: Cloud > Local > Default
   */
  async getPolicy(repository: string): Promise<PolicyPack | null> {
    // Check cache first
    const cached = this.cache.get(repository);
    if (cached && Date.now() - cached.loadedAt < this.config.cacheTtlMs) {
      return cached.policy;
    }

    let policy: PolicyPack | null = null;
    let source: 'cloud' | 'local' | 'default' = 'default';

    // Try cloud first (if enabled)
    if (this.config.cloudEnabled) {
      policy = await this.fetchCloudPolicy(repository);
      if (policy) source = 'cloud';
    }

    // Try local policy
    if (!policy) {
      policy = await this.loadLocalPolicy();
      if (policy) source = 'local';
    }

    // Fall back to default
    if (!policy) {
      policy = createDefaultPolicy();
      source = 'default';
    }

    // Validate signature if required
    if (this.config.requireSigned && source !== 'default') {
      const sigResult = await this.verifySignature(policy);
      if (!sigResult.valid) {
        // Fall back to default if signature invalid
        policy = createDefaultPolicy();
        source = 'default';
      }
    }

    // Cache the policy
    this.cache.set(repository, {
      policy,
      loadedAt: Date.now(),
      source,
    });

    // Emit event
    this.emitPolicyLoaded(policy, source, repository);

    return policy;
  }

  /**
   * List available policies
   */
  async listPolicies(): Promise<PolicyPack[]> {
    const policies: PolicyPack[] = [];

    // Load local policy if exists
    const local = await this.loadLocalPolicy();
    if (local) policies.push(local);

    // Add default
    policies.push(createDefaultPolicy());

    return policies;
  }

  /**
   * Validate a policy pack structure
   */
  async validatePolicy(policy: PolicyPack): Promise<PolicyValidationResult> {
    const errors: PolicyValidationError[] = [];
    const warnings: PolicyValidationWarning[] = [];

    // Required fields
    if (!policy.name) {
      errors.push({ path: 'name', message: 'Policy name is required', code: 'REQUIRED' });
    }

    if (!policy.version) {
      errors.push({ path: 'version', message: 'Policy version is required', code: 'REQUIRED' });
    } else if (!this.isValidSemver(policy.version)) {
      errors.push({
        path: 'version',
        message: 'Version must be valid semver (e.g., 1.2.0)',
        code: 'INVALID_FORMAT',
      });
    }

    if (!policy.rules) {
      errors.push({ path: 'rules', message: 'Policy rules are required', code: 'REQUIRED' });
    }

    // Validate rules
    if (policy.rules) {
      this.validateRules(policy.rules, errors, warnings);
    }

    // Check schema
    if (policy.$schema && policy.$schema !== POLICY_SCHEMA_URL) {
      warnings.push({
        path: '$schema',
        message: `Unknown schema URL: ${policy.$schema}`,
        code: 'UNKNOWN_SCHEMA',
      });
    }

    // Check deprecation
    if (policy.deprecated) {
      warnings.push({
        path: 'deprecated',
        message: `Policy is deprecated${policy.replacedBy ? `, use ${policy.replacedBy}` : ''}`,
        code: 'DEPRECATED',
      });
    }

    // Check signature for cloud policies
    if (this.config.requireSigned && !isSigned(policy)) {
      errors.push({
        path: 'integrity.signature',
        message: 'Policy must be signed',
        code: 'UNSIGNED',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Verify policy signature
   */
  async verifySignature(policy: PolicyPack): Promise<SignatureVerificationResult> {
    if (!isSigned(policy)) {
      return {
        valid: false,
        error: 'Policy is not signed',
      };
    }

    const result = verifyPolicySignature(policy);

    // Check trusted publishers
    if (
      result.valid &&
      this.config.trustedPublicKeys.length > 0 &&
      policy.integrity?.publicKey
    ) {
      if (!this.config.trustedPublicKeys.includes(policy.integrity.publicKey)) {
        return {
          valid: false,
          error: 'Policy signed by untrusted publisher',
        };
      }
    }

    return result;
  }

  /**
   * Apply policy rules to Guard configuration
   * Returns merged rules with policy taking precedence
   */
  mergeWithDefaults(policy: PolicyPack): PolicyRules {
    return {
      ...DEFAULT_POLICY_RULES,
      ...policy.rules,
      tdi: { ...DEFAULT_POLICY_RULES.tdi!, ...(policy.rules.tdi ?? {}) },
      coverage: { ...DEFAULT_POLICY_RULES.coverage!, ...(policy.rules.coverage ?? {}) },
      complexity: { ...DEFAULT_POLICY_RULES.complexity!, ...(policy.rules.complexity ?? {}) },
    };
  }

  /**
   * Clear policy cache
   */
  clearCache(repository?: string): void {
    if (repository) {
      this.cache.delete(repository);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Get policy fingerprint
   */
  getFingerprint(policy: PolicyPack): string {
    return getPolicyFingerprint(policy);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchCloudPolicy(_repository: string): Promise<PolicyPack | null> {
    // TODO: Implement cloud policy fetching when Evidence Vault is ready
    // Will use HttpClient from src/cloud/api/client.ts
    return null;
  }

  private async loadLocalPolicy(): Promise<PolicyPack | null> {
    try {
      const policyPath = join(process.cwd(), this.config.localPolicyPath);

      if (!existsSync(policyPath)) {
        return null;
      }

      const content = await readFile(policyPath, 'utf8');
      const policy = JSON.parse(content) as PolicyPack;

      return policy;
    } catch {
      return null;
    }
  }

  private validateRules(
    rules: PolicyRules,
    errors: PolicyValidationError[],
    warnings: PolicyValidationWarning[]
  ): void {
    // Validate TDI rules
    if (rules.tdi) {
      if (typeof rules.tdi.maxBudget !== 'number' || rules.tdi.maxBudget < 0) {
        errors.push({
          path: 'rules.tdi.maxBudget',
          message: 'maxBudget must be a non-negative number',
          code: 'INVALID_VALUE',
        });
      }

      if (rules.tdi.maxBudget > 100) {
        warnings.push({
          path: 'rules.tdi.maxBudget',
          message: 'maxBudget > 100 is unusually high',
          code: 'UNUSUAL_VALUE',
        });
      }
    }

    // Validate coverage rules
    if (rules.coverage) {
      if (typeof rules.coverage.minTotal !== 'number') {
        errors.push({
          path: 'rules.coverage.minTotal',
          message: 'minTotal must be a number',
          code: 'INVALID_VALUE',
        });
      } else if (rules.coverage.minTotal < 0 || rules.coverage.minTotal > 100) {
        errors.push({
          path: 'rules.coverage.minTotal',
          message: 'minTotal must be between 0 and 100',
          code: 'OUT_OF_RANGE',
        });
      }
    }

    // Validate complexity rules
    if (rules.complexity) {
      if (typeof rules.complexity.maxScore !== 'number' || rules.complexity.maxScore < 0) {
        errors.push({
          path: 'rules.complexity.maxScore',
          message: 'maxScore must be a non-negative number',
          code: 'INVALID_VALUE',
        });
      }
    }

    // Validate guard rules
    if (rules.guards) {
      for (let i = 0; i < rules.guards.length; i++) {
        const guard = rules.guards[i];
        if (!guard.id) {
          errors.push({
            path: `rules.guards[${i}].id`,
            message: 'Guard rule id is required',
            code: 'REQUIRED',
          });
        }
        if (!['error', 'warning'].includes(guard.severity)) {
          errors.push({
            path: `rules.guards[${i}].severity`,
            message: 'Severity must be "error" or "warning"',
            code: 'INVALID_VALUE',
          });
        }
      }
    }
  }

  private isValidSemver(version: string): boolean {
    // Simple semver validation (major.minor.patch)
    return /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version);
  }

  private emitPolicyLoaded(
    policy: PolicyPack,
    source: 'cloud' | 'local' | 'default',
    repository?: string
  ): void {
    if (!this.eventBus) return;

    const eventData: PolicyLoadedEvent = {
      policy,
      source,
      repository,
    };

    this.eventBus.emit({
      type: 'policy:loaded',
      timestamp: new Date(),
      data: eventData,
    });
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create PolicyPackService instance
 */
export function createPolicyPackService(
  config?: PolicyPackServiceConfig,
  eventBus?: EventBus
): PolicyPackService {
  return new PolicyPackService(config, eventBus);
}
