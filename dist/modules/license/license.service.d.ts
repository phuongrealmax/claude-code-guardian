/**
 * License Service
 *
 * Manages license creation, verification, and validation
 */
import type { License, LicenseTier, LicenseStatus, LicenseVerifyRequest, LicenseVerifyResponse, CreateLicenseParams } from './license.types.js';
export declare class LicenseService {
    private db;
    constructor(dbPath?: string);
    private initDatabase;
    /**
     * Generate a license key
     * Format: CGS-{TIER}-{RANDOM}-{RANDOM}
     */
    generateLicenseKey(tier: LicenseTier): string;
    private randomString;
    /**
     * Create a new license
     */
    createLicense(params: CreateLicenseParams): License;
    /**
     * Get license by key
     */
    getLicenseByKey(licenseKey: string): License | null;
    /**
     * Get license by Stripe subscription ID
     */
    getLicenseByStripeSubscription(subscriptionId: string): License | null;
    /**
     * Get all licenses for an email
     */
    getLicensesByEmail(email: string): License[];
    /**
     * Verify a license
     */
    verifyLicense(request: LicenseVerifyRequest): LicenseVerifyResponse;
    /**
     * Update license status
     */
    updateLicenseStatus(licenseKey: string, status: LicenseStatus, expiresAt?: number): boolean;
    /**
     * Cancel a license (for subscription cancellation)
     */
    cancelLicense(subscriptionId: string): boolean;
    /**
     * Get active machines for a license
     */
    private getActiveMachines;
    /**
     * Register or update a machine
     */
    private registerMachine;
    /**
     * Update verification stats
     */
    private updateVerificationStats;
    /**
     * Get features for tier
     */
    private getFeaturesForTier;
    /**
     * Convert database row to License object
     */
    private rowToLicense;
    /**
     * Get stats
     */
    getStats(): {
        total: number;
        byTier: Record<LicenseTier, number>;
        byStatus: Record<LicenseStatus, number>;
    };
    /**
     * Close database connection
     */
    close(): void;
}
//# sourceMappingURL=license.service.d.ts.map