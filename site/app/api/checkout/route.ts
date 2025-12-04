/**
 * Stripe Checkout API
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for Team/Enterprise purchases
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tier, email } = body;

    if (!tier || !['team', 'enterprise'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Enterprise redirects to contact sales
    if (tier === 'enterprise') {
      return NextResponse.json({
        url: 'mailto:hello@codeguardian.studio?subject=Enterprise License Inquiry',
      });
    }

    // For Team tier, create Stripe checkout session
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_TEAM_MONTHLY;

    if (!stripeSecretKey || !stripePriceId) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // In real implementation, use Stripe SDK
    // For now, return mock response for development

    // const stripe = require('stripe')(stripeSecretKey);
    //
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   payment_method_types: ['card'],
    //   line_items: [
    //     {
    //       price: stripePriceId,
    //       quantity: 1,
    //     },
    //   ],
    //   customer_email: email,
    //   success_url: `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: `${request.nextUrl.origin}/pricing`,
    //   metadata: {
    //     tier: 'team',
    //   },
    //   allow_promotion_codes: true,
    // });
    //
    // return NextResponse.json({
    //   sessionId: session.id,
    //   url: session.url,
    // });

    // Mock response for development
    return NextResponse.json({
      sessionId: 'cs_test_mock',
      url: `${request.nextUrl.origin}/success?session_id=cs_test_mock`,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
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
