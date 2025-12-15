/**
 * AST Module Types
 * Exposes code parsing capabilities as standalone MCP tools
 */

export interface ASTSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'method' | 'variable' | 'import' | 'export';
  signature?: string;
  docstring?: string;
  startLine: number;
  endLine: number;
  filePath: string;
  language: string;
}

export interface ASTParseResult {
  filePath: string;
  language: string;
  symbols: ASTSymbol[];
  imports: string[];
  exports: string[];
  lineCount: number;
  errors: string[];
}

export interface ASTDependency {
  source: string;
  target: string;
  type: 'import' | 'extends' | 'implements' | 'calls';
  line?: number;
}

export interface ASTDependencyGraph {
  files: string[];
  dependencies: ASTDependency[];
  entryPoints: string[];
  orphans: string[];
}

export interface ASTModuleConfig {
  enabled: boolean;
  supportedLanguages: string[];
  maxFileSize: number;
  includeDocstrings: boolean;
}

export const DEFAULT_AST_CONFIG: ASTModuleConfig = {
  enabled: true,
  supportedLanguages: ['typescript', 'javascript', 'python', 'go'],
  maxFileSize: 1024 * 1024, // 1MB
  includeDocstrings: true,
};

export interface ASTModuleStatus {
  enabled: boolean;
  supportedLanguages: string[];
  filesParsed: number;
  symbolsExtracted: number;
  lastParsedFile?: string;
}
