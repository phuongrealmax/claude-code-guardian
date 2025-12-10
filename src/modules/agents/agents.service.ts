// src/modules/agents/agents.service.ts

import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { AgentsParser } from './agents-parser.js';
import { BUILTIN_AGENTS } from './agents-builtin.js';
import {
  Agent,
  AgentsModuleConfig,
  AgentsModuleStatus,
  AgentSelection,
  RegisterAgentParams,
  SelectAgentParams,
  CoordinateAgentsParams,
  CoordinationResult,
  CoordinationStep,
  DelegationRule,
  ParsedAgentsFile,
} from './agents.types.js';

// ═══════════════════════════════════════════════════════════════
//                      AGENTS SERVICE
// ═══════════════════════════════════════════════════════════════

export class AgentsService {
  private agents: Map<string, Agent> = new Map();
  private delegationStats: Map<string, number> = new Map();
  private lastReload?: Date;
  private parser: AgentsParser;

  constructor(
    private config: AgentsModuleConfig,
    private eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string
  ) {
    this.parser = new AgentsParser(
      projectRoot,
      config.agentsFilePath,
      config.agentsDir,
      logger
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //                      LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  async initialize(): Promise<void> {
    this.logger.info('Initializing Agents service');

    // Load agents from AGENTS.md
    const agentsFile = await this.parser.loadAgentsFile();
    if (agentsFile) {
      for (const section of agentsFile.agents) {
        this.register({
          id: section.id,
          name: section.name,
          role: `${section.name} Specialist`,
          specializations: this.extractSpecializations(section.responsibilities),
          responsibilities: section.responsibilities,
          delegationRules: this.parseRulesToDelegation(section.delegationRules),
        });
      }
      this.logger.info(`Loaded ${agentsFile.agents.length} agents from AGENTS.md`);
    }

    // Load agent definitions from .claude/agents/
    const definitions = await this.parser.loadAgentDefinitions();
    for (const definition of definitions) {
      const existing = this.agents.get(definition.agentId);
      if (existing) {
        this.update(definition.agentId, {
          role: definition.content.role || existing.role,
          principles: definition.content.principles,
          codeGuidelines: definition.content.guidelines,
        });
      } else {
        this.register({
          id: definition.agentId,
          name: this.parser.idToName(definition.agentId),
          role: definition.content.role || `${this.parser.idToName(definition.agentId)} Specialist`,
          specializations: definition.content.specializations || [],
          responsibilities: [],
          principles: definition.content.principles,
          codeGuidelines: definition.content.guidelines,
        });
      }
    }
    if (definitions.length > 0) {
      this.logger.info(`Loaded ${definitions.length} agent definitions`);
    }

    // Register built-in agents if none loaded
    if (this.agents.size === 0) {
      this.registerBuiltInAgents();
    }

    this.lastReload = new Date();
    this.logger.info(`Agents service initialized with ${this.agents.size} agents`);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Agents service');
    this.agents.clear();
    this.delegationStats.clear();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      AGENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Register a new agent
   */
  register(params: RegisterAgentParams): Agent {
    const now = new Date();
    const agent: Agent = {
      id: params.id,
      name: params.name,
      role: params.role,
      specializations: params.specializations,
      responsibilities: params.responsibilities,
      delegationRules: params.delegationRules || [],
      principles: params.principles,
      codeGuidelines: params.codeGuidelines,
      designGuidelines: params.designGuidelines,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    this.agents.set(agent.id, agent);
    this.delegationStats.set(agent.id, 0);

    this.eventBus.emit({ type: 'agent:registered', timestamp: new Date(), data: { agent } });
    this.logger.debug(`Registered agent: ${agent.id}`);

    return agent;
  }

  /**
   * Get agent by ID
   */
  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Update agent
   */
  update(id: string, updates: Partial<RegisterAgentParams>): Agent | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const updated: Agent = {
      ...agent,
      ...updates,
      updatedAt: new Date(),
    };

    this.agents.set(id, updated);
    this.eventBus.emit({ type: 'agent:updated', timestamp: new Date(), data: { agent: updated } });

    return updated;
  }

  /**
   * Remove agent
   */
  remove(id: string): boolean {
    const removed = this.agents.delete(id);
    if (removed) {
      this.delegationStats.delete(id);
      this.eventBus.emit({ type: 'agent:removed', timestamp: new Date(), data: { agentId: id } });
    }
    return removed;
  }

  /**
   * Enable/disable agent
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.enabled = enabled;
    agent.updatedAt = new Date();
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      AGENT SELECTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Select the best agent for a task
   */
  selectAgent(params: SelectAgentParams): AgentSelection | null {
    const enabledAgents = this.getAll().filter(a => a.enabled);
    if (enabledAgents.length === 0) return null;

    const scores: Array<{ agent: Agent; score: number; rules: DelegationRule[] }> = [];

    for (const agent of enabledAgents) {
      const { score, matchedRules } = this.calculateAgentScore(agent, params);
      if (score > 0) {
        scores.push({ agent, score, rules: matchedRules });
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      // Return default agent if configured
      if (this.config.defaultAgent) {
        const defaultAgent = this.agents.get(this.config.defaultAgent);
        if (defaultAgent) {
          return {
            agent: defaultAgent,
            confidence: 0.3,
            matchedRules: [],
            reason: 'Default agent selected (no specific match)',
          };
        }
      }
      return null;
    }

    const best = scores[0];
    const confidence = Math.min(best.score / 100, 1);

    // Update stats
    const current = this.delegationStats.get(best.agent.id) || 0;
    this.delegationStats.set(best.agent.id, current + 1);

    this.eventBus.emit({
      type: 'agent:selected',
      timestamp: new Date(),
      data: { agent: best.agent, task: params.task, confidence },
    });

    return {
      agent: best.agent,
      confidence,
      matchedRules: best.rules,
      reason: this.generateSelectionReason(best.agent, best.rules, params),
    };
  }

  /**
   * Calculate match score for an agent
   */
  private calculateAgentScore(
    agent: Agent,
    params: SelectAgentParams
  ): { score: number; matchedRules: DelegationRule[] } {
    const taskLower = params.task.toLowerCase();
    const matchedRules: DelegationRule[] = [];

    const score =
      this.scoreBySpecializations(agent, taskLower) +
      this.scoreByResponsibilities(agent, taskLower) +
      this.scoreByDelegationRules(agent, params, matchedRules) +
      this.scoreByFiles(agent, params.files) +
      this.scoreByKeywords(agent, params.keywords) +
      this.scoreByDomain(agent, params.domain);

    return { score, matchedRules };
  }

  private scoreBySpecializations(agent: Agent, taskLower: string): number {
    return agent.specializations.filter(s => taskLower.includes(s.toLowerCase())).length * 20;
  }

  private scoreByResponsibilities(agent: Agent, taskLower: string): number {
    let score = 0;
    for (const resp of agent.responsibilities) {
      const keywords = resp.toLowerCase().split(/\s+/).filter(kw => kw.length > 3);
      score += keywords.filter(kw => taskLower.includes(kw)).length * 5;
    }
    return score;
  }

  private scoreByDelegationRules(agent: Agent, params: SelectAgentParams, matchedRules: DelegationRule[]): number {
    let score = 0;
    for (const rule of agent.delegationRules) {
      if (this.matchRule(rule, params)) {
        score += rule.priority * 10;
        matchedRules.push(rule);
      }
    }
    return score;
  }

  private scoreByFiles(agent: Agent, files?: string[]): number {
    if (!files) return 0;
    return files.filter(f => this.matchAgentByFile(agent, f)).length * 15;
  }

  private scoreByKeywords(agent: Agent, keywords?: string[]): number {
    if (!keywords) return 0;
    return keywords.filter(kw =>
      agent.specializations.some(s => s.toLowerCase().includes(kw.toLowerCase()))
    ).length * 10;
  }

  private scoreByDomain(agent: Agent, domain?: string): number {
    if (!domain) return 0;
    return agent.specializations.some(s => s.toLowerCase().includes(domain.toLowerCase())) ? 25 : 0;
  }

  /**
   * Match a delegation rule against params
   */
  private matchRule(rule: DelegationRule, params: SelectAgentParams): boolean {
    const pattern = rule.pattern.toLowerCase();
    const matchers: Record<string, () => boolean> = {
      keyword: () =>
        params.task.toLowerCase().includes(pattern) ||
        (params.keywords?.some(k => k.toLowerCase().includes(pattern)) ?? false),
      file_pattern: () =>
        params.files?.some(f => f.match(new RegExp(pattern, 'i'))) ?? false,
      domain: () =>
        params.domain?.toLowerCase() === pattern ||
        params.task.toLowerCase().includes(pattern),
      regex: () => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(params.task) || (params.files?.some(f => regex.test(f)) ?? false);
        } catch {
          return false;
        }
      },
    };
    return matchers[rule.matchType]?.() ?? false;
  }

  /**
   * Match agent by file extension/path using agent specializations
   */
  private matchAgentByFile(agent: Agent, file: string): boolean {
    const fileLower = file.toLowerCase();
    // Match if file path contains any of the agent's specializations
    return agent.specializations.some(spec => fileLower.includes(spec.toLowerCase()));
  }

  /**
   * Generate human-readable selection reason
   */
  private generateSelectionReason(
    agent: Agent,
    rules: DelegationRule[],
    params: SelectAgentParams
  ): string {
    const reasons: string[] = [];

    if (rules.length > 0) {
      reasons.push(`Matched rules: ${rules.map(r => r.description || r.pattern).join(', ')}`);
    }

    if (params.domain && agent.specializations.includes(params.domain)) {
      reasons.push(`Domain match: ${params.domain}`);
    }

    if (reasons.length === 0) {
      reasons.push(`Best match for: ${agent.specializations.slice(0, 2).join(', ')}`);
    }

    return reasons.join('; ');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      COORDINATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Coordinate multiple agents for a complex task
   */
  coordinate(params: CoordinateAgentsParams): CoordinationResult {
    const agents = params.agentIds
      .map(id => this.agents.get(id))
      .filter((a): a is Agent => a !== undefined && a.enabled);

    if (agents.length === 0) {
      throw new Error('No valid agents found for coordination');
    }

    const taskId = `coord-${Date.now()}`;
    const plan: CoordinationStep[] = [];

    switch (params.mode) {
      case 'sequential':
        agents.forEach((agent, index) => {
          plan.push({
            order: index + 1,
            agentId: agent.id,
            action: `${agent.role}: Process task`,
            dependsOn: index > 0 ? [index] : undefined,
          });
        });
        break;

      case 'parallel':
        agents.forEach((agent, index) => {
          plan.push({
            order: index + 1,
            agentId: agent.id,
            action: `${agent.role}: Process task in parallel`,
          });
        });
        break;

      case 'review':
        // First agent does work, others review
        plan.push({
          order: 1,
          agentId: agents[0].id,
          action: `${agents[0].role}: Implement changes`,
        });
        agents.slice(1).forEach((agent, index) => {
          plan.push({
            order: index + 2,
            agentId: agent.id,
            action: `${agent.role}: Review changes`,
            dependsOn: [1],
          });
        });
        break;
    }

    const result: CoordinationResult = {
      taskId,
      agents,
      plan,
      status: 'planned',
    };

    this.eventBus.emit({ type: 'agent:coordination:created', timestamp: new Date(), data: { result } });

    return result;
  }

  /**
   * Register built-in agents (Enterprise Toolkit compatible)
   */
  private registerBuiltInAgents(): void {
    for (const agentDef of BUILTIN_AGENTS) {
      this.register(agentDef);
    }
    this.logger.info(`Registered ${BUILTIN_AGENTS.length} built-in agents`);
  }

  // ═══════════════════════════════════════════════════════════════
  //                      UTILITIES
  // ═══════════════════════════════════════════════════════════════

  private extractSpecializations(responsibilities: string[]): string[] {
    const specs: string[] = [];
    for (const resp of responsibilities) {
      const words = resp.split(/[,\s()]+/);
      for (const word of words) {
        if (word.length > 3 && !specs.includes(word.toLowerCase())) {
          specs.push(word.toLowerCase());
        }
      }
    }
    return specs.slice(0, 10);
  }

  private parseRulesToDelegation(rules: string[]): DelegationRule[] {
    return rules.map((rule, index) => ({
      id: `rule-${index}`,
      pattern: rule.toLowerCase().split(/\s+/).slice(0, 3).join(' '),
      matchType: 'keyword' as const,
      priority: 5,
      description: rule,
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  getStatus(): AgentsModuleStatus {
    const delegationsByAgent: Record<string, number> = {};
    let totalDelegations = 0;

    for (const [agentId, count] of this.delegationStats) {
      delegationsByAgent[agentId] = count;
      totalDelegations += count;
    }

    return {
      enabled: this.config.enabled,
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values())
        .filter(a => a.enabled)
        .map(a => a.id),
      agentsFilePath: this.config.agentsFilePath,
      lastReload: this.lastReload,
      stats: {
        totalDelegations,
        delegationsByAgent,
      },
    };
  }

  /**
   * Reload agents from files
   */
  async reload(): Promise<void> {
    this.agents.clear();
    await this.initialize();
  }
}
