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
  RiskLevel,
  RiskClassification,
  RiskCategory,
  RiskPattern,
  DetailedGuardResult,
  getRulesForRuleset,
} from './guard.types.js';
import { GuardEvidence } from '../../core/completion-gates.js';
import { StateManager } from '../../core/state-manager.js';
import { v4 as uuid } from 'uuid';

// Import rules - Quality
import { FakeTestRule } from './rules/fake-test.rule.js';
import { DisabledFeatureRule } from './rules/disabled-feature.rule.js';
import { EmptyCatchRule } from './rules/empty-catch.rule.js';
import { EmojiCodeRule } from './rules/emoji-code.rule.js';

// Import rules - Frontend Quality
import { LargeComponentRule } from './rules/large-component.rule.js';
import { InlineStylesRule } from './rules/inline-styles.rule.js';
import { MixedConcernsRule } from './rules/mixed-concerns.rule.js';

// Import rules - Security (OWASP Top 10)
import { SqlInjectionRule } from './rules/sql-injection.rule.js';
import { HardcodedSecretsRule } from './rules/hardcoded-secrets.rule.js';
import { XssVulnerabilityRule } from './rules/xss-vulnerability.rule.js';
import { CommandInjectionRule } from './rules/command-injection.rule.js';
import { PathTraversalRule } from './rules/path-traversal.rule.js';

// Import rules - AI/LLM Security
import { PromptInjectionRule } from './rules/prompt-injection.rule.js';

// Import dynamic rule for custom configs
import { DynamicRule } from './rules/dynamic.rule.js';

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

  // Per-rule stats tracking
  private ruleStats: Map<string, number> = new Map();

  // StateManager for evidence persistence
  private stateManager?: StateManager;
  private currentTaskId?: string;

  // Last detailed result for retrieval
  private lastDetailedResult?: DetailedGuardResult;

  constructor(
    private config: GuardModuleConfig,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  /**
   * Set state manager for evidence persistence (deferred initialization)
   */
  setStateManager(stateManager: StateManager): void {
    this.stateManager = stateManager;
  }

  /**
   * Set current task ID for evidence tagging
   */
  setCurrentTaskId(taskId: string | undefined): void {
    this.currentTaskId = taskId;
  }

  /**
   * Get last detailed validation result
   */
  getLastDetailedResult(): DetailedGuardResult | undefined {
    return this.lastDetailedResult;
  }

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

    if (this.config.rules.blockXss !== false) {
      this.rules.push(new XssVulnerabilityRule());
    }

    if (this.config.rules.blockCommandInjection !== false) {
      this.rules.push(new CommandInjectionRule());
    }

    if (this.config.rules.blockPathTraversal !== false) {
      this.rules.push(new PathTraversalRule());
    }

    if (this.config.rules.blockPromptInjection !== false) {
      this.rules.push(new PromptInjectionRule());
    }

    // Frontend quality rules (disabled by default)
    if (this.config.rules.blockLargeComponents) {
      this.rules.push(new LargeComponentRule());
    }

    if (this.config.rules.blockInlineStyles) {
      this.rules.push(new InlineStylesRule());
    }

    if (this.config.rules.blockMixedConcerns) {
      this.rules.push(new MixedConcernsRule());
    }

    // Load custom rules from config
    if (this.config.rules.customRules && this.config.rules.customRules.length > 0) {
      for (const customRule of this.config.rules.customRules) {
        try {
          const dynamicRule = new DynamicRule(customRule);
          if (dynamicRule.enabled) {
            this.rules.push(dynamicRule);
            this.logger.debug(`Loaded custom rule: ${customRule.name}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to load custom rule: ${customRule.name}`, error);
        }
      }
    }

    // Initialize per-rule stats
    for (const rule of this.rules) {
      this.ruleStats.set(rule.name, 0);
    }

    this.initialized = true;
    this.logger.info(`Guard module initialized with ${this.rules.length} rules (${this.config.rules.customRules?.length || 0} custom)`);
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
    const runId = uuid();
    const issues: ValidationIssue[] = [];

    // Determine which rules to run
    let rulesToRun = this.rules.filter(r => r.enabled);

    // Apply ruleset filter if specified (takes precedence over individual rules)
    if (options.ruleset) {
      const rulesetRules = getRulesForRuleset(options.ruleset);
      rulesToRun = rulesToRun.filter(r => rulesetRules.includes(r.name));
      this.logger.debug(`Using ruleset "${options.ruleset}" with ${rulesToRun.length} rules`);
    } else if (options.rules && options.rules.length > 0) {
      // Fall back to individual rule selection
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

        // Track per-rule stats
        if (ruleIssues.length > 0) {
          const currentCount = this.ruleStats.get(rule.name) || 0;
          this.ruleStats.set(rule.name, currentCount + ruleIssues.length);
        }
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
      // Emit detailed block event for auto-recall
      this.eventBus.emit({
        type: 'guard:block',
        timestamp: new Date(),
        data: {
          filename,
          issueCount: blockingIssues.length,
          // NEW: Detailed info for auto-recall
          rules: blockingIssues.map(i => i.rule),
          reasons: blockingIssues.map(i => i.message),
          codeSnippet: code.substring(0, 500), // First 500 chars for context
          firstIssue: blockingIssues[0] ? {
            rule: blockingIssues[0].rule,
            message: blockingIssues[0].message,
            line: blockingIssues[0].location?.line,
            suggestion: blockingIssues[0].suggestion,
          } : null,
        },
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

    // Build detailed result for internal tracking
    const taskId = options.taskId || this.currentTaskId;
    const detailedResult = this.buildDetailedResult(runId, filename, issues, blocked, options.ruleset, taskId);
    this.lastDetailedResult = detailedResult;

    // Persist evidence to StateManager (using completion-gates format)
    if (this.stateManager) {
      this.persistGuardEvidence(detailedResult);
    }

    return {
      valid: !blocked,
      issues,
      blocked,
      suggestions,
    };
  }

  /**
   * Build detailed result from validation
   */
  private buildDetailedResult(
    runId: string,
    filename: string,
    issues: ValidationIssue[],
    blocked: boolean,
    ruleset?: string,
    taskId?: string
  ): DetailedGuardResult {
    const blockingIssues = issues.filter(i => i.severity === 'block' || i.severity === 'error');
    const failingRules = [...new Set(blockingIssues.map(i => i.rule))];

    return {
      runId,
      timestamp: new Date().toISOString(),
      filename,
      ruleset,
      passed: !blocked && blockingIssues.length === 0,
      blocked,
      issueCount: issues.length,
      failingRules,
      topIssues: issues.slice(0, 5).map(i => ({
        rule: i.rule,
        severity: i.severity,
        message: i.message,
        line: i.location?.line,
      })),
      taskId,
    };
  }

  /**
   * Persist guard evidence to StateManager (converts to completion-gates format)
   */
  private persistGuardEvidence(detailedResult: DetailedGuardResult): void {
    if (!this.stateManager) return;

    try {
      // Convert to GuardEvidence format expected by StateManager
      const evidence: GuardEvidence = {
        timestamp: detailedResult.timestamp,
        status: detailedResult.passed ? 'passed' : 'failed',
        reportId: detailedResult.runId,
        failingRules: detailedResult.failingRules.slice(0, 10), // Cap to 10
        taskId: detailedResult.taskId,
      };

      this.stateManager.setGuardEvidence(evidence);
      this.logger.debug(`Guard evidence persisted (status: ${evidence.status})`);
    } catch (error) {
      this.logger.warn('Failed to persist guard evidence:', error);
    }
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
      issuesFound: this.ruleStats.get(r.name) || 0,
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
  //                      RISK CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Risk patterns for command classification
   * Ordered by severity - first match wins
   */
  private static readonly RISK_PATTERNS: RiskPattern[] = [
    // ─────────────────────────────────────────────────────────────
    // BLOCK Level - Extremely dangerous, should be blocked
    // ─────────────────────────────────────────────────────────────
    {
      pattern: /rm\s+(-[a-z]*f[a-z]*\s+)?(-[a-z]*r[a-z]*\s+)?[\/\\]($|\s|"|')/i,
      level: 'BLOCK',
      category: 'filesystem',
      description: 'Recursive delete of root directory',
    },
    {
      pattern: /rm\s+-rf\s+\//i,
      level: 'BLOCK',
      category: 'filesystem',
      description: 'Recursive force delete of root',
    },
    {
      pattern: /:(){ :|:& };:/,
      level: 'BLOCK',
      category: 'shell',
      description: 'Fork bomb detected',
    },
    {
      pattern: />\s*\/dev\/sd[a-z]/i,
      level: 'BLOCK',
      category: 'filesystem',
      description: 'Direct disk write',
    },
    {
      pattern: /mkfs(\.[a-z0-9]+)?\s+/i,
      level: 'BLOCK',
      category: 'filesystem',
      description: 'Filesystem format command',
    },
    {
      pattern: /dd\s+.*of=\/dev\/(sd|hd|nvme)/i,
      level: 'BLOCK',
      category: 'filesystem',
      description: 'Direct disk overwrite with dd',
    },

    // ─────────────────────────────────────────────────────────────
    // HIGH Level - Destructive, needs checkpoint
    // ─────────────────────────────────────────────────────────────
    // Git destructive operations
    {
      pattern: /git\s+(push\s+.*--force|push\s+-f\b)/i,
      level: 'HIGH',
      category: 'git',
      description: 'Git force push (may overwrite remote history)',
    },
    {
      pattern: /git\s+reset\s+--hard/i,
      level: 'HIGH',
      category: 'git',
      description: 'Git hard reset (discards uncommitted changes)',
    },
    {
      pattern: /git\s+clean\s+-[a-z]*f[a-z]*d/i,
      level: 'HIGH',
      category: 'git',
      description: 'Git clean with force and directories',
    },
    {
      pattern: /git\s+rebase\s+--onto/i,
      level: 'HIGH',
      category: 'git',
      description: 'Git rebase onto (history rewrite)',
    },
    {
      pattern: /git\s+filter-branch/i,
      level: 'HIGH',
      category: 'git',
      description: 'Git filter-branch (history rewrite)',
    },
    {
      pattern: /git\s+reflog\s+expire/i,
      level: 'HIGH',
      category: 'git',
      description: 'Git reflog expire (removes recovery points)',
    },
    // Filesystem destructive operations
    {
      pattern: /rm\s+-rf\s+/i,
      level: 'HIGH',
      category: 'filesystem',
      description: 'Recursive force delete',
    },
    {
      pattern: /rm\s+-r\s+/i,
      level: 'HIGH',
      category: 'filesystem',
      description: 'Recursive delete',
    },
    {
      pattern: /rmdir\s+\/s\s+\/q/i,
      level: 'HIGH',
      category: 'filesystem',
      description: 'Windows recursive quiet delete',
    },
    {
      pattern: /del\s+\/s\s+\/q/i,
      level: 'HIGH',
      category: 'filesystem',
      description: 'Windows recursive quiet delete',
    },
    {
      pattern: /rd\s+\/s\s+\/q/i,
      level: 'HIGH',
      category: 'filesystem',
      description: 'Windows recursive quiet delete (rd)',
    },
    // Database destructive
    {
      pattern: /DROP\s+(DATABASE|TABLE|SCHEMA)/i,
      level: 'HIGH',
      category: 'database',
      description: 'SQL DROP command',
    },
    {
      pattern: /TRUNCATE\s+TABLE/i,
      level: 'HIGH',
      category: 'database',
      description: 'SQL TRUNCATE command',
    },
    {
      pattern: /DELETE\s+FROM\s+\w+\s*;?\s*$/i,
      level: 'HIGH',
      category: 'database',
      description: 'SQL DELETE without WHERE clause',
    },
    // Process management
    {
      pattern: /kill\s+-9\s+/i,
      level: 'HIGH',
      category: 'process',
      description: 'Force kill process',
    },
    {
      pattern: /pkill\s+-9\s+/i,
      level: 'HIGH',
      category: 'process',
      description: 'Force kill processes by name',
    },
    {
      pattern: /killall\s+-9\s+/i,
      level: 'HIGH',
      category: 'process',
      description: 'Force kill all processes by name',
    },
    // Environment
    {
      pattern: /export\s+PATH=/i,
      level: 'HIGH',
      category: 'environment',
      description: 'Modifying PATH environment variable',
    },
    {
      pattern: /unset\s+(PATH|HOME|USER)/i,
      level: 'HIGH',
      category: 'environment',
      description: 'Unsetting critical environment variable',
    },

    // ─────────────────────────────────────────────────────────────
    // MEDIUM Level - Significant changes, consider checkpoint
    // ─────────────────────────────────────────────────────────────
    // Git operations
    {
      pattern: /git\s+merge\s+/i,
      level: 'MEDIUM',
      category: 'git',
      description: 'Git merge',
    },
    {
      pattern: /git\s+rebase\s+/i,
      level: 'MEDIUM',
      category: 'git',
      description: 'Git rebase',
    },
    {
      pattern: /git\s+cherry-pick/i,
      level: 'MEDIUM',
      category: 'git',
      description: 'Git cherry-pick',
    },
    {
      pattern: /git\s+reset\s+(--soft|--mixed|HEAD)/i,
      level: 'MEDIUM',
      category: 'git',
      description: 'Git soft/mixed reset',
    },
    {
      pattern: /git\s+stash\s+(drop|clear)/i,
      level: 'MEDIUM',
      category: 'git',
      description: 'Git stash drop/clear',
    },
    {
      pattern: /git\s+branch\s+-[dD]\s+/i,
      level: 'MEDIUM',
      category: 'git',
      description: 'Git branch delete',
    },
    // Filesystem
    {
      pattern: /mv\s+.*\s+/i,
      level: 'MEDIUM',
      category: 'filesystem',
      description: 'File move operation',
    },
    {
      pattern: /cp\s+-r\s+/i,
      level: 'MEDIUM',
      category: 'filesystem',
      description: 'Recursive copy',
    },
    {
      pattern: /chmod\s+-R\s+/i,
      level: 'MEDIUM',
      category: 'filesystem',
      description: 'Recursive permission change',
    },
    {
      pattern: /chown\s+-R\s+/i,
      level: 'MEDIUM',
      category: 'filesystem',
      description: 'Recursive ownership change',
    },
    // Database
    {
      pattern: /UPDATE\s+\w+\s+SET\s+.*WHERE/i,
      level: 'MEDIUM',
      category: 'database',
      description: 'SQL UPDATE command',
    },
    {
      pattern: /ALTER\s+TABLE/i,
      level: 'MEDIUM',
      category: 'database',
      description: 'SQL ALTER TABLE command',
    },
    // Package management
    {
      pattern: /npm\s+(uninstall|remove)\s+/i,
      level: 'MEDIUM',
      category: 'shell',
      description: 'NPM package removal',
    },
    {
      pattern: /pip\s+uninstall\s+/i,
      level: 'MEDIUM',
      category: 'shell',
      description: 'Python package removal',
    },
    // Network
    {
      pattern: /curl\s+.*\|\s*(sh|bash)/i,
      level: 'MEDIUM',
      category: 'network',
      description: 'Piping remote content to shell',
    },
    {
      pattern: /wget\s+.*\|\s*(sh|bash)/i,
      level: 'MEDIUM',
      category: 'network',
      description: 'Piping remote content to shell',
    },

    // ─────────────────────────────────────────────────────────────
    // LOW Level - Safe operations
    // ─────────────────────────────────────────────────────────────
    {
      pattern: /git\s+(status|log|diff|show|branch|tag)/i,
      level: 'LOW',
      category: 'git',
      description: 'Git read-only command',
    },
    {
      pattern: /git\s+(add|commit|push(?!\s+.*-f))/i,
      level: 'LOW',
      category: 'git',
      description: 'Git normal workflow command',
    },
    {
      pattern: /ls\s+/i,
      level: 'LOW',
      category: 'filesystem',
      description: 'List directory contents',
    },
    {
      pattern: /cat\s+/i,
      level: 'LOW',
      category: 'filesystem',
      description: 'View file contents',
    },
    {
      pattern: /head\s+/i,
      level: 'LOW',
      category: 'filesystem',
      description: 'View file head',
    },
    {
      pattern: /tail\s+/i,
      level: 'LOW',
      category: 'filesystem',
      description: 'View file tail',
    },
    {
      pattern: /grep\s+/i,
      level: 'LOW',
      category: 'filesystem',
      description: 'Search file contents',
    },
    {
      pattern: /find\s+/i,
      level: 'LOW',
      category: 'filesystem',
      description: 'Find files',
    },
    {
      pattern: /pwd$/i,
      level: 'LOW',
      category: 'filesystem',
      description: 'Print working directory',
    },
    {
      pattern: /echo\s+/i,
      level: 'LOW',
      category: 'shell',
      description: 'Echo command',
    },
    {
      pattern: /SELECT\s+/i,
      level: 'LOW',
      category: 'database',
      description: 'SQL SELECT query',
    },
  ];

  /**
   * Classify risk level of a command or action
   * @param action - The command or action to classify
   * @returns Risk classification result
   */
  classifyRisk(action: string): RiskClassification {
    if (!action || typeof action !== 'string') {
      return {
        level: 'LOW',
        reason: 'Empty or invalid action',
        category: 'unknown',
        shouldCheckpoint: false,
      };
    }

    const normalizedAction = action.trim();

    // Check against all patterns
    for (const pattern of GuardService.RISK_PATTERNS) {
      const regex = pattern.pattern instanceof RegExp
        ? pattern.pattern
        : new RegExp(pattern.pattern, 'i');

      if (regex.test(normalizedAction)) {
        const shouldCheckpoint = pattern.level === 'HIGH' || pattern.level === 'BLOCK';

        this.logger.debug(`Risk classified: ${pattern.level} - ${pattern.description}`);

        // Emit event for HIGH and BLOCK levels
        if (shouldCheckpoint) {
          this.eventBus.emit({
            type: 'guard:warning',
            timestamp: new Date(),
            data: {
              riskLevel: pattern.level,
              category: pattern.category,
              reason: pattern.description,
              action: normalizedAction.substring(0, 200), // Limit length
            },
            source: 'GuardService.classifyRisk',
          });
        }

        return {
          level: pattern.level,
          reason: pattern.description,
          category: pattern.category,
          matchedPattern: regex.source,
          shouldCheckpoint,
          metadata: {
            patternIndex: GuardService.RISK_PATTERNS.indexOf(pattern),
          },
        };
      }
    }

    // Default: unknown action is LOW risk
    return {
      level: 'LOW',
      reason: 'No matching risk pattern',
      category: 'unknown',
      shouldCheckpoint: false,
    };
  }

  /**
   * Batch classify multiple commands
   * @param actions - Array of commands to classify
   * @returns Array of risk classifications
   */
  classifyRiskBatch(actions: string[]): RiskClassification[] {
    return actions.map(action => this.classifyRisk(action));
  }

  /**
   * Get highest risk level from batch classification
   * @param classifications - Array of risk classifications
   * @returns Highest risk level found
   */
  getHighestRiskLevel(classifications: RiskClassification[]): RiskLevel {
    const levels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'BLOCK'];
    let maxIndex = 0;

    for (const c of classifications) {
      const index = levels.indexOf(c.level);
      if (index > maxIndex) {
        maxIndex = index;
      }
    }

    return levels[maxIndex];
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
