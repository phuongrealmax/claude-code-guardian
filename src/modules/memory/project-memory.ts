// src/modules/memory/project-memory.ts

/**
 * Project-Scoped Memory Module
 *
 * Provides project-specific memory storage following Enterprise Toolkit patterns:
 * - project_facts: name, domain, stack info
 * - business_principles: domain-specific rules
 * - api_conventions: response wrapper, versioning
 */

import { readFile, writeFile, stat } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { Logger } from '../../core/logger.js';

// ═══════════════════════════════════════════════════════════════
//                      PROJECT MEMORY TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Project facts structure
 */
export interface ProjectFacts {
  name: string;
  domain: ProjectDomain;
  stack: {
    backend?: string;
    frontend?: string;
    database?: string;
    queue?: string;
    cache?: string;
  };
  description?: string;
  version?: string;
  mainBranch?: string;
}

/**
 * Supported project domains
 */
export type ProjectDomain =
  | 'erp'
  | 'trading'
  | 'orchestration'
  | 'ecommerce'
  | 'cms'
  | 'api'
  | 'general';

/**
 * Business principles - domain-specific rules
 */
export interface BusinessPrinciples {
  domain: ProjectDomain;
  rules: BusinessRule[];
  customRules?: BusinessRule[];
}

export interface BusinessRule {
  id: string;
  category: string;
  rule: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  enforceable?: boolean;
}

/**
 * API Conventions
 */
export interface ApiConventions {
  responseWrapper?: {
    success: string;
    data: string;
    message: string;
    error: string;
  };
  errorFormat?: {
    message: string;
    code: string;
    fields?: string;
  };
  versioning?: {
    style: 'path' | 'header' | 'query';
    pattern: string;
    currentVersion: string;
  };
  authentication?: {
    type: 'jwt' | 'oauth' | 'api-key' | 'session';
    headerName?: string;
  };
}

/**
 * Complete project memory structure
 */
export interface ProjectMemory {
  projectFacts: ProjectFacts;
  businessPrinciples: BusinessPrinciples;
  apiConventions?: ApiConventions;
  reports?: ReportConfig[];
  customData?: Record<string, unknown>;
  lastUpdated: Date;
  version: string;
}

export interface ReportConfig {
  name: string;
  type: string;
  dimensions: string[];
  metrics: string[];
}

// ═══════════════════════════════════════════════════════════════
//                      DOMAIN TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * Default business principles by domain
 */
export const DOMAIN_PRINCIPLES: Record<ProjectDomain, BusinessRule[]> = {
  erp: [
    { id: 'erp-inv-1', category: 'Inventory', rule: 'All inventory operations must be warehouse-scoped', importance: 'critical', enforceable: true },
    { id: 'erp-inv-2', category: 'Inventory', rule: 'Negative stock is not allowed by default', importance: 'critical', enforceable: true },
    { id: 'erp-inv-3', category: 'Inventory', rule: 'Stock movements must be tracked with reason codes', importance: 'high' },
    { id: 'erp-price-1', category: 'Pricing', rule: 'Support multiple price levels (retail, wholesale, VIP)', importance: 'high' },
    { id: 'erp-price-2', category: 'Pricing', rule: 'Discounts must be layered and auditable', importance: 'medium' },
    { id: 'erp-debt-1', category: 'Debt', rule: 'Customer debt must be tracked per transaction', importance: 'critical' },
    { id: 'erp-debt-2', category: 'Debt', rule: 'Debt sources: orders, manual adjustments', importance: 'high' },
    { id: 'erp-debt-3', category: 'Debt', rule: 'Debt reductions: payments, returns, writeoffs', importance: 'high' },
  ],

  trading: [
    { id: 'trading-risk-1', category: 'Risk', rule: 'Max leverage must be configurable and enforced', importance: 'critical', enforceable: true },
    { id: 'trading-risk-2', category: 'Risk', rule: 'Daily loss limit must trigger auto-stop', importance: 'critical', enforceable: true },
    { id: 'trading-risk-3', category: 'Risk', rule: 'Max drawdown limit must be monitored', importance: 'critical' },
    { id: 'trading-risk-4', category: 'Risk', rule: 'Position size limits per symbol', importance: 'high' },
    { id: 'trading-safety-1', category: 'Safety', rule: 'Stop loss is required for all positions', importance: 'critical', enforceable: true },
    { id: 'trading-safety-2', category: 'Safety', rule: 'Cooldown period after consecutive losses', importance: 'high' },
    { id: 'trading-strategy-1', category: 'Strategy', rule: 'Strategy logic must be isolated and testable', importance: 'high' },
    { id: 'trading-strategy-2', category: 'Strategy', rule: 'Strategies must be pure functions (no side effects)', importance: 'high' },
    { id: 'trading-strategy-3', category: 'Strategy', rule: 'No order execution inside strategy logic', importance: 'critical', enforceable: true },
  ],

  orchestration: [
    { id: 'orch-1', category: 'Reliability', rule: 'All operations must be idempotent', importance: 'critical', enforceable: true },
    { id: 'orch-2', category: 'Observability', rule: 'All worker operations must be logged with trace ID', importance: 'high' },
    { id: 'orch-3', category: 'Reliability', rule: 'All operations must be retry-safe', importance: 'critical' },
    { id: 'orch-4', category: 'Cost', rule: 'Track and limit API/model costs per operation', importance: 'high' },
    { id: 'orch-ai-1', category: 'AI', rule: 'Prefer smaller models first, escalate if needed', importance: 'medium' },
    { id: 'orch-ai-2', category: 'AI', rule: 'Implement context budgeting for LLM calls', importance: 'medium' },
    { id: 'orch-queue-1', category: 'Queue', rule: 'Dead letter queue for failed jobs', importance: 'high' },
    { id: 'orch-queue-2', category: 'Queue', rule: 'Job timeout must be enforced', importance: 'high' },
  ],

  ecommerce: [
    { id: 'ecom-order-1', category: 'Orders', rule: 'Order status transitions must be validated', importance: 'critical' },
    { id: 'ecom-order-2', category: 'Orders', rule: 'Payment must be confirmed before order processing', importance: 'critical' },
    { id: 'ecom-cart-1', category: 'Cart', rule: 'Cart items must have stock validation', importance: 'high' },
    { id: 'ecom-price-1', category: 'Pricing', rule: 'Prices must be locked at order time', importance: 'critical' },
    { id: 'ecom-ship-1', category: 'Shipping', rule: 'Shipping cost calculation must be transparent', importance: 'medium' },
  ],

  cms: [
    { id: 'cms-content-1', category: 'Content', rule: 'Content must support draft/published states', importance: 'high' },
    { id: 'cms-content-2', category: 'Content', rule: 'Content versioning must be enabled', importance: 'medium' },
    { id: 'cms-media-1', category: 'Media', rule: 'Media uploads must be validated and sanitized', importance: 'critical' },
    { id: 'cms-seo-1', category: 'SEO', rule: 'Meta tags must be editable per page', importance: 'medium' },
  ],

  api: [
    { id: 'api-resp-1', category: 'Response', rule: 'Use consistent response wrapper format', importance: 'high' },
    { id: 'api-err-1', category: 'Error', rule: 'Error responses must include code and message', importance: 'high' },
    { id: 'api-ver-1', category: 'Versioning', rule: 'API versioning via path prefix (/api/v1)', importance: 'medium' },
    { id: 'api-auth-1', category: 'Auth', rule: 'Protected endpoints must require authentication', importance: 'critical' },
    { id: 'api-rate-1', category: 'Rate Limit', rule: 'Rate limiting must be enforced per client', importance: 'high' },
  ],

  general: [
    { id: 'gen-sec-1', category: 'Security', rule: 'Input validation on all user inputs', importance: 'critical' },
    { id: 'gen-sec-2', category: 'Security', rule: 'SQL injection prevention', importance: 'critical' },
    { id: 'gen-sec-3', category: 'Security', rule: 'XSS prevention on outputs', importance: 'critical' },
    { id: 'gen-err-1', category: 'Error', rule: 'No empty catch blocks', importance: 'high' },
    { id: 'gen-log-1', category: 'Logging', rule: 'Errors must be logged with context', importance: 'high' },
  ],
};

// ═══════════════════════════════════════════════════════════════
//                      PROJECT MEMORY SERVICE
// ═══════════════════════════════════════════════════════════════

export class ProjectMemoryService {
  private memoryCache: Map<string, ProjectMemory> = new Map();
  private memoryPath: string;

  constructor(
    private projectRoot: string,
    private logger: Logger
  ) {
    this.memoryPath = join(projectRoot, '.ccg', 'project-memory.json');
  }

  /**
   * Load project memory from file
   */
  async load(): Promise<ProjectMemory | null> {
    // Check cache first
    const cached = this.memoryCache.get(this.projectRoot);
    if (cached) {
      return cached;
    }

    try {
      await stat(this.memoryPath);
      const content = await readFile(this.memoryPath, 'utf-8');
      const memory = JSON.parse(content) as ProjectMemory;
      memory.lastUpdated = new Date(memory.lastUpdated);

      this.memoryCache.set(this.projectRoot, memory);
      this.logger.info('Project memory loaded');
      return memory;
    } catch {
      this.logger.debug('No project memory found, will create on first save');
      return null;
    }
  }

  /**
   * Save project memory to file
   */
  async save(memory: ProjectMemory): Promise<void> {
    const dir = dirname(this.memoryPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    memory.lastUpdated = new Date();
    memory.version = '1.0.0';

    await writeFile(this.memoryPath, JSON.stringify(memory, null, 2));
    this.memoryCache.set(this.projectRoot, memory);

    this.logger.info('Project memory saved');
  }

  /**
   * Initialize project memory with detected or provided facts
   */
  async initialize(facts?: Partial<ProjectFacts>): Promise<ProjectMemory> {
    const projectFacts: ProjectFacts = {
      name: facts?.name || this.detectProjectName(),
      domain: facts?.domain || this.detectDomain(),
      stack: facts?.stack || await this.detectStack(),
      description: facts?.description,
    };

    const memory: ProjectMemory = {
      projectFacts,
      businessPrinciples: {
        domain: projectFacts.domain,
        rules: DOMAIN_PRINCIPLES[projectFacts.domain] || DOMAIN_PRINCIPLES.general,
      },
      lastUpdated: new Date(),
      version: '1.0.0',
    };

    await this.save(memory);
    return memory;
  }

  /**
   * Update project facts
   */
  async updateFacts(facts: Partial<ProjectFacts>): Promise<ProjectMemory> {
    const current = await this.load() || await this.initialize();

    current.projectFacts = {
      ...current.projectFacts,
      ...facts,
    };

    // Update business principles if domain changed
    if (facts.domain && facts.domain !== current.businessPrinciples.domain) {
      current.businessPrinciples.domain = facts.domain;
      current.businessPrinciples.rules = DOMAIN_PRINCIPLES[facts.domain];
    }

    await this.save(current);
    return current;
  }

  /**
   * Add custom business rule
   */
  async addCustomRule(rule: BusinessRule): Promise<void> {
    const memory = await this.load() || await this.initialize();

    if (!memory.businessPrinciples.customRules) {
      memory.businessPrinciples.customRules = [];
    }

    // Check for duplicate
    const exists = memory.businessPrinciples.customRules.some(r => r.id === rule.id);
    if (exists) {
      throw new Error(`Rule with ID "${rule.id}" already exists`);
    }

    memory.businessPrinciples.customRules.push(rule);
    await this.save(memory);
  }

  /**
   * Get all business rules (default + custom)
   */
  async getAllRules(): Promise<BusinessRule[]> {
    const memory = await this.load();
    if (!memory) return DOMAIN_PRINCIPLES.general;

    return [
      ...memory.businessPrinciples.rules,
      ...(memory.businessPrinciples.customRules || []),
    ];
  }

  /**
   * Set API conventions
   */
  async setApiConventions(conventions: ApiConventions): Promise<void> {
    const memory = await this.load() || await this.initialize();
    memory.apiConventions = conventions;
    await this.save(memory);
  }

  /**
   * Add report configuration
   */
  async addReport(report: ReportConfig): Promise<void> {
    const memory = await this.load() || await this.initialize();

    if (!memory.reports) {
      memory.reports = [];
    }

    memory.reports.push(report);
    await this.save(memory);
  }

  /**
   * Set custom data
   */
  async setCustomData(key: string, value: unknown): Promise<void> {
    const memory = await this.load() || await this.initialize();

    if (!memory.customData) {
      memory.customData = {};
    }

    memory.customData[key] = value;
    await this.save(memory);
  }

  /**
   * Get custom data
   */
  async getCustomData(key: string): Promise<unknown> {
    const memory = await this.load();
    return memory?.customData?.[key];
  }

  // ═══════════════════════════════════════════════════════════════
  //                      DETECTION HELPERS
  // ═══════════════════════════════════════════════════════════════

  private detectProjectName(): string {
    try {
      const pkgPath = join(this.projectRoot, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf-8'));
        return pkg.name || 'unknown';
      }
    } catch {
      // Ignore
    }
    return 'unknown';
  }

  private detectDomain(): ProjectDomain {
    // Check for domain indicators
    const indicators: Record<ProjectDomain, string[]> = {
      trading: ['trading', 'strategy', 'backtest', 'exchange', 'binance', 'crypto'],
      erp: ['erp', 'inventory', 'warehouse', 'order', 'invoice', 'pos'],
      orchestration: ['worker', 'queue', 'job', 'orchestrat', 'pipeline'],
      ecommerce: ['shop', 'cart', 'checkout', 'product', 'store'],
      cms: ['content', 'blog', 'post', 'article', 'page'],
      api: ['api', 'endpoint', 'rest', 'graphql'],
      general: [],
    };

    const projectNameLower = this.detectProjectName().toLowerCase();

    for (const [domain, keywords] of Object.entries(indicators)) {
      if (keywords.some(kw => projectNameLower.includes(kw))) {
        return domain as ProjectDomain;
      }
    }

    return 'general';
  }

  private async detectStack(): Promise<ProjectFacts['stack']> {
    const stack: ProjectFacts['stack'] = {};

    // Detect backend
    if (existsSync(join(this.projectRoot, 'composer.json'))) {
      stack.backend = 'Laravel/PHP';
    } else if (existsSync(join(this.projectRoot, 'requirements.txt')) ||
               existsSync(join(this.projectRoot, 'pyproject.toml'))) {
      stack.backend = 'Python';
    } else if (existsSync(join(this.projectRoot, 'package.json'))) {
      const pkg = JSON.parse(require('fs').readFileSync(
        join(this.projectRoot, 'package.json'), 'utf-8'
      ));
      if (pkg.dependencies?.express || pkg.dependencies?.fastify) {
        stack.backend = 'Node.js';
      }
    }

    // Detect frontend
    if (existsSync(join(this.projectRoot, 'package.json'))) {
      const pkg = JSON.parse(require('fs').readFileSync(
        join(this.projectRoot, 'package.json'), 'utf-8'
      ));
      if (pkg.dependencies?.react) {
        stack.frontend = 'React';
      } else if (pkg.dependencies?.vue) {
        stack.frontend = 'Vue';
      } else if (pkg.dependencies?.angular) {
        stack.frontend = 'Angular';
      }
    }

    return stack;
  }
}

// ═══════════════════════════════════════════════════════════════
//                      EXPORTS
// ═══════════════════════════════════════════════════════════════

export function createProjectMemoryService(
  projectRoot: string,
  logger: Logger
): ProjectMemoryService {
  return new ProjectMemoryService(projectRoot, logger);
}
