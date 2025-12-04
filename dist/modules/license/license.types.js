/**
 * License Module Types
 *
 * Handles license management for Code Guardian Studio
 * - Team and Enterprise licenses
 * - License verification for CLI
 * - Stripe integration
 */
// Feature flags by tier
export const TIER_FEATURES = {
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
//# sourceMappingURL=license.types.js.map