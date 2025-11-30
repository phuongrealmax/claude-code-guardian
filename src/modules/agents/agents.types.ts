// src/modules/agents/agents.types.ts

/**
 * Agent Module Types
 *
 * Defines types for multi-agent architecture pattern inspired by
 * Claude Enterprise Toolkit.
 */

// ═══════════════════════════════════════════════════════════════
//                      AGENT DEFINITION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Specialized agent definition
 */
export interface Agent {
  /** Unique identifier (e.g., 'trading-agent', 'laravel-agent') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Agent role description */
  role: string;

  /** Areas of expertise */
  specializations: string[];

  /** Core responsibilities */
  responsibilities: string[];

  /** When to delegate to this agent */
  delegationRules: DelegationRule[];

  /** Core principles the agent follows */
  principles?: string[];

  /** Guidelines when modifying code */
  codeGuidelines?: string[];

  /** Feature design approach */
  designGuidelines?: string[];

  /** Source file path (if loaded from file) */
  sourcePath?: string;

  /** Whether agent is enabled */
  enabled: boolean;

  /** Creation timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Rule for when to delegate a task to an agent
 */
export interface DelegationRule {
  /** Rule identifier */
  id: string;

  /** Pattern to match (keywords, file patterns, etc.) */
  pattern: string;

  /** Type of pattern matching */
  matchType: 'keyword' | 'file_pattern' | 'domain' | 'regex';

  /** Priority (higher = more specific) */
  priority: number;

  /** Description of when this rule applies */
  description?: string;
}

/**
 * Agent selection result
 */
export interface AgentSelection {
  /** Selected agent */
  agent: Agent;

  /** Confidence score (0-1) */
  confidence: number;

  /** Matched rules */
  matchedRules: DelegationRule[];

  /** Explanation for selection */
  reason: string;
}

// ═══════════════════════════════════════════════════════════════
//                      MODULE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Agents module configuration
 */
export interface AgentsModuleConfig {
  /** Whether module is enabled */
  enabled: boolean;

  /** Path to AGENTS.md file */
  agentsFilePath: string;

  /** Directory for agent definition files */
  agentsDir: string;

  /** Auto-reload agents when files change */
  autoReload: boolean;

  /** Default agent when no match found */
  defaultAgent?: string;

  /** Enable cross-agent coordination */
  enableCoordination: boolean;
}

/**
 * Module status
 */
export interface AgentsModuleStatus {
  /** Whether module is enabled */
  enabled: boolean;

  /** Total registered agents */
  totalAgents: number;

  /** Active agents */
  activeAgents: string[];

  /** Path to AGENTS.md */
  agentsFilePath: string;

  /** Last reload timestamp */
  lastReload?: Date;

  /** Delegation statistics */
  stats: {
    totalDelegations: number;
    delegationsByAgent: Record<string, number>;
  };
}

// ═══════════════════════════════════════════════════════════════
//                      OPERATION PARAMS
// ═══════════════════════════════════════════════════════════════

/**
 * Parameters for registering an agent
 */
export interface RegisterAgentParams {
  id: string;
  name: string;
  role: string;
  specializations: string[];
  responsibilities: string[];
  delegationRules?: DelegationRule[];
  principles?: string[];
  codeGuidelines?: string[];
  designGuidelines?: string[];
}

/**
 * Parameters for selecting an agent
 */
export interface SelectAgentParams {
  /** Task description */
  task: string;

  /** Files involved (optional) */
  files?: string[];

  /** Keywords to match (optional) */
  keywords?: string[];

  /** Domain context (optional) */
  domain?: string;
}

/**
 * Parameters for coordinating agents
 */
export interface CoordinateAgentsParams {
  /** Task requiring multiple agents */
  task: string;

  /** List of agent IDs to coordinate */
  agentIds: string[];

  /** Coordination mode */
  mode: 'sequential' | 'parallel' | 'review';
}

/**
 * Coordination result
 */
export interface CoordinationResult {
  /** Task ID */
  taskId: string;

  /** Participating agents */
  agents: Agent[];

  /** Coordination plan */
  plan: CoordinationStep[];

  /** Status */
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Single step in coordination
 */
export interface CoordinationStep {
  /** Step number */
  order: number;

  /** Agent responsible */
  agentId: string;

  /** Action to perform */
  action: string;

  /** Dependencies on other steps */
  dependsOn?: number[];

  /** Expected output */
  expectedOutput?: string;
}

// ═══════════════════════════════════════════════════════════════
//                      AGENTS.MD PARSING
// ═══════════════════════════════════════════════════════════════

/**
 * Parsed AGENTS.md structure
 */
export interface ParsedAgentsFile {
  /** File path */
  path: string;

  /** Parsed agents */
  agents: ParsedAgentSection[];

  /** Parse errors */
  errors: string[];

  /** Parse timestamp */
  parsedAt: Date;
}

/**
 * Parsed agent section from AGENTS.md
 */
export interface ParsedAgentSection {
  /** Agent name from header */
  name: string;

  /** Agent ID (derived from name) */
  id: string;

  /** Raw responsibilities list */
  responsibilities: string[];

  /** Raw delegation rules */
  delegationRules: string[];

  /** Start line in file */
  startLine: number;

  /** End line in file */
  endLine: number;
}

/**
 * Agent definition file (.claude/agents/*.md)
 */
export interface AgentDefinitionFile {
  /** File path */
  path: string;

  /** Agent ID */
  agentId: string;

  /** Parsed content */
  content: {
    role?: string;
    specializations?: string[];
    principles?: string[];
    guidelines?: string[];
  };

  /** Raw markdown */
  rawContent: string;
}
