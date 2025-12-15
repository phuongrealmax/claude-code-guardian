/**
 * AST Module MCP Tools
 * Exposes AST parsing capabilities as MCP tools for external IDE/assistant usage
 */

import { z } from 'zod';
import { ASTService } from './ast.service.js';

/**
 * Create AST MCP tool definitions
 */
export function createASTTools(astService: ASTService) {
  return {
    /**
     * Parse a file and extract all code symbols
     */
    ast_parse: {
      description: `Parse a source file and extract all code symbols (functions, classes, interfaces, types).

Use this when you need to:
- Understand the structure of a file
- Find all functions/classes in a file
- Get symbol signatures and docstrings

Returns: File info, symbols list, imports, exports, line count.`,
      parameters: z.object({
        filePath: z.string().describe('Path to the file to parse'),
        includeDocstrings: z.boolean().optional().default(true).describe('Include docstrings/JSDoc comments'),
      }),
      execute: async ({ filePath, includeDocstrings }: { filePath: string; includeDocstrings?: boolean }) => {
        try {
          const result = await astService.parseFile(filePath);

          // Optionally strip docstrings
          if (!includeDocstrings) {
            result.symbols = result.symbols.map(s => ({ ...s, docstring: undefined }));
          }

          return {
            success: true,
            ...result,
            summary: `Parsed ${result.symbols.length} symbols from ${result.filePath} (${result.language})`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    },

    /**
     * Get symbols from a file with optional filtering
     */
    ast_symbols: {
      description: `Extract and filter symbols from a source file.

Use this when you need to:
- Find specific types of symbols (only functions, only classes, etc.)
- Search for symbols by name pattern
- Get a focused list of symbols

Filters:
- types: Filter by symbol type (function, class, interface, type, method)
- namePattern: Regex pattern to match symbol names`,
      parameters: z.object({
        filePath: z.string().describe('Path to the file'),
        types: z.array(z.enum(['function', 'class', 'interface', 'type', 'method', 'variable', 'import', 'export']))
          .optional()
          .describe('Filter by symbol types'),
        namePattern: z.string().optional().describe('Regex pattern to filter by name'),
      }),
      execute: async ({
        filePath,
        types,
        namePattern,
      }: {
        filePath: string;
        types?: string[];
        namePattern?: string;
      }) => {
        try {
          const symbols = await astService.getSymbols(filePath, { types, namePattern });

          return {
            success: true,
            count: symbols.length,
            symbols,
            formatted: symbols.map(s =>
              `[${s.type}] ${s.name} (L${s.startLine}-${s.endLine})${s.signature ? `: ${s.signature}` : ''}`
            ).join('\n'),
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    },

    /**
     * Build dependency graph for a directory
     */
    ast_dependencies: {
      description: `Build a dependency graph for a codebase directory.

Use this when you need to:
- Understand module dependencies
- Find entry points (files not imported by others)
- Find orphan files (isolated modules)
- Analyze import/export relationships

Returns: Files list, dependencies, entry points, orphans.`,
      parameters: z.object({
        dirPath: z.string().describe('Directory path to analyze'),
        include: z.array(z.string()).optional().describe('Glob patterns to include (default: *.ts, *.js, *.py, *.go)'),
        exclude: z.array(z.string()).optional().describe('Glob patterns to exclude (default: node_modules, dist, build)'),
      }),
      execute: async ({
        dirPath,
        include,
        exclude,
      }: {
        dirPath: string;
        include?: string[];
        exclude?: string[];
      }) => {
        try {
          const graph = await astService.buildDependencyGraph(dirPath, { include, exclude });

          return {
            success: true,
            fileCount: graph.files.length,
            dependencyCount: graph.dependencies.length,
            entryPointCount: graph.entryPoints.length,
            orphanCount: graph.orphans.length,
            graph,
            summary: `Analyzed ${graph.files.length} files with ${graph.dependencies.length} dependencies. Found ${graph.entryPoints.length} entry points and ${graph.orphans.length} orphan files.`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    },

    /**
     * Detect language from file path
     */
    ast_detect_language: {
      description: `Detect programming language from file extension.

Use this to determine the language before parsing.`,
      parameters: z.object({
        filePath: z.string().describe('Path to the file'),
      }),
      execute: async ({ filePath }: { filePath: string }) => {
        const supportedLanguages = astService.getSupportedLanguages();
        const ext = filePath.split('.').pop()?.toLowerCase() || '';

        const languageMap: Record<string, string> = {
          ts: 'typescript',
          tsx: 'typescript',
          js: 'javascript',
          jsx: 'javascript',
          mjs: 'javascript',
          cjs: 'javascript',
          py: 'python',
          go: 'go',
          rs: 'rust',
          java: 'java',
          php: 'php',
          rb: 'ruby',
          c: 'c',
          cpp: 'cpp',
          cc: 'cpp',
          h: 'c',
          hpp: 'cpp',
        };

        const language = languageMap[ext] || 'unknown';
        const isSupported = supportedLanguages.includes(language);

        return {
          success: true,
          filePath,
          extension: ext,
          language,
          isSupported,
          supportedLanguages,
        };
      },
    },

    /**
     * Get AST module status
     */
    ast_status: {
      description: `Get AST module status including stats and configuration.`,
      parameters: z.object({}),
      execute: async () => {
        const status = astService.getStatus();

        return {
          success: true,
          ...status,
          formatted: `AST Module: ${status.enabled ? 'Enabled' : 'Disabled'}
Files Parsed: ${status.filesParsed}
Symbols Extracted: ${status.symbolsExtracted}
Supported Languages: ${status.supportedLanguages.join(', ')}
Last Parsed: ${status.lastParsedFile || 'None'}`,
        };
      },
    },
  };
}

/**
 * Get tool definitions for registration
 */
export function getASTToolDefinitions() {
  return [
    {
      name: 'ast_parse',
      description: 'Parse a source file and extract all code symbols',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file to parse' },
          includeDocstrings: { type: 'boolean', description: 'Include docstrings/JSDoc comments', default: true },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'ast_symbols',
      description: 'Extract and filter symbols from a source file',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file' },
          types: {
            type: 'array',
            items: { type: 'string', enum: ['function', 'class', 'interface', 'type', 'method', 'variable', 'import', 'export'] },
            description: 'Filter by symbol types',
          },
          namePattern: { type: 'string', description: 'Regex pattern to filter by name' },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'ast_dependencies',
      description: 'Build a dependency graph for a codebase directory',
      inputSchema: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'Directory path to analyze' },
          include: { type: 'array', items: { type: 'string' }, description: 'Glob patterns to include' },
          exclude: { type: 'array', items: { type: 'string' }, description: 'Glob patterns to exclude' },
        },
        required: ['dirPath'],
      },
    },
    {
      name: 'ast_detect_language',
      description: 'Detect programming language from file extension',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file' },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'ast_status',
      description: 'Get AST module status',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}
