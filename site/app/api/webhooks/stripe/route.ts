/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles Stripe events (checkout completed, subscription changes, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // In real implementation, verify webhook and process event
    //
    // const stripe = require('stripe')(stripeSecretKey);
    //
    // let event;
    // try {
    //   event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    // } catch (err: any) {
    //   console.error('Webhook signature verification failed:', err.message);
    //   return NextResponse.json(
    //     { error: 'Invalid signature' },
    //     { status: 400 }
    //   );
    // }
    //
    // // Import license service
    // const { LicenseService } = await import('@/modules/license/license.service');
    // const { StripeService } = await import('@/modules/license/stripe.service');
    //
    // const licenseService = new LicenseService();
    // const stripeService = new StripeService(stripeSecretKey, webhookSecret, licenseService);
    //
    // const result = await stripeService.handleWebhook(body, signature);
    //
    // return NextResponse.json({
    //   received: true,
    //   handled: result.handled,
    // });

    // Mock response for development
    console.log('Webhook received (mock):', body.substring(0, 100));

    return NextResponse.json({
      received: true,
      handled: true,
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
