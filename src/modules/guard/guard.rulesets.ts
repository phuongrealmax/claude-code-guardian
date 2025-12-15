// src/modules/guard/guard.rulesets.ts

/**
 * Ruleset definitions for guard validation.
 * Maps ruleset names to arrays of rule names.
 *
 * Usage: guard_validate({ ruleset: "frontend", code, filename })
 */

// ═══════════════════════════════════════════════════════════════
//                      RULESET TYPE
// ═══════════════════════════════════════════════════════════════

export type GuardRuleset = 'frontend' | 'backend' | 'security' | 'testing' | 'default';

// ═══════════════════════════════════════════════════════════════
//                      RULESET MAPPINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Frontend ruleset - rules for React/Vue/Angular components
 * Focuses on component structure, styling patterns, and separation of concerns
 */
export const FRONTEND_RULES: string[] = [
  // Frontend-specific quality rules
  'large-component',
  'inline-styles',
  'mixed-concerns',
  // Security (always include)
  'xss-vulnerability',
  'hardcoded-secrets',
];

/**
 * Backend ruleset - rules for APIs, services, and server code
 * Focuses on security, database safety, and injection prevention
 */
export const BACKEND_RULES: string[] = [
  // Security rules critical for backend
  'sql-injection',
  'command-injection',
  'path-traversal',
  'hardcoded-secrets',
  'prompt-injection',
  // Quality rules
  'empty-catch',
];

/**
 * Security ruleset - all security-focused rules
 * Use for security audits and sensitive code review
 */
export const SECURITY_RULES: string[] = [
  'sql-injection',
  'command-injection',
  'path-traversal',
  'xss-vulnerability',
  'hardcoded-secrets',
  'prompt-injection',
];

/**
 * Testing ruleset - rules for test file quality
 * Ensures tests have proper assertions and aren't fake
 */
export const TESTING_RULES: string[] = [
  'fake-test',
  'disabled-feature',
];

/**
 * Default ruleset - balanced set of rules for general code
 * Used when no specific ruleset is specified
 */
export const DEFAULT_RULES: string[] = [
  // Quality
  'fake-test',
  'disabled-feature',
  'empty-catch',
  'emoji-code',
  // Security (high priority)
  'sql-injection',
  'command-injection',
  'path-traversal',
  'xss-vulnerability',
  'hardcoded-secrets',
  'prompt-injection',
];

// ═══════════════════════════════════════════════════════════════
//                      RULESET REGISTRY
// ═══════════════════════════════════════════════════════════════

/**
 * Registry of all available rulesets
 */
export const RULESET_REGISTRY: Record<GuardRuleset, string[]> = {
  frontend: FRONTEND_RULES,
  backend: BACKEND_RULES,
  security: SECURITY_RULES,
  testing: TESTING_RULES,
  default: DEFAULT_RULES,
};

/**
 * Get rules for a specific ruleset
 * @param ruleset - Name of the ruleset
 * @returns Array of rule names, or default if ruleset not found
 */
export function getRulesForRuleset(ruleset: GuardRuleset | string): string[] {
  const rules = RULESET_REGISTRY[ruleset as GuardRuleset];
  return rules || DEFAULT_RULES;
}

/**
 * Check if a ruleset name is valid
 */
export function isValidRuleset(ruleset: string): ruleset is GuardRuleset {
  return ruleset in RULESET_REGISTRY;
}

/**
 * Get all available ruleset names
 */
export function getAvailableRulesets(): GuardRuleset[] {
  return Object.keys(RULESET_REGISTRY) as GuardRuleset[];
}

/**
 * Get ruleset description for display
 */
export function getRulesetDescription(ruleset: GuardRuleset): string {
  const descriptions: Record<GuardRuleset, string> = {
    frontend: 'Rules for React/Vue/Angular components - focuses on component structure and XSS prevention',
    backend: 'Rules for APIs and server code - focuses on injection prevention and security',
    security: 'All security-focused rules - use for security audits',
    testing: 'Rules for test file quality - ensures tests have proper assertions',
    default: 'Balanced set of quality and security rules for general code',
  };
  return descriptions[ruleset];
}
