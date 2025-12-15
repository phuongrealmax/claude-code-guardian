/**
 * AST Service - Expose code parsing as MCP-accessible service
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { parseSourceFile, detectLanguage } from '../rag/code-parser.js';
import {
  ASTModuleConfig,
  ASTModuleStatus,
  ASTParseResult,
  ASTSymbol,
  ASTDependency,
  ASTDependencyGraph,
  DEFAULT_AST_CONFIG,
} from './ast.types.js';

export class ASTService {
  private config: ASTModuleConfig;
  private logger: Logger;

  // Stats
  private filesParsed: number = 0;
  private symbolsExtracted: number = 0;
  private lastParsedFile?: string;

  constructor(
    private eventBus: EventBus,
    config?: Partial<ASTModuleConfig>
  ) {
    this.config = { ...DEFAULT_AST_CONFIG, ...config };
    this.logger = new Logger('info', 'ASTService');
  }

  /**
   * Parse a single file and extract symbols
   */
  async parseFile(filePath: string): Promise<ASTParseResult> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(absolutePath);
    if (stats.size > this.config.maxFileSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const language = detectLanguage(absolutePath);

    if (!this.config.supportedLanguages.includes(language) && language !== 'unknown') {
      this.logger.warn(`Language ${language} not in supported list, parsing anyway`);
    }

    const { chunks, errors } = parseSourceFile(absolutePath, content, language);
    const lines = content.split('\n');

    const symbols: ASTSymbol[] = chunks.map(chunk => ({
      name: chunk.name,
      type: chunk.type as ASTSymbol['type'],
      signature: chunk.signature,
      docstring: this.config.includeDocstrings ? chunk.docstring : undefined,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      filePath: chunk.filePath,
      language: chunk.language,
    }));

    // Extract imports and exports
    const imports = this.extractImportPaths(content, language);
    const exports = this.extractExportNames(content, language);

    // Update stats
    this.filesParsed++;
    this.symbolsExtracted += symbols.length;
    this.lastParsedFile = absolutePath;

    // Emit event
    this.eventBus.emit({
      type: 'ast:file:parsed',
      timestamp: new Date(),
      data: { filePath: absolutePath, symbolCount: symbols.length },
    });

    return {
      filePath: absolutePath,
      language,
      symbols,
      imports,
      exports,
      lineCount: lines.length,
      errors,
    };
  }

  /**
   * Extract symbols from a file
   */
  async getSymbols(
    filePath: string,
    options?: { types?: string[]; namePattern?: string }
  ): Promise<ASTSymbol[]> {
    const result = await this.parseFile(filePath);
    let symbols = result.symbols;

    // Filter by type
    if (options?.types && options.types.length > 0) {
      symbols = symbols.filter(s => options.types!.includes(s.type));
    }

    // Filter by name pattern
    if (options?.namePattern) {
      const regex = new RegExp(options.namePattern, 'i');
      symbols = symbols.filter(s => regex.test(s.name));
    }

    return symbols;
  }

  /**
   * Build dependency graph for a directory
   */
  async buildDependencyGraph(
    dirPath: string,
    options?: { include?: string[]; exclude?: string[] }
  ): Promise<ASTDependencyGraph> {
    const absoluteDir = path.resolve(dirPath);

    if (!fs.existsSync(absoluteDir)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    // Find all source files
    const defaultInclude = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go'];
    const defaultExclude = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

    const includePatterns = options?.include || defaultInclude;
    const excludePatterns = options?.exclude || defaultExclude;

    const files: string[] = [];
    for (const pattern of includePatterns) {
      const matches = await glob(pattern, {
        cwd: absoluteDir,
        ignore: excludePatterns,
        absolute: true,
      });
      files.push(...matches);
    }

    const dependencies: ASTDependency[] = [];
    const fileSet = new Set(files);
    const importedFiles = new Set<string>();

    // Parse each file and extract dependencies
    for (const file of files) {
      try {
        const result = await this.parseFile(file);

        for (const imp of result.imports) {
          // Resolve relative imports
          const resolved = this.resolveImport(imp, file, absoluteDir);
          if (resolved && fileSet.has(resolved)) {
            dependencies.push({
              source: file,
              target: resolved,
              type: 'import',
            });
            importedFiles.add(resolved);
          }
        }

        // Check for extends/implements in classes
        for (const symbol of result.symbols) {
          if (symbol.type === 'class' && symbol.signature) {
            const extendsMatch = symbol.signature.match(/extends\s+(\w+)/);
            const implementsMatch = symbol.signature.match(/implements\s+([\w,\s]+)/);

            if (extendsMatch) {
              dependencies.push({
                source: file,
                target: extendsMatch[1],
                type: 'extends',
                line: symbol.startLine,
              });
            }

            if (implementsMatch) {
              const interfaces = implementsMatch[1].split(',').map(s => s.trim());
              for (const iface of interfaces) {
                dependencies.push({
                  source: file,
                  target: iface,
                  type: 'implements',
                  line: symbol.startLine,
                });
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to parse ${file}:`, error);
      }
    }

    // Find entry points (files not imported by others)
    const entryPoints = files.filter(f => !importedFiles.has(f));

    // Find orphans (files with no imports and not imported)
    const filesWithImports = new Set(dependencies.map(d => d.source));
    const orphans = files.filter(f => !importedFiles.has(f) && !filesWithImports.has(f));

    return {
      files,
      dependencies,
      entryPoints,
      orphans,
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.config.supportedLanguages;
  }

  /**
   * Get module status
   */
  getStatus(): ASTModuleStatus {
    return {
      enabled: this.config.enabled,
      supportedLanguages: this.config.supportedLanguages,
      filesParsed: this.filesParsed,
      symbolsExtracted: this.symbolsExtracted,
      lastParsedFile: this.lastParsedFile,
    };
  }

  /**
   * Extract import paths from content
   */
  private extractImportPaths(content: string, language: string): string[] {
    const imports: string[] = [];

    if (language === 'typescript' || language === 'javascript') {
      // ES imports
      const esImportRegex = /import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]+\}|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = esImportRegex.exec(content)) !== null) {
        if (match[1]) imports.push(match[1]);
      }

      // CommonJS require
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (language === 'python') {
      // Python imports
      const fromImportRegex = /from\s+([\w.]+)\s+import/g;
      const importRegex = /^import\s+([\w.]+)/gm;
      let match;
      while ((match = fromImportRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (language === 'go') {
      // Go imports
      const goImportRegex = /import\s+(?:\(\s*([\s\S]*?)\s*\)|"([^"]+)")/g;
      let match;
      while ((match = goImportRegex.exec(content)) !== null) {
        if (match[1]) {
          // Multiple imports in parentheses
          const multiImports = match[1].match(/"([^"]+)"/g);
          if (multiImports) {
            imports.push(...multiImports.map(m => m.replace(/"/g, '')));
          }
        } else if (match[2]) {
          imports.push(match[2]);
        }
      }
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  /**
   * Extract export names from content
   */
  private extractExportNames(content: string, language: string): string[] {
    const exports: string[] = [];

    if (language === 'typescript' || language === 'javascript') {
      // Named exports
      const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
      let match;
      while ((match = namedExportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }

      // Export list
      const exportListRegex = /export\s+\{([^}]+)\}/g;
      while ((match = exportListRegex.exec(content)) !== null) {
        const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
        exports.push(...names);
      }

      // Default export
      if (/export\s+default/.test(content)) {
        exports.push('default');
      }
    }

    return [...new Set(exports)];
  }

  /**
   * Resolve import path to absolute file path
   */
  private resolveImport(importPath: string, fromFile: string, rootDir: string): string | null {
    // Skip external packages
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }

    const fromDir = path.dirname(fromFile);
    let resolved = path.resolve(fromDir, importPath);

    // Try with extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', ''];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt)) {
        return withExt;
      }

      // Try index file
      const indexPath = path.join(resolved, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }
}
