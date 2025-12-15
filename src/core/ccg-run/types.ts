// src/core/ccg-run/types.ts
/**
 * CCG Run Types - Single Entrypoint Types
 */

export interface CCGRunInput {
  prompt: string;
  dryRun?: boolean;
  persistReport?: boolean;
  translationMode?: 'auto' | 'pattern' | 'claude' | 'tiny';
  reportDir?: string;
}

export interface FallbackGuidance {
  summary: string;
  suggestedNext: string[];
  examples: string[];
}

export interface CCGRunOutput {
  taskId: string;
  taskStatus: 'completed' | 'pending' | 'blocked' | 'failed';
  supported: boolean;
  reason?: 'NO_MATCHING_PATTERN' | string;
  confidence: number;
  translationSource: 'pattern' | 'claude' | 'tiny';
  validation: ValidationResult;
  execution: ExecutionResult;
  reportPath?: string;
  nextToolCalls?: NextToolCall[];
  error?: string;
  fallbackGuidance?: FallbackGuidance;
}

export interface ValidationResult {
  passed: boolean;
  checks: Array<{
    check: string;
    passed: boolean;
    message?: string;
  }>;
}

export interface ExecutionResult {
  stepsTotal: number;
  stepsCompleted: number;
  stepsFailed: number;
  totalDurationMs: number;
  steps: Array<{
    tool: string;
    success: boolean;
    result?: unknown;
    error?: string;
    durationMs: number;
  }>;
}

export interface NextToolCall {
  tool: string;
  args: Record<string, unknown>;
  reason: string;
}

export interface TranslatedSpec {
  steps: ToolStep[];
  confidence: number;
  source: 'pattern' | 'claude' | 'tiny';
}

export interface ToolStep {
  tool: string;
  args: Record<string, unknown>;
  description?: string;
  optional?: boolean;
}

export type InternalHandler = (args: Record<string, unknown>) => Promise<unknown>;
export type InternalHandlers = Record<string, InternalHandler>;

export interface PromptPattern {
  pattern: RegExp;
  tools: ToolStep[];
  confidence: number;
}

export interface TinyPlannerResponse {
  steps: Array<{
    tool: string;
    args: Record<string, unknown>;
  }>;
  confidence: number;
}

export class ToolHandlerMissingError extends Error {
  constructor(public toolName: string) {
    super(`TOOL_HANDLER_MISSING: No internal handler for tool "${toolName}"`);
    this.name = 'ToolHandlerMissingError';
  }
}
