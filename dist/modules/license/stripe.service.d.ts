/**
 * Stripe Integration Service
 *
 * Handles Stripe checkout and webhook processing
 */
import type { StripeCheckoutParams } from './license.types.js';
import { LicenseService } from './license.service.js';
export declare class StripeService {
    private stripeSecretKey;
    private stripeWebhookSecret;
    private licenseService;
    private priceIds;
    constructor(stripeSecretKey?: string, webhookSecret?: string, licenseService?: LicenseService);
    /**
     * Create Stripe Checkout Session
     */
    createCheckoutSession(params: StripeCheckoutParams): Promise<{
        sessionId: string;
        url: string;
    }>;
    /**
     * Handle Stripe webhook
     */
    handleWebhook(payload: string, signature: string): Promise<{
        handled: boolean;
        license?: any;
    }>;
    /**
     * Handle checkout completed
     */
    private handleCheckoutCompleted;
    /**
     * Handle subscription updated
     */
    private handleSubscriptionUpdated;
    /**
     * Handle subscription deleted (cancelled)
     */
    private handleSubscriptionDeleted;
    /**
     * Handle payment failed
     */
    private handlePaymentFailed;
    /**
     * Map Stripe subscription status to license status
     */
    private mapStripeStatus;
    /**
     * Send license email (stub - would use email service)
     */
    private sendLicenseEmail;
    /**
     * Get Stripe price IDs
     */
    getPriceIds(): {
        team_monthly: string;
        team_yearly: string;
    };
}
//# sourceMappingURL=stripe.service.d.ts.map