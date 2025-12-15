// src/modules/guard/index.ts

import { GuardModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { GuardService } from './guard.service.js';
import {
  getGuardTools,
  formatValidationResult,
  formatTestAnalysis,
  formatRulesList,
  MCPTool,
} from './guard.tools.js';
import { ValidateOptions, GuardModuleStatus, RiskClassification, RiskLevel, GuardRuleset } from './guard.types.js';
import { StateManager } from '../../core/state-manager.js';

// ═══════════════════════════════════════════════════════════════
//                      GUARD MODULE CLASS
// ═══════════════════════════════════════════════════════════════

export class GuardModule {
  private service: GuardService;
  private logger: Logger;

  constructor(
    private config: GuardModuleConfig,
    private eventBus: EventBus,
    parentLogger: Logger
  ) {
    this.logger = parentLogger.child('Guard');
    this.service = new GuardService(config, eventBus, this.logger);
  }

  /**
   * Initialize the module
   */
  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  /**
   * Shutdown the module
   */
  async shutdown(): Promise<void> {
    await this.service.shutdown();
  }

  /**
   * Set state manager for evidence persistence (deferred initialization)
   */
  setStateManager(stateManager: StateManager): void {
    this.service.setStateManager(stateManager);
  }

  /**
   * Set current task ID for evidence tagging
   */
  setCurrentTaskId(taskId: string | undefined): void {
    this.service.setCurrentTaskId(taskId);
  }

  /**
   * Get MCP tool definitions
   */
  getTools(): MCPTool[] {
    if (!this.config.enabled) {
      return [];
    }
    return getGuardTools();
  }

  /**
   * Handle MCP tool call
   */
  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.config.enabled) {
      return { error: 'Guard module is disabled' };
    }

    switch (toolName) {
      case 'validate':
        return this.handleValidate(args);

      case 'check_test':
        return this.handleCheckTest(args);

      case 'rules':
        return this.handleListRules();

      case 'toggle_rule':
        return this.handleToggleRule(args);

      case 'status':
        return this.handleStatus();

      default:
        throw new Error(`Unknown guard tool: ${toolName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //                      TOOL HANDLERS
  // ═══════════════════════════════════════════════════════════════

  private async handleValidate(args: Record<string, unknown>): Promise<unknown> {
    const code = args.code as string;
    const filename = args.filename as string;
    const options: ValidateOptions = {
      strict: args.strict as boolean | undefined,
      rules: args.rules as string[] | undefined,
      ruleset: args.ruleset as GuardRuleset | undefined,
      taskId: args.taskId as string | undefined,
      includeSuggestions: true,
    };

    const result = await this.service.validate(code, filename, options);

    // Get the detailed result for additional info
    const detailedResult = this.service.getLastDetailedResult();

    return {
      success: true,
      valid: result.valid,
      blocked: result.blocked,
      issueCount: result.issues.length,
      issues: result.issues,
      suggestions: result.suggestions,
      formatted: formatValidationResult(result),
      // Additional info for Completion Gates
      ruleset: options.ruleset,
      failingRules: detailedResult?.failingRules || [],
    };
  }

  private async handleCheckTest(args: Record<string, unknown>): Promise<unknown> {
    const code = args.code as string;
    const filename = args.filename as string;

    const result = await this.service.checkTest(code, filename);

    return {
      success: true,
      valid: result.valid,
      issueCount: result.issues.length,
      issues: result.issues,
      analysis: result.analysis,
      formatted: formatTestAnalysis(result.analysis),
    };
  }

  private async handleListRules(): Promise<unknown> {
    const rules = this.service.getRules();

    return {
      success: true,
      count: rules.length,
      rules,
      formatted: formatRulesList(rules),
    };
  }

  private async handleToggleRule(args: Record<string, unknown>): Promise<unknown> {
    const ruleName = args.rule as string;
    const enabled = args.enabled as boolean;

    const success = this.service.setRuleEnabled(ruleName, enabled);

    if (!success) {
      return {
        success: false,
        message: `Rule "${ruleName}" not found`,
      };
    }

    return {
      success: true,
      rule: ruleName,
      enabled,
      message: `Rule "${ruleName}" is now ${enabled ? 'enabled' : 'disabled'}`,
    };
  }

  private async handleStatus(): Promise<unknown> {
    const status = this.service.getStatus();

    return {
      success: true,
      ...status,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PUBLIC SERVICE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get module status
   */
  getStatus(): GuardModuleStatus {
    return this.service.getStatus();
  }

  /**
   * Validate code (direct access)
   */
  async validate(code: string, filename: string, options?: ValidateOptions) {
    return this.service.validate(code, filename, options);
  }

  /**
   * Check test file (direct access)
   */
  async checkTest(code: string, filename: string) {
    return this.service.checkTest(code, filename);
  }

  /**
   * Classify risk level of a command or action
   * @param action - The command or action to classify
   * @returns Risk classification result
   */
  classifyRisk(action: string): RiskClassification {
    return this.service.classifyRisk(action);
  }

  /**
   * Batch classify multiple commands
   * @param actions - Array of commands to classify
   * @returns Array of risk classifications
   */
  classifyRiskBatch(actions: string[]): RiskClassification[] {
    return this.service.classifyRiskBatch(actions);
  }

  /**
   * Get highest risk level from batch classification
   * @param classifications - Array of risk classifications
   * @returns Highest risk level found
   */
  getHighestRiskLevel(classifications: RiskClassification[]): RiskLevel {
    return this.service.getHighestRiskLevel(classifications);
  }
}

// ═══════════════════════════════════════════════════════════════
//                      EXPORTS
// ═══════════════════════════════════════════════════════════════

export { GuardService } from './guard.service.js';
export * from './guard.types.js';
export * from './guard.tools.js';
export * from './guard.rulesets.js';

// Export rules
export { FakeTestRule } from './rules/fake-test.rule.js';
export { DisabledFeatureRule } from './rules/disabled-feature.rule.js';
export { EmptyCatchRule } from './rules/empty-catch.rule.js';
export { EmojiCodeRule } from './rules/emoji-code.rule.js';
