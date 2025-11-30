// src/modules/guard/guard.service.ts

import {
  ValidationResult,
  ValidationIssue,
  GuardModuleConfig,
} from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import {
  IGuardRule,
  ValidateOptions,
  TestAnalysis,
  GuardModuleStatus,
  RuleStatus,
} from './guard.types.js';

// Import rules
import { FakeTestRule } from './rules/fake-test.rule.js';
import { DisabledFeatureRule } from './rules/disabled-feature.rule.js';
import { EmptyCatchRule } from './rules/empty-catch.rule.js';
import { EmojiCodeRule } from './rules/emoji-code.rule.js';
import { SqlInjectionRule } from './rules/sql-injection.rule.js';
import { HardcodedSecretsRule } from './rules/hardcoded-secrets.rule.js';

// ═══════════════════════════════════════════════════════════════
//                      GUARD SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

export class GuardService {
  private rules: IGuardRule[] = [];
  private initialized: boolean = false;

  // Stats
  private validationsRun: number = 0;
  private totalIssuesFound: number = 0;
  private blockedCount: number = 0;

  constructor(
    private config: GuardModuleConfig,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  /**
   * Initialize the guard service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('Guard module disabled');
      return;
    }

    if (this.initialized) {
      this.logger.warn('Guard service already initialized');
      return;
    }

    // Initialize built-in rules based on config
    if (this.config.rules.blockFakeTests) {
      this.rules.push(new FakeTestRule());
    }

    if (this.config.rules.blockDisabledFeatures) {
      this.rules.push(new DisabledFeatureRule());
    }

    if (this.config.rules.blockEmptyCatch) {
      this.rules.push(new EmptyCatchRule());
    }

    if (this.config.rules.blockEmojiInCode) {
      this.rules.push(new EmojiCodeRule());
    }

    // Security rules - enabled by default
    if (this.config.rules.blockSqlInjection !== false) {
      this.rules.push(new SqlInjectionRule());
    }

    if (this.config.rules.blockHardcodedSecrets !== false) {
      this.rules.push(new HardcodedSecretsRule());
    }

    // TODO: Load custom rules from config.rules.customRules

    this.initialized = true;
    this.logger.info(`Guard module initialized with ${this.rules.length} rules`);
  }

  /**
   * Shutdown the guard service
   */
  async shutdown(): Promise<void> {
    this.initialized = false;
    this.logger.info('Guard service shutdown');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PUBLIC METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate code against all enabled rules
   */
  async validate(
    code: string,
    filename: string,
    options: ValidateOptions = {}
  ): Promise<ValidationResult> {
    if (!this.config.enabled) {
      return { valid: true, issues: [], blocked: false, suggestions: [] };
    }

    this.validationsRun++;
    const issues: ValidationIssue[] = [];

    // Determine which rules to run
    let rulesToRun = this.rules.filter(r => r.enabled);

    if (options.rules && options.rules.length > 0) {
      rulesToRun = rulesToRun.filter(r => options.rules!.includes(r.name));
    }

    if (options.skipRules && options.skipRules.length > 0) {
      rulesToRun = rulesToRun.filter(r => !options.skipRules!.includes(r.name));
    }

    // Run each rule
    for (const rule of rulesToRun) {
      try {
        const ruleIssues = rule.validate(code, filename);
        issues.push(...ruleIssues);
      } catch (error) {
        this.logger.error(`Rule ${rule.name} failed:`, error);
      }
    }

    // Update stats
    this.totalIssuesFound += issues.length;

    // Determine if should block
    const blockingIssues = issues.filter(i => i.severity === 'block');
    const blocked = Boolean((this.config.strictMode || options.strict) && blockingIssues.length > 0);

    if (blocked) {
      this.blockedCount++;
      this.eventBus.emit({
        type: 'guard:block',
        timestamp: new Date(),
        data: { filename, issueCount: blockingIssues.length },
        source: 'GuardService',
      });
    } else if (issues.length > 0) {
      this.eventBus.emit({
        type: 'guard:warning',
        timestamp: new Date(),
        data: { filename, issueCount: issues.length },
        source: 'GuardService',
      });
    } else {
      this.eventBus.emit({
        type: 'guard:pass',
        timestamp: new Date(),
        data: { filename },
        source: 'GuardService',
      });
    }

    // Generate suggestions
    const suggestions = this.generateSuggestions(issues, options.includeSuggestions);

    return {
      valid: !blocked,
      issues,
      blocked,
      suggestions,
    };
  }

  /**
   * Check a test file for common issues
   */
  async checkTest(code: string, filename: string): Promise<{
    valid: boolean;
    issues: ValidationIssue[];
    analysis: TestAnalysis;
  }> {
    const fakeTestRule = this.rules.find(r => r.name === 'fake-test') as FakeTestRule | undefined;

    if (!fakeTestRule) {
      return {
        valid: true,
        issues: [],
        analysis: {
          hasAssertions: true,
          assertionCount: 0,
          testCount: 0,
          suspiciousTests: [],
          skippedTests: [],
        },
      };
    }

    const issues = fakeTestRule.validate(code, filename);
    const analysis = fakeTestRule.analyzeTestFile(code);

    return {
      valid: issues.filter(i => i.severity === 'block').length === 0,
      issues,
      analysis,
    };
  }

  /**
   * Get list of available rules
   */
  getRules(): RuleStatus[] {
    return this.rules.map(r => ({
      name: r.name,
      enabled: r.enabled,
      category: r.category,
      issuesFound: 0, // TODO: Track per-rule stats
    }));
  }

  /**
   * Enable/disable a specific rule
   */
  setRuleEnabled(ruleName: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.name === ruleName);
    if (!rule) {
      return false;
    }

    rule.enabled = enabled;
    this.logger.info(`Rule ${ruleName} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Get module status
   */
  getStatus(): GuardModuleStatus {
    return {
      enabled: this.config.enabled,
      strictMode: this.config.strictMode,
      rules: this.getRules(),
      stats: {
        validationsRun: this.validationsRun,
        issuesFound: this.totalIssuesFound,
        blockedCount: this.blockedCount,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private generateSuggestions(
    issues: ValidationIssue[],
    include: boolean = true
  ): string[] {
    if (!include) return [];

    const suggestions: string[] = [];

    for (const issue of issues) {
      if (issue.suggestion) {
        suggestions.push(issue.suggestion);
      }
    }

    // Deduplicate
    return [...new Set(suggestions)];
  }
}
