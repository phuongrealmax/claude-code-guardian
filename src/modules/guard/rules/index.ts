// src/modules/guard/rules/index.ts

/**
 * Guard Rules Index
 *
 * All built-in validation rules for the Guard module.
 */

// Quality Rules
export { FakeTestRule } from './fake-test.rule.js';
export { DisabledFeatureRule } from './disabled-feature.rule.js';
export { EmptyCatchRule } from './empty-catch.rule.js';
export { EmojiCodeRule } from './emoji-code.rule.js';

// Frontend Quality Rules
export { LargeComponentRule } from './large-component.rule.js';
export { InlineStylesRule } from './inline-styles.rule.js';
export { MixedConcernsRule } from './mixed-concerns.rule.js';

// Security Rules - OWASP Top 10
export { SqlInjectionRule } from './sql-injection.rule.js';
export { HardcodedSecretsRule } from './hardcoded-secrets.rule.js';
export { XssVulnerabilityRule } from './xss-vulnerability.rule.js';
export { CommandInjectionRule } from './command-injection.rule.js';
export { PathTraversalRule } from './path-traversal.rule.js';

// AI/LLM Security Rules
export { PromptInjectionRule } from './prompt-injection.rule.js';

// Re-export rule interface
export type { IGuardRule, RuleCategory } from '../guard.types.js';
