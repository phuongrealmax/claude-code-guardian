// src/modules/agents/agents.service.ts

import { readFile, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
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
  ParsedAgentSection,
  AgentDefinitionFile,
} from './agents.types.js';

// ═══════════════════════════════════════════════════════════════
//                      AGENTS SERVICE
// ═══════════════════════════════════════════════════════════════

export class AgentsService {
  private agents: Map<string, Agent> = new Map();
  private delegationStats: Map<string, number> = new Map();
  private lastReload?: Date;

  constructor(
    private config: AgentsModuleConfig,
    private eventBus: EventBus,
    private logger: Logger,
    private projectRoot: string
  ) {}

  // ═══════════════════════════════════════════════════════════════
  //                      LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  async initialize(): Promise<void> {
    this.logger.info('Initializing Agents service');

    // Load agents from AGENTS.md
    await this.loadAgentsFile();

    // Load agent definitions from .claude/agents/
    await this.loadAgentDefinitions();

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
    let score = 0;
    const matchedRules: DelegationRule[] = [];
    const taskLower = params.task.toLowerCase();

    // Check specializations against task
    for (const spec of agent.specializations) {
      if (taskLower.includes(spec.toLowerCase())) {
        score += 20;
      }
    }

    // Check responsibilities
    for (const resp of agent.responsibilities) {
      const keywords = resp.toLowerCase().split(/\s+/);
      for (const kw of keywords) {
        if (kw.length > 3 && taskLower.includes(kw)) {
          score += 5;
        }
      }
    }

    // Check delegation rules
    for (const rule of agent.delegationRules) {
      if (this.matchRule(rule, params)) {
        score += rule.priority * 10;
        matchedRules.push(rule);
      }
    }

    // Check file patterns
    if (params.files) {
      for (const file of params.files) {
        if (this.matchAgentByFile(agent, file)) {
          score += 15;
        }
      }
    }

    // Check keywords
    if (params.keywords) {
      for (const kw of params.keywords) {
        if (agent.specializations.some(s => s.toLowerCase().includes(kw.toLowerCase()))) {
          score += 10;
        }
      }
    }

    // Check domain
    if (params.domain) {
      if (agent.specializations.some(s => s.toLowerCase().includes(params.domain!.toLowerCase()))) {
        score += 25;
      }
    }

    return { score, matchedRules };
  }

  /**
   * Match a delegation rule against params
   */
  private matchRule(rule: DelegationRule, params: SelectAgentParams): boolean {
    const pattern = rule.pattern.toLowerCase();

    switch (rule.matchType) {
      case 'keyword':
        return params.task.toLowerCase().includes(pattern) ||
          (params.keywords?.some(k => k.toLowerCase().includes(pattern)) ?? false);

      case 'file_pattern':
        return params.files?.some(f => f.match(new RegExp(pattern, 'i'))) ?? false;

      case 'domain':
        return params.domain?.toLowerCase() === pattern ||
          params.task.toLowerCase().includes(pattern);

      case 'regex':
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(params.task) ||
            (params.files?.some(f => regex.test(f)) ?? false);
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Match agent by file extension/path
   */
  private matchAgentByFile(agent: Agent, file: string): boolean {
    const fileLower = file.toLowerCase();

    // Common patterns
    const patterns: Record<string, string[]> = {
      'laravel-agent': ['.php', 'artisan', 'composer.json', 'app/Http', 'routes/'],
      'react-agent': ['.tsx', '.jsx', 'components/', 'hooks/', 'src/app/'],
      'node-agent': ['.ts', '.js', 'workers/', 'queues/', 'services/'],
      'trading-agent': ['strategy', 'trading', 'risk', 'backtest', 'execution'],
    };

    const agentPatterns = patterns[agent.id] || [];
    return agentPatterns.some(p => fileLower.includes(p));
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

  // ═══════════════════════════════════════════════════════════════
  //                      FILE LOADING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load and parse AGENTS.md file
   */
  async loadAgentsFile(): Promise<ParsedAgentsFile | null> {
    const agentsPath = join(this.projectRoot, this.config.agentsFilePath);

    try {
      await stat(agentsPath);
    } catch {
      this.logger.debug(`AGENTS.md not found at ${agentsPath}`);
      return null;
    }

    try {
      const content = await readFile(agentsPath, 'utf-8');
      const parsed = this.parseAgentsMarkdown(content, agentsPath);

      // Register parsed agents
      for (const section of parsed.agents) {
        this.register({
          id: section.id,
          name: section.name,
          role: `${section.name} Specialist`,
          specializations: this.extractSpecializations(section.responsibilities),
          responsibilities: section.responsibilities,
          delegationRules: this.parseRulesToDelegation(section.delegationRules),
        });
      }

      this.logger.info(`Loaded ${parsed.agents.length} agents from AGENTS.md`);
      return parsed;
    } catch (error) {
      this.logger.error('Failed to load AGENTS.md:', error);
      return null;
    }
  }

  /**
   * Parse AGENTS.md markdown content
   */
  private parseAgentsMarkdown(content: string, path: string): ParsedAgentsFile {
    const lines = content.split('\n');
    const agents: ParsedAgentSection[] = [];
    const errors: string[] = [];

    let currentAgent: Partial<ParsedAgentSection> | null = null;
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Agent header (## Agent Name)
      const agentMatch = line.match(/^##\s+(.+?)\s*(?:Agent)?$/i);
      if (agentMatch) {
        // Save previous agent
        if (currentAgent && currentAgent.name) {
          currentAgent.endLine = lineNum - 1;
          agents.push(currentAgent as ParsedAgentSection);
        }

        // Start new agent
        const name = agentMatch[1].trim();
        currentAgent = {
          name,
          id: this.nameToId(name),
          responsibilities: [],
          delegationRules: [],
          startLine: lineNum,
        };
        currentSection = '';
        continue;
      }

      // Section headers within agent
      if (line.match(/^-\s*Name:/i)) {
        const nameMatch = line.match(/^-\s*Name:\s*`?([^`]+)`?/i);
        if (nameMatch && currentAgent) {
          currentAgent.id = nameMatch[1].trim();
        }
        continue;
      }

      if (line.match(/^-\s*Responsibilities:/i)) {
        currentSection = 'responsibilities';
        continue;
      }

      if (line.match(/^-\s*When to delegate:/i)) {
        currentSection = 'delegation';
        continue;
      }

      // List items
      const listMatch = line.match(/^\s+-\s+(.+)/);
      if (listMatch && currentAgent) {
        const item = listMatch[1].trim();
        if (currentSection === 'responsibilities') {
          currentAgent.responsibilities?.push(item);
        } else if (currentSection === 'delegation') {
          currentAgent.delegationRules?.push(item);
        }
      }
    }

    // Save last agent
    if (currentAgent && currentAgent.name) {
      currentAgent.endLine = lines.length;
      agents.push(currentAgent as ParsedAgentSection);
    }

    return {
      path,
      agents,
      errors,
      parsedAt: new Date(),
    };
  }

  /**
   * Load agent definition files from .claude/agents/
   */
  async loadAgentDefinitions(): Promise<AgentDefinitionFile[]> {
    const agentsDir = join(this.projectRoot, this.config.agentsDir);
    const definitions: AgentDefinitionFile[] = [];

    try {
      await stat(agentsDir);
    } catch {
      this.logger.debug(`Agents directory not found: ${agentsDir}`);
      return definitions;
    }

    try {
      const files = await readdir(agentsDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      for (const file of mdFiles) {
        try {
          const filePath = join(agentsDir, file);
          const content = await readFile(filePath, 'utf-8');
          const agentId = basename(file, '.md');

          const definition = this.parseAgentDefinition(content, filePath, agentId);
          definitions.push(definition);

          // Update or create agent
          const existing = this.agents.get(agentId);
          if (existing) {
            this.update(agentId, {
              role: definition.content.role || existing.role,
              principles: definition.content.principles,
              codeGuidelines: definition.content.guidelines,
            });
          } else {
            this.register({
              id: agentId,
              name: this.idToName(agentId),
              role: definition.content.role || `${this.idToName(agentId)} Specialist`,
              specializations: definition.content.specializations || [],
              responsibilities: [],
              principles: definition.content.principles,
              codeGuidelines: definition.content.guidelines,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to parse agent definition: ${file}`, error);
        }
      }

      this.logger.info(`Loaded ${definitions.length} agent definitions`);
    } catch (error) {
      this.logger.error('Failed to load agent definitions:', error);
    }

    return definitions;
  }

  /**
   * Parse agent definition file
   */
  private parseAgentDefinition(
    content: string,
    path: string,
    agentId: string
  ): AgentDefinitionFile {
    const lines = content.split('\n');
    const result: AgentDefinitionFile = {
      path,
      agentId,
      content: {},
      rawContent: content,
    };

    let currentSection = '';
    const sections: Record<string, string[]> = {};

    for (const line of lines) {
      // Role line
      const roleMatch = line.match(/^Role:\s*(.+)/i);
      if (roleMatch) {
        result.content.role = roleMatch[1].trim();
        continue;
      }

      // Section headers
      if (line.match(/^(Core principles|Guidelines|You specialize in):/i)) {
        currentSection = line.toLowerCase().includes('principle') ? 'principles' :
          line.toLowerCase().includes('specialize') ? 'specializations' : 'guidelines';
        sections[currentSection] = [];
        continue;
      }

      // List items
      const listMatch = line.match(/^-\s+(.+)/);
      if (listMatch && currentSection) {
        sections[currentSection]?.push(listMatch[1].trim());
      }
    }

    result.content.principles = sections['principles'];
    result.content.specializations = sections['specializations'];
    result.content.guidelines = sections['guidelines'];

    return result;
  }

  /**
   * Register built-in agents (Enterprise Toolkit compatible)
   */
  private registerBuiltInAgents(): void {
    // Trading Agent
    this.register({
      id: 'trading-agent',
      name: 'Trading Agent',
      role: 'Senior Quant & Trading Systems Engineer',
      specializations: [
        'Trading logic', 'Risk management', 'Position sizing',
        'Backtesting', 'Exchange APIs', 'Strategy evaluation',
      ],
      responsibilities: [
        'Trading logic (spot, futures, margin)',
        'Position sizing, leverage, liquidation risk',
        'Risk management rules (max loss, max DD, exposure)',
        'Strategy evaluation: winrate, expectancy, Sharpe, max drawdown',
        'Exchange integration: APIs, websockets, rate limits',
      ],
      delegationRules: [
        { id: 'trading-1', pattern: 'trading', matchType: 'keyword', priority: 10 },
        { id: 'trading-2', pattern: 'strategy', matchType: 'keyword', priority: 8 },
        { id: 'trading-3', pattern: 'backtest', matchType: 'keyword', priority: 9 },
        { id: 'trading-4', pattern: 'risk', matchType: 'keyword', priority: 7 },
        { id: 'trading-5', pattern: 'execution', matchType: 'keyword', priority: 8 },
      ],
      principles: [
        'Never suggest unsafe risk: default to conservative leverage',
        'Keep strategy logic isolated and testable',
        'Keep risk rules explicit and centralized',
      ],
    });

    // Laravel Agent
    this.register({
      id: 'laravel-agent',
      name: 'Laravel Agent',
      role: 'Senior Laravel Backend Engineer',
      specializations: [
        'Laravel', 'PHP', 'Eloquent ORM', 'REST APIs',
        'Migrations', 'Validation', 'Policies',
      ],
      responsibilities: [
        'Laravel apps (routes, controllers, services, jobs, events)',
        'Eloquent, relationships, query optimization',
        'Validation, policies, middleware, auth/ACL',
        'Migrations, seeders, factories',
        'REST API best practices in Laravel',
      ],
      delegationRules: [
        { id: 'laravel-1', pattern: '\\.php$', matchType: 'regex', priority: 10 },
        { id: 'laravel-2', pattern: 'laravel', matchType: 'keyword', priority: 10 },
        { id: 'laravel-3', pattern: 'eloquent', matchType: 'keyword', priority: 9 },
        { id: 'laravel-4', pattern: 'migration', matchType: 'keyword', priority: 8 },
        { id: 'laravel-5', pattern: 'artisan', matchType: 'keyword', priority: 8 },
      ],
    });

    // React Agent
    this.register({
      id: 'react-agent',
      name: 'React Agent',
      role: 'Senior React & TypeScript Frontend Engineer',
      specializations: [
        'React', 'TypeScript', 'Components', 'Hooks',
        'State management', 'UI/UX patterns',
      ],
      responsibilities: [
        'React + TypeScript SPA / dashboard',
        'Components, hooks, state management, forms, tables',
        'API integration with backend',
        'UI/UX patterns, error & loading states',
      ],
      delegationRules: [
        { id: 'react-1', pattern: '\\.(tsx|jsx)$', matchType: 'regex', priority: 10 },
        { id: 'react-2', pattern: 'react', matchType: 'keyword', priority: 10 },
        { id: 'react-3', pattern: 'component', matchType: 'keyword', priority: 8 },
        { id: 'react-4', pattern: 'hook', matchType: 'keyword', priority: 8 },
        { id: 'react-5', pattern: 'frontend', matchType: 'keyword', priority: 7 },
      ],
    });

    // Node Agent
    this.register({
      id: 'node-agent',
      name: 'Node Agent',
      role: 'Senior Node.js & TypeScript Orchestration Engineer',
      specializations: [
        'Node.js', 'TypeScript', 'Event-driven architecture',
        'Message queues', 'Workers', 'API gateway',
      ],
      responsibilities: [
        'Node.js + TypeScript backend applications',
        'Event-driven and message-driven architectures',
        'Task queues and workers (BullMQ, Redis, RabbitMQ)',
        'API gateway patterns and service composition',
        'Microservices and modular monolith orchestration',
      ],
      delegationRules: [
        { id: 'node-1', pattern: 'worker', matchType: 'keyword', priority: 9 },
        { id: 'node-2', pattern: 'queue', matchType: 'keyword', priority: 9 },
        { id: 'node-3', pattern: 'orchestration', matchType: 'keyword', priority: 10 },
        { id: 'node-4', pattern: 'service', matchType: 'keyword', priority: 6 },
        { id: 'node-5', pattern: 'bullmq|rabbitmq', matchType: 'regex', priority: 10 },
      ],
    });

    this.logger.info('Registered 4 built-in agents');
  }

  // ═══════════════════════════════════════════════════════════════
  //                      UTILITIES
  // ═══════════════════════════════════════════════════════════════

  private nameToId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  private idToName(id: string): string {
    return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

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
    await this.loadAgentsFile();
    await this.loadAgentDefinitions();
    if (this.agents.size === 0) {
      this.registerBuiltInAgents();
    }
    this.lastReload = new Date();
  }
}
