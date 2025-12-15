/**
 * AST Module - Code parsing as MCP tools
 *
 * Exposes AST parsing capabilities for external IDE/assistant usage:
 * - ast_parse: Parse file and extract symbols
 * - ast_symbols: Get filtered symbols from a file
 * - ast_dependencies: Build dependency graph
 * - ast_detect_language: Detect language from extension
 * - ast_status: Get module status
 */

import { EventBus } from '../../core/event-bus.js';
import { ASTService } from './ast.service.js';
import { createASTTools, getASTToolDefinitions } from './ast.tools.js';
import { ASTModuleConfig, DEFAULT_AST_CONFIG } from './ast.types.js';

export { ASTService } from './ast.service.js';
export { createASTTools, getASTToolDefinitions } from './ast.tools.js';
export * from './ast.types.js';

/**
 * AST Module class for integration with CCG server
 */
export class ASTModule {
  private service: ASTService;
  private tools: ReturnType<typeof createASTTools>;

  constructor(eventBus: EventBus, config?: Partial<ASTModuleConfig>) {
    this.service = new ASTService(eventBus, config);
    this.tools = createASTTools(this.service);
  }

  /**
   * Get the AST service instance
   */
  getService(): ASTService {
    return this.service;
  }

  /**
   * Get MCP tools for registration
   */
  getTools(): ReturnType<typeof createASTTools> {
    return this.tools;
  }

  /**
   * Get tool definitions for MCP server
   */
  getToolDefinitions() {
    return getASTToolDefinitions();
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools[toolName as keyof typeof this.tools];
    if (!tool) {
      throw new Error(`Unknown AST tool: ${toolName}`);
    }
    return tool.execute(params as never);
  }
}

/**
 * Create AST module instance
 */
export function createASTModule(eventBus: EventBus, config?: Partial<ASTModuleConfig>): ASTModule {
  return new ASTModule(eventBus, config);
}
