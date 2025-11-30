// src/modules/guard/rules/sql-injection.rule.ts

import { ValidationIssue } from '../../../core/types.js';
import { IGuardRule, RuleCategory } from '../guard.types.js';

// ═══════════════════════════════════════════════════════════════
//                      SQL INJECTION RULE
// ═══════════════════════════════════════════════════════════════

/**
 * Detects potential SQL injection vulnerabilities.
 * Identifies string concatenation in SQL queries instead of parameterized queries.
 */
export class SqlInjectionRule implements IGuardRule {
  name = 'sql-injection';
  enabled = true;
  description = 'Detects potential SQL injection vulnerabilities';
  category: RuleCategory = 'security';

  // SQL keywords that indicate a query
  private sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
    'ALTER', 'TRUNCATE', 'EXEC', 'EXECUTE', 'UNION', 'JOIN',
    'WHERE', 'FROM', 'INTO', 'VALUES', 'SET', 'ORDER BY',
  ];

  // Dangerous patterns - string concatenation in SQL
  private dangerousPatterns: Array<{ pattern: RegExp; message: string; severity: 'error' | 'block' }> = [
    // String concatenation with + operator
    {
      pattern: /"SELECT\s+.*"\s*\+\s*(?:\w+|['"`])/i,
      message: 'SQL query built with string concatenation',
      severity: 'block',
    },
    {
      pattern: /'SELECT\s+.*'\s*\+\s*(?:\w+|['"`])/i,
      message: 'SQL query built with string concatenation',
      severity: 'block',
    },
    // Template literals with variable interpolation
    {
      pattern: /`SELECT\s+[^`]*\$\{[^}]+\}[^`]*`/i,
      message: 'SQL query with unescaped template literal interpolation',
      severity: 'block',
    },
    {
      pattern: /`INSERT\s+INTO\s+[^`]*\$\{[^}]+\}[^`]*`/i,
      message: 'INSERT query with unescaped template literal interpolation',
      severity: 'block',
    },
    {
      pattern: /`UPDATE\s+[^`]*\$\{[^}]+\}[^`]*`/i,
      message: 'UPDATE query with unescaped template literal interpolation',
      severity: 'block',
    },
    {
      pattern: /`DELETE\s+FROM\s+[^`]*\$\{[^}]+\}[^`]*`/i,
      message: 'DELETE query with unescaped template literal interpolation',
      severity: 'block',
    },
    // f-strings in Python
    {
      pattern: /f["']SELECT\s+.*\{[^}]+\}.*["']/i,
      message: 'SQL query built with f-string interpolation',
      severity: 'block',
    },
    // .format() in Python
    {
      pattern: /["']SELECT\s+.*["']\.format\s*\(/i,
      message: 'SQL query built with .format()',
      severity: 'block',
    },
    // % formatting in Python
    {
      pattern: /["']SELECT\s+.*%s.*["']\s*%/i,
      message: 'SQL query built with % formatting',
      severity: 'block',
    },
    // PHP string concatenation
    {
      pattern: /\$(?:sql|query|stmt)\s*=\s*["'](?:SELECT|INSERT|UPDATE|DELETE).*["']\s*\.\s*\$/i,
      message: 'PHP SQL query with variable concatenation',
      severity: 'block',
    },
    // Java/C# string concatenation
    {
      pattern: /(?:String|string)\s+(?:sql|query)\s*=\s*["'](?:SELECT|INSERT|UPDATE|DELETE).*["']\s*\+/i,
      message: 'SQL query string concatenation detected',
      severity: 'block',
    },
    // Direct user input in query
    {
      pattern: /(?:query|execute|exec)\s*\(\s*["'](?:SELECT|INSERT|UPDATE|DELETE)[^"']*["']\s*\+\s*(?:req\.|request\.|params\.|body\.)/i,
      message: 'User input directly concatenated into SQL query',
      severity: 'block',
    },
  ];

  // Patterns that indicate safe usage
  private safePatterns = [
    /\?\s*,/,                           // Parameterized query with ?
    /\$\d+/,                            // PostgreSQL $1, $2
    /:[\w]+/,                           // Named parameters :name
    /\@[\w]+/,                          // SQL Server @param
    /prepare\s*\(/i,                    // Prepared statement
    /parameterized/i,                   // Comment about parameterized
    /sanitize|escape|quote/i,           // Sanitization functions
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const context = this.getContext(lines, i);

      // Skip if line appears to use safe patterns
      if (this.isSafePattern(line) || this.isSafePattern(context)) {
        continue;
      }

      // Check for dangerous patterns
      for (const { pattern, message, severity } of this.dangerousPatterns) {
        if (pattern.test(line)) {
          issues.push({
            rule: this.name,
            severity,
            message: `SQL Injection Risk: ${message}`,
            location: {
              file: filename,
              line: i + 1,
              snippet: line.trim().slice(0, 100),
            },
            suggestion: 'Use parameterized queries or prepared statements instead of string concatenation',
            autoFixable: false,
          });
          break; // One issue per line
        }
      }

      // Additional check: raw SQL with variable in WHERE clause
      if (this.hasRawSqlWithVariable(line)) {
        issues.push({
          rule: this.name,
          severity: 'error',
          message: 'Potential SQL injection: variable used directly in SQL WHERE clause',
          location: {
            file: filename,
            line: i + 1,
            snippet: line.trim().slice(0, 100),
          },
          suggestion: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId])',
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private getContext(lines: string[], index: number): string {
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    return lines.slice(start, end).join('\n');
  }

  private isSafePattern(text: string): boolean {
    return this.safePatterns.some(pattern => pattern.test(text));
  }

  private hasRawSqlWithVariable(line: string): boolean {
    // Check for patterns like: WHERE id = " + userId or WHERE id = ' + userId
    const whereWithConcat = /WHERE\s+\w+\s*=\s*["']\s*\+\s*\w+/i;

    // Check for patterns like: WHERE id = ${userId} (template literal without escaping)
    const whereWithTemplate = /WHERE\s+\w+\s*=\s*\$\{[^}]+\}/i;

    // Check for patterns like: WHERE id = ' . $userId (PHP)
    const whereWithPhp = /WHERE\s+\w+\s*=\s*["']\s*\.\s*\$/i;

    return whereWithConcat.test(line) || whereWithTemplate.test(line) || whereWithPhp.test(line);
  }
}
