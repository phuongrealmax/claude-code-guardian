/**
 * License Module Types
 *
 * OPEN-CORE CLIENT TYPES:
 * For the official open-core license types, use @ccg/cloud-client instead:
 *   import { LicenseTier, LicenseInfo, LicenseGateway } from '@ccg/cloud-client';
 *
 * LEGACY/INTERNAL TYPES:
 * The types below are kept for backward compatibility and internal reference.
 * They are used by the legacy backend code (stripe.service.ts, paddle.service.ts)
 * which will be moved to the private `cloud-backend` repository.
 *
 * See docs/LICENSE_SYSTEM.md for architecture details.
 *
 * ---
 * Original description:
 * Handles license management for Code Guardian Studio
 * - Team and Enterprise licenses
 * - License verification for CLI
 * - Stripe integration
 */

export type LicenseTier = 'dev' | 'team' | 'enterprise';
export type LicenseStatus = 'active' | 'inactive' | 'cancelled' | 'expired';

export interface License {
  id: string;
  licenseKey: string;
  email: string;
  tier: LicenseTier;
  status: LicenseStatus;

  // Stripe data
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;

  // Metadata
  companyName?: string;
  seats?: number; // For Team/Enterprise

  // Timestamps
  createdAt: number;
  activatedAt?: number;
  expiresAt?: number;
  cancelledAt?: number;

  // Usage tracking
  lastVerifiedAt?: number;
  verifyCount?: number;
}

export interface LicenseVerifyRequest {
  licenseKey: string;
  email?: string;
  machineId?: string; // For seat tracking
}

export interface LicenseVerifyResponse {
  valid: boolean;
  license?: {
    tier: LicenseTier;
    status: LicenseStatus;
    expiresAt?: number;
    features: string[];
  };
  error?: string;
}

export interface CreateLicenseParams {
  email: string;
  tier: LicenseTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  companyName?: string;
  seats?: number;
}

export interface StripeCheckoutParams {
  tier: 'team' | 'enterprise';
  email?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

// Feature flags by tier
export const TIER_FEATURES: Record<LicenseTier, string[]> = {
  dev: [
    'code_optimizer',
    'memory',
    'guard',
    'workflow',
    'basic_reports',
  ],
  team: [
    'code_optimizer',
    'memory',
    'guard',
    'workflow',
    'advanced_reports',
    'report_dashboard',
    'latent_chain',
    'agents',
    'thinking',
    'documents',
    'testing',
    'auto_agent',
    'priority_support',
  ],
  enterprise: [
    'code_optimizer',
    'memory',
    'guard',
    'workflow',
    'advanced_reports',
    'report_dashboard',
    'latent_chain',
    'agents',
    'thinking',
    'documents',
    'testing',
    'auto_agent',
    'priority_support',
    'soc2_compliance',
    'sso',
    'audit_logs',
    'dedicated_support',
    'custom_integrations',
    'unlimited_seats',
  ],
};

// Stripe pricing
export const STRIPE_PRICES = {
  team_monthly: 'price_team_monthly', // Will be replaced with actual Stripe price ID
  team_yearly: 'price_team_yearly',
  // Enterprise is custom, contact sales
};
