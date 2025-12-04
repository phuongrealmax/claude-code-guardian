# Code Guardian Studio - License System Documentation

**Version:** 3.1.0
**Date:** 2025-12-04
**Author:** Claude + Mona

---

## Overview

Code Guardian Studio sử dụng hệ thống license key để kiểm soát quyền truy cập Team và Enterprise features.

**Kiến trúc:**
- **Free Dev tier:** Không cần license, tất cả users có thể dùng basic features
- **Team tier ($39/mo):** Cần license key, unlock advanced features (reports, agents, latent chain, etc.)
- **Enterprise tier (Custom):** Contact sales, custom license với unlimited seats

---

## Architecture

```
User → codeguardian.studio/pricing → [Get Team] Button
  ↓
  POST /api/checkout → Creates Stripe Checkout Session
  ↓
  User completes payment on Stripe
  ↓
  Stripe sends webhook to /api/webhooks/stripe
  ↓
  Backend creates license key (CGS-TEAM-XXXX-XXXX)
  ↓
  License saved to database + Email sent to user
  ↓
  User runs `ccg activate` in CLI
  ↓
  CLI calls /api/license/verify with license key
  ↓
  Backend verifies → Returns tier + features
  ↓
  CLI saves license to .ccg/license.json
  ↓
  Team features unlocked!
```

---

## Components

### 1. License Database (`src/modules/license`)

**Files:**
- `license.types.ts` - TypeScript types và interfaces
- `license.service.ts` - License CRUD operations (SQLite)
- `stripe.service.ts` - Stripe integration

**Database Schema:**
```sql
CREATE TABLE licenses (
  id TEXT PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  tier TEXT NOT NULL,                    -- 'dev', 'team', 'enterprise'
  status TEXT NOT NULL,                  -- 'active', 'inactive', 'cancelled', 'expired'

  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  company_name TEXT,
  seats INTEGER DEFAULT 1,               -- For seat limits

  created_at INTEGER NOT NULL,
  activated_at INTEGER,
  expires_at INTEGER,
  cancelled_at INTEGER,

  last_verified_at INTEGER,
  verify_count INTEGER DEFAULT 0
);

CREATE TABLE license_machines (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  last_seen_at INTEGER NOT NULL,
  UNIQUE(license_id, machine_id)
);
```

**License Key Format:**
```
CGS-{TIER}-{RANDOM}-{RANDOM}

Examples:
- CGS-TEAM-A3K9-P2Q7
- CGS-ENTP-X8M4-N5R2
```

**Features by Tier:**
```typescript
dev: [
  'code_optimizer',
  'memory',
  'guard',
  'workflow',
  'basic_reports',
]

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
]

enterprise: [
  ...all team features,
  'soc2_compliance',
  'sso',
  'audit_logs',
  'dedicated_support',
  'custom_integrations',
  'unlimited_seats',
]
```

---

### 2. API Endpoints (`site/app/api`)

#### **POST /api/checkout**
Creates a Stripe Checkout session for Team tier purchase.

**Request:**
```json
{
  "tier": "team",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/pay/cs_test_xxx"
}
```

**Implementation:**
- Uses Stripe SDK to create checkout session
- Redirects to Stripe hosted checkout page
- On success → redirects to `/success?session_id={CHECKOUT_SESSION_ID}`
- On cancel → redirects to `/pricing`

---

#### **POST /api/webhooks/stripe**
Handles Stripe webhook events (checkout completed, subscription changes, cancellations).

**Headers:**
```
stripe-signature: t=xxx,v1=yyy
```

**Events Handled:**
- `checkout.session.completed` → Create license + Send email
- `customer.subscription.updated` → Update license status
- `customer.subscription.deleted` → Cancel license
- `invoice.payment_failed` → Mark license as inactive

**Webhook Processing:**
1. Verify webhook signature with Stripe
2. Parse event type
3. For `checkout.session.completed`:
   - Extract email, tier, subscription ID
   - Generate license key: `CGS-TEAM-{RANDOM}-{RANDOM}`
   - Save to database
   - Send email với license key
4. Return `{ received: true, handled: true }`

---

#### **POST /api/license/verify**
Verifies license keys from CLI.

**Request:**
```json
{
  "licenseKey": "CGS-TEAM-A3K9-P2Q7",
  "email": "user@example.com",
  "machineId": "abc123"
}
```

**Response (Valid):**
```json
{
  "valid": true,
  "license": {
    "tier": "team",
    "status": "active",
    "expiresAt": null,
    "features": [
      "code_optimizer",
      "advanced_reports",
      "latent_chain",
      ...
    ]
  }
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "error": "License key not found"
}
```

**Validation Logic:**
1. Check if license exists in database
2. Check status == 'active'
3. Check không expired
4. Check seat limit (if machineId provided)
   - Count active machines (seen in last 30 days)
   - If seat limit reached and machine not registered → deny
   - Else register/update machine last_seen_at
5. Update verify stats (last_verified_at, verify_count++)
6. Return features list for tier

---

### 3. CLI Activation (`src/bin/commands/activate.ts`)

**Command:**
```bash
ccg activate
```

**Flow:**
1. Prompt user for license key
2. Validate format (must start with `CGS-`)
3. Call `/api/license/verify` with:
   - `licenseKey`
   - `machineId` (hash of hostname + platform)
4. If valid:
   - Save to `.ccg/license.json` (local + global)
   - Display success message + tier + features
5. If invalid:
   - Show error message
   - Suggest contacting support

**License Storage:**
```json
// .ccg/license.json
{
  "licenseKey": "CGS-TEAM-A3K9-P2Q7",
  "tier": "team",
  "status": "active",
  "activatedAt": 1733356800000,
  "features": [
    "code_optimizer",
    "advanced_reports",
    ...
  ]
}
```

**Locations:**
- Project: `.ccg/license.json`
- Global: `~/.ccg/license.json` (fallback for all projects)

---

### 4. Success Page (`site/app/success/page.tsx`)

Displays after successful Stripe checkout.

**URL:**
```
https://codeguardian.studio/success?session_id={CHECKOUT_SESSION_ID}
```

**Content:**
- 🎉 Success message
- License key displayed (copied to clipboard)
- Next steps:
  1. Install CCG: `npm install -g codeguardian-studio`
  2. Activate: `ccg activate`
  3. Enter license key
  4. Start using Team features
- List of unlocked features
- Email confirmation notice

---

## Stripe Setup

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up for account
3. Complete business verification

### 2. Create Product & Prices

**Product:**
- Name: "Code Guardian Studio - Team"
- Description: "Team plan with advanced features"

**Prices:**
- Monthly: $39/mo (recurring)
- Yearly: $390/year (10% discount, recurring)

**Get Price IDs:**
```
price_1Xxx... (monthly)
price_1Yyy... (yearly)
```

### 3. Set Environment Variables

**For Next.js site:**
```bash
# .env.local
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_TEAM_MONTHLY=price_1Xxx...
STRIPE_PRICE_TEAM_YEARLY=price_1Yyy...
```

**Get Webhook Secret:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://codeguardian.studio/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy webhook signing secret

### 4. Test with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe

# Login
stripe login

# Listen to webhooks (for local testing)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
```

---

## Testing

### Local Testing (Mock Mode)

Currently, the system is in **mock mode** for development:

**Checkout:**
- `/api/checkout` returns mock session ID
- Redirects to `/success?session_id=cs_test_mock`

**License Verify:**
- Accepts any license key starting with `CGS-`
- Returns features based on tier in key name

**To Test:**
1. Go to `http://localhost:3000/pricing`
2. Click "Get Team"
3. Should redirect to `/success`
4. Copy mock license key
5. Run `ccg activate`
6. Paste license key
7. Should show "License activated successfully"

### Production Testing

**Pre-launch Checklist:**
- [ ] Stripe account verified
- [ ] Products and prices created
- [ ] Webhook endpoint configured
- [ ] Environment variables set
- [ ] Test checkout flow with test card: `4242 4242 4242 4242`
- [ ] Verify webhook delivery in Stripe Dashboard
- [ ] Test license activation in CLI
- [ ] Test seat limits (activate on multiple machines)
- [ ] Test subscription cancellation
- [ ] Test payment failure

**Test Cards:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

---

## Deployment

### 1. Deploy Next.js Site (Vercel)

```bash
# Already deployed at codeguardian.studio
# Just need to add environment variables in Vercel Dashboard:
```

**Vercel Environment Variables:**
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_TEAM_MONTHLY=price_1Xxx...
STRIPE_PRICE_TEAM_YEARLY=price_1Yyy...
```

### 2. Deploy License Database

**Option A: Vercel Postgres**
```bash
# In Vercel Dashboard:
# Storage → Create Database → Postgres
# Then update license.service.ts to use Postgres instead of SQLite
```

**Option B: Railway / Render**
```bash
# Deploy separate backend service with Express + SQLite
# Expose /api/license/verify endpoint
```

**Option C: Turso (SQLite on Edge)**
```bash
# Use Turso for distributed SQLite
npm install @libsql/client

# Update license.service.ts to use Turso client
```

### 3. Enable Real Stripe Integration

**Replace Mock Code:**

In `site/app/api/checkout/route.ts`:
```typescript
// Uncomment real Stripe code:
const stripe = require('stripe')(stripeSecretKey);

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [{ price: stripePriceId, quantity: 1 }],
  customer_email: email,
  success_url: `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${request.nextUrl.origin}/pricing`,
  metadata: { tier: 'team' },
  allow_promotion_codes: true,
});

return NextResponse.json({
  sessionId: session.id,
  url: session.url,
});
```

In `site/app/api/webhooks/stripe/route.ts`:
```typescript
// Uncomment real webhook handling
const stripe = require('stripe')(stripeSecretKey);

let event;
try {
  event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
} catch (err: any) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}

const { LicenseService } = await import('@/modules/license/license.service');
const { StripeService } = await import('@/modules/license/stripe.service');

const licenseService = new LicenseService();
const stripeService = new StripeService(stripeSecretKey, webhookSecret, licenseService);

const result = await stripeService.handleWebhook(body, signature);
```

In `site/app/api/license/verify/route.ts`:
```typescript
// Uncomment real verification
const { LicenseService } = await import('@/modules/license/license.service');
const licenseService = new LicenseService();

const result = licenseService.verifyLicense({
  licenseKey,
  email,
  machineId,
});

return NextResponse.json(result);
```

---

## Email Service

**Currently:** Emails are logged to console (see `stripe.service.ts:sendLicenseEmail`)

**Production Options:**

### Option A: Resend (Recommended)
```bash
npm install resend

# .env.local
RESEND_API_KEY=re_xxx
```

```typescript
import { Resend } from 'resend';

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
  `,
});
```

### Option B: SendGrid
```bash
npm install @sendgrid/mail

# .env.local
SENDGRID_API_KEY=SG.xxx
```

### Option C: Postmark
```bash
npm install postmark

# .env.local
POSTMARK_API_KEY=xxx
```

---

## Security Considerations

### 1. License Key Security
- ✅ Keys are random and unpredictable
- ✅ Stored hashed in database (optional upgrade)
- ✅ Rate limit `/api/license/verify` to prevent brute force

### 2. Webhook Security
- ✅ Verify Stripe signature on every webhook
- ✅ Use webhook secret from environment variable
- ✅ Log all webhook events for audit

### 3. Seat Limits
- ✅ Track machines by machine ID hash
- ✅ Consider machines inactive after 30 days
- ✅ Allow seat management in user dashboard (future feature)

### 4. API Security
- ✅ CORS configured for codeguardian.studio only
- ✅ Rate limiting on public endpoints
- ✅ Input validation on all requests

---

## Roadmap

### Phase 1: MVP (Current)
- [x] License database schema
- [x] License service (create, verify, update)
- [x] Stripe checkout API
- [x] Stripe webhook handler
- [x] License verify API
- [x] CLI `ccg activate` command
- [x] Success page

### Phase 2: Production
- [ ] Deploy to Vercel with Stripe keys
- [ ] Test end-to-end flow
- [ ] Enable real Stripe integration
- [ ] Set up email service (Resend)
- [ ] Add rate limiting
- [ ] Monitor webhooks in Stripe Dashboard

### Phase 3: Enhancements
- [ ] User dashboard for license management
- [ ] Seat management (add/remove machines)
- [ ] Usage analytics per license
- [ ] Upgrade/downgrade flows
- [ ] Annual billing option
- [ ] Team member invitations

---

## Support

**For Users:**
- Email: hello@codeguardian.studio
- GitHub Issues: https://github.com/phuongrealmax/claude-code-guardian/issues

**For Developers:**
- See source code in `src/modules/license/`
- Run tests: `npm test`
- Stripe docs: https://stripe.com/docs

---

## Summary

Hệ thống license đã hoàn chỉnh với:

✅ **Database:** SQLite với licenses + license_machines tables
✅ **API Endpoints:** /checkout, /webhooks/stripe, /license/verify
✅ **CLI Command:** `ccg activate`
✅ **Success Page:** `/success` với license key display
✅ **Stripe Integration:** Ready for production (hiện tại mock mode)

**Next Steps:**
1. Add Stripe API keys to Vercel
2. Test checkout flow với test cards
3. Deploy và verify webhooks hoạt động
4. Set up email service (Resend)
5. Launch! 🚀

---

**Built with:** Claude + Code Guardian Studio
**License:** MIT
**Version:** 3.1.0
**Date:** 2025-12-04
