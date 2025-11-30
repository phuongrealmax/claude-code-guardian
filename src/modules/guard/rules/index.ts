// src/modules/guard/rules/index.ts

/**
 * Guard Rules Index
 *
 * All built-in validation rules for the Guard module.
 */

export { FakeTestRule } from './fake-test.rule.js';
export { DisabledFeatureRule } from './disabled-feature.rule.js';
export { EmptyCatchRule } from './empty-catch.rule.js';
export { EmojiCodeRule } from './emoji-code.rule.js';
export { SqlInjectionRule } from './sql-injection.rule.js';
export { HardcodedSecretsRule } from './hardcoded-secrets.rule.js';

// Re-export rule interface
export type { IGuardRule, RuleCategory } from '../guard.types.js';
