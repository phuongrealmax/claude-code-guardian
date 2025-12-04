/**
 * License Module Types
 *
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
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    companyName?: string;
    seats?: number;
    createdAt: number;
    activatedAt?: number;
    expiresAt?: number;
    cancelledAt?: number;
    lastVerifiedAt?: number;
    verifyCount?: number;
}
export interface LicenseVerifyRequest {
    licenseKey: string;
    email?: string;
    machineId?: string;
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
export declare const TIER_FEATURES: Record<LicenseTier, string[]>;
export declare const STRIPE_PRICES: {
    team_monthly: string;
    team_yearly: string;
};
//# sourceMappingURL=license.types.d.ts.map