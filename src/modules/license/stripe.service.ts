/**
 * Stripe Integration Service
 *
 * Handles Stripe checkout and webhook processing
 */

import type {
  StripeCheckoutParams,
  StripeWebhookEvent,
  CreateLicenseParams,
} from './license.types.js';
import { LicenseService } from './license.service.js';

export class StripeService {
  private stripeSecretKey: string;
  private stripeWebhookSecret: string;
  private licenseService: LicenseService;

  // Stripe price IDs (will be set via env vars)
  private priceIds = {
    team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || 'price_team_monthly',
    team_yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || 'price_team_yearly',
  };

  constructor(
    stripeSecretKey?: string,
    webhookSecret?: string,
    licenseService?: LicenseService
  ) {
    this.stripeSecretKey =
      stripeSecretKey || process.env.STRIPE_SECRET_KEY || '';
    this.stripeWebhookSecret =
      webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
    this.licenseService = licenseService || new LicenseService();

    if (!this.stripeSecretKey) {
      console.warn(
        'Stripe secret key not configured. License features will be disabled.'
      );
    }
  }

  /**
   * Create Stripe Checkout Session
   */
  async createCheckoutSession(
    params: StripeCheckoutParams
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripeSecretKey) {
      throw new Error('Stripe not configured');
    }

    // In real implementation, use Stripe SDK
    // For now, return mock response
    const mockSessionId = 'cs_test_' + Math.random().toString(36).substring(7);

    // Price ID based on tier
    const priceId =
      params.tier === 'team' ? this.priceIds.team_monthly : undefined;

    if (!priceId && params.tier !== 'enterprise') {
      throw new Error('Invalid tier');
    }

    // For enterprise, we'd create a custom checkout or redirect to contact sales

    return {
      sessionId: mockSessionId,
      url: `https://checkout.stripe.com/pay/${mockSessionId}`,
    };

    /*
    // Real Stripe implementation:
    const stripe = require('stripe')(this.stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: params.email,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        tier: params.tier,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
    */
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(
    payload: string,
    signature: string
  ): Promise<{ handled: boolean; license?: any }> {
    if (!this.stripeSecretKey) {
      throw new Error('Stripe not configured');
    }

    // In real implementation, verify webhook signature
    // const stripe = require('stripe')(this.stripeSecretKey);
    // const event = stripe.webhooks.constructEvent(payload, signature, this.stripeWebhookSecret);

    // Mock event parsing
    const event: StripeWebhookEvent = JSON.parse(payload);

    switch (event.type) {
      case 'checkout.session.completed':
        return await this.handleCheckoutCompleted(event);

      case 'customer.subscription.updated':
        return await this.handleSubscriptionUpdated(event);

      case 'customer.subscription.deleted':
        return await this.handleSubscriptionDeleted(event);

      case 'invoice.payment_failed':
        return await this.handlePaymentFailed(event);

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
        return { handled: false };
    }
  }

  /**
   * Handle checkout completed
   */
  private async handleCheckoutCompleted(
    event: StripeWebhookEvent
  ): Promise<{ handled: boolean; license?: any }> {
    const session = event.data.object;

    const tier = session.metadata?.tier || 'team';
    const email = session.customer_email || session.customer_details?.email;

    if (!email) {
      console.error('No email found in checkout session');
      return { handled: false };
    }

    // Create license
    const licenseParams: CreateLicenseParams = {
      email,
      tier: tier as any,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      stripePriceId: session.line_items?.data[0]?.price?.id,
      seats: tier === 'team' ? 5 : undefined,
    };

    const license = this.licenseService.createLicense(licenseParams);

    // In real implementation, send email with license key
    await this.sendLicenseEmail(license.email, license.licenseKey);

    console.log(`License created: ${license.licenseKey} for ${email}`);

    return {
      handled: true,
      license,
    };
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(
    event: StripeWebhookEvent
  ): Promise<{ handled: boolean }> {
    const subscription = event.data.object;

    const license = this.licenseService.getLicenseByStripeSubscription(
      subscription.id
    );

    if (!license) {
      console.error(`License not found for subscription: ${subscription.id}`);
      return { handled: false };
    }

    // Update license status based on subscription status
    const status = this.mapStripeStatus(subscription.status);
    this.licenseService.updateLicenseStatus(license.licenseKey, status);

    console.log(
      `License ${license.licenseKey} status updated to ${status}`
    );

    return { handled: true };
  }

  /**
   * Handle subscription deleted (cancelled)
   */
  private async handleSubscriptionDeleted(
    event: StripeWebhookEvent
  ): Promise<{ handled: boolean }> {
    const subscription = event.data.object;

    const success = this.licenseService.cancelLicense(subscription.id);

    if (success) {
      console.log(`License cancelled for subscription: ${subscription.id}`);
    }

    return { handled: success };
  }

  /**
   * Handle payment failed
   */
  private async handlePaymentFailed(
    event: StripeWebhookEvent
  ): Promise<{ handled: boolean }> {
    const invoice = event.data.object;

    // Could send email notification to user
    console.log(`Payment failed for subscription: ${invoice.subscription}`);

    return { handled: true };
  }

  /**
   * Map Stripe subscription status to license status
   */
  private mapStripeStatus(
    stripeStatus: string
  ): 'active' | 'inactive' | 'cancelled' {
    switch (stripeStatus) {
      case 'active':
      case 'trialing':
        return 'active';
      case 'past_due':
      case 'unpaid':
        return 'inactive';
      case 'canceled':
      case 'incomplete_expired':
        return 'cancelled';
      default:
        return 'inactive';
    }
  }

  /**
   * Send license email (stub - would use email service)
   */
  private async sendLicenseEmail(
    email: string,
    licenseKey: string
  ): Promise<void> {
    // In real implementation, use email service (Resend, SendGrid, etc.)
    console.log(`
========================================
LICENSE EMAIL
To: ${email}
Subject: Your Code Guardian Studio License Key

Thank you for your purchase!

Your license key: ${licenseKey}

To activate in CLI:
ccg activate

Then enter your license key when prompted.

Need help? Reply to this email or visit:
https://codeguardian.studio/docs/activation

Best regards,
Code Guardian Studio Team
========================================
    `);

    /*
    // Real email implementation (example with Resend):
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'hello@codeguardian.studio',
      to: email,
      subject: 'Your Code Guardian Studio License Key',
      html: `
        <h2>Thank you for your purchase!</h2>
        <p>Your license key: <strong>${licenseKey}</strong></p>
        <p>To activate in CLI:</p>
        <pre>ccg activate</pre>
        <p>Then enter your license key when prompted.</p>
      `,
    });
    */
  }

  /**
   * Get Stripe price IDs
   */
  getPriceIds() {
    return this.priceIds;
  }
}
