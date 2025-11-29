// src/core/utils/code-analyzer.ts

/**
 * Analyze code for various patterns
 */

export interface CodeAnalysis {
  language: string;
  lines: number;
  functions: number;
  classes: number;
  imports: number;
  exports: number;
  comments: number;
  complexity: 'low' | 'medium' | 'high';
}

/**
 * Detect programming language from file extension or content
 */
export function detectLanguage(filename: string, content?: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const extMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript-react',
    js: 'javascript',
    jsx: 'javascript-react',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    php: 'php',
    swift: 'swift',
    md: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sql: 'sql',
  };

  return extMap[ext || ''] || 'unknown';
}

/**
 * Analyze code structure
 */
export function analyzeCode(code: string, language: string): CodeAnalysis {
  const lines = code.split('\n');
  let functions = 0;
  let classes = 0;
  let imports = 0;
  let exports = 0;
  let comments = 0;

  const isJS = ['javascript', 'typescript', 'javascript-react', 'typescript-react'].includes(language);
  const isPython = language === 'python';

  for (const line of lines) {
    const trimmed = line.trim();

    // Count comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      comments++;
    }

    // Count functions
    if (isJS) {
      if (/(?:function|const|let|var)\s+\w+\s*(?:=\s*)?(?:async\s*)?\(/.test(trimmed)) {
        functions++;
      }
      if (/=>\s*\{/.test(trimmed)) {
        functions++;
      }
    } else if (isPython) {
      if (/^def\s+\w+\s*\(/.test(trimmed)) {
        functions++;
      }
    }

    // Count classes
    if (/^(?:export\s+)?(?:abstract\s+)?class\s+\w+/.test(trimmed)) {
      classes++;
    } else if (isPython && /^class\s+\w+/.test(trimmed)) {
      classes++;
    }

    // Count imports
    if (/^import\s/.test(trimmed) || /^from\s+\S+\s+import/.test(trimmed)) {
      imports++;
    }

    // Count exports
    if (/^export\s/.test(trimmed)) {
      exports++;
    }
  }

  // Determine complexity
  const totalStructures = functions + classes;
  let complexity: 'low' | 'medium' | 'high' = 'low';

  if (totalStructures > 20 || lines.length > 500) {
    complexity = 'high';
  } else if (totalStructures > 10 || lines.length > 200) {
    complexity = 'medium';
  }

  return {
    language,
    lines: lines.length,
    functions,
    classes,
    imports,
    exports,
    comments,
    complexity,
  };
}

/**
 * Check for emoji in code
 */
export function containsEmoji(text: string): boolean {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(text);
}

/**
 * Check for problematic unicode in code
 */
export function containsProblematicUnicode(text: string): boolean {
  // Check for characters that look like ASCII but aren't
  const confusables = /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/;
  return confusables.test(text);
}

/**
 * Find empty catch blocks
 */
export function findEmptyCatchBlocks(code: string): { line: number; snippet: string }[] {
  const results: { line: number; snippet: string }[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for catch followed by empty block
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
      results.push({
        line: i + 1,
        snippet: line.trim(),
      });
    }

    // Multi-line empty catch
    if (/catch\s*\([^)]*\)\s*\{$/.test(line.trim())) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine === '}') {
        results.push({
          line: i + 1,
          snippet: `${line.trim()}\n${nextLine}`,
        });
      }
    }
  }

  return results;
}

/**
 * Find commented out code blocks
 */
export function findCommentedCode(code: string): { startLine: number; endLine: number; content: string }[] {
  const results: { startLine: number; endLine: number; content: string }[] = [];
  const lines = code.split('\n');

  let inCommentBlock = false;
  let blockStart = 0;
  let blockContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Single line comment that looks like code
    if (line.startsWith('//') && /[;{}()=]/.test(line)) {
      if (!inCommentBlock) {
        inCommentBlock = true;
        blockStart = i + 1;
        blockContent = line;
      } else {
        blockContent += '\n' + line;
      }
    } else if (inCommentBlock) {
      // End of comment block
      if (blockContent.split('\n').length >= 3) {
        results.push({
          startLine: blockStart,
          endLine: i,
          content: blockContent,
        });
      }
      inCommentBlock = false;
      blockContent = '';
    }
  }

  return results;
}
