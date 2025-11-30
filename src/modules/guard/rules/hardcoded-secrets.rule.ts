// src/modules/guard/rules/hardcoded-secrets.rule.ts

import { ValidationIssue } from '../../../core/types.js';
import { IGuardRule, RuleCategory } from '../guard.types.js';

// ═══════════════════════════════════════════════════════════════
//                    HARDCODED SECRETS RULE
// ═══════════════════════════════════════════════════════════════

/**
 * Detects hardcoded secrets, API keys, passwords, and credentials.
 * Critical security rule for preventing credential leaks.
 */
export class HardcodedSecretsRule implements IGuardRule {
  name = 'hardcoded-secrets';
  enabled = true;
  description = 'Detects hardcoded secrets, API keys, passwords, and credentials';
  category: RuleCategory = 'security';

  // Common secret patterns
  private secretPatterns: Array<{
    pattern: RegExp;
    secretType: string;
    severity: 'error' | 'block';
  }> = [
    // API Keys
    {
      pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][a-zA-Z0-9_\-]{20,}["']/i,
      secretType: 'API Key',
      severity: 'block',
    },
    // AWS Access Keys
    {
      pattern: /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/,
      secretType: 'AWS Access Key',
      severity: 'block',
    },
    // AWS Secret Keys
    {
      pattern: /(?:aws[_-]?secret|secret[_-]?key)\s*[:=]\s*["'][A-Za-z0-9\/+=]{40}["']/i,
      secretType: 'AWS Secret Key',
      severity: 'block',
    },
    // Generic Secrets
    {
      pattern: /(?:secret|private[_-]?key)\s*[:=]\s*["'][a-zA-Z0-9_\-]{16,}["']/i,
      secretType: 'Secret/Private Key',
      severity: 'block',
    },
    // Passwords
    {
      pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
      secretType: 'Password',
      severity: 'block',
    },
    // Database Connection Strings
    {
      pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^:\s]+:[^@\s]+@/i,
      secretType: 'Database Connection String with Credentials',
      severity: 'block',
    },
    // JWT Secrets
    {
      pattern: /(?:jwt[_-]?secret|token[_-]?secret)\s*[:=]\s*["'][a-zA-Z0-9_\-]{16,}["']/i,
      secretType: 'JWT Secret',
      severity: 'block',
    },
    // OAuth Tokens
    {
      pattern: /(?:oauth|bearer)[_-]?token\s*[:=]\s*["'][a-zA-Z0-9_\-\.]{20,}["']/i,
      secretType: 'OAuth/Bearer Token',
      severity: 'block',
    },
    // Stripe Keys
    {
      pattern: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/,
      secretType: 'Stripe Secret Key',
      severity: 'block',
    },
    {
      pattern: /pk_(?:live|test)_[a-zA-Z0-9]{24,}/,
      secretType: 'Stripe Publishable Key',
      severity: 'error',
    },
    // GitHub Tokens
    {
      pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/,
      secretType: 'GitHub Token',
      severity: 'block',
    },
    // Slack Tokens
    {
      pattern: /xox[baprs]-[0-9]{10,}-[0-9a-zA-Z]{10,}/,
      secretType: 'Slack Token',
      severity: 'block',
    },
    // Google API Keys
    {
      pattern: /AIza[0-9A-Za-z\-_]{35}/,
      secretType: 'Google API Key',
      severity: 'block',
    },
    // Firebase
    {
      pattern: /(?:firebase|fcm)[_-]?(?:key|token|secret)\s*[:=]\s*["'][a-zA-Z0-9_\-]{20,}["']/i,
      secretType: 'Firebase Credential',
      severity: 'block',
    },
    // SendGrid
    {
      pattern: /SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43}/,
      secretType: 'SendGrid API Key',
      severity: 'block',
    },
    // Twilio
    {
      pattern: /(?:twilio|account[_-]?sid)\s*[:=]\s*["']AC[a-f0-9]{32}["']/i,
      secretType: 'Twilio Account SID',
      severity: 'block',
    },
    // Private Keys (PEM format)
    {
      pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
      secretType: 'Private Key (PEM)',
      severity: 'block',
    },
    // Encryption Keys
    {
      pattern: /(?:encryption|cipher)[_-]?key\s*[:=]\s*["'][a-fA-F0-9]{32,}["']/i,
      secretType: 'Encryption Key',
      severity: 'block',
    },
  ];

  // Safe patterns - environments, placeholders, examples
  private safePatterns = [
    /process\.env\./,                    // Environment variable
    /\$\{?[A-Z_]+\}?/,                   // Env var placeholder
    /\{\{[^}]+\}\}/,                     // Template placeholder
    /your[_-]?(?:api[_-]?)?key/i,        // Placeholder text
    /xxx+|aaa+|123+|example|sample|test|fake|mock|dummy/i, // Obvious placeholders
    /["']<[^>]+>["']/,                   // <YOUR_KEY_HERE> style
    /getenv|environ|config\./i,          // Config/env access
    /\.env(?:\.example|\.sample)?$/,     // .env file reference
  ];

  // File patterns to skip
  private skipFilePatterns = [
    /\.env\.example$/,
    /\.env\.sample$/,
    /\.env\.template$/,
    /config\.example\./,
    /secrets\.example\./,
    /\.test\.|\.spec\.|_test\.|_spec\./,
    /mock|fixture|stub/i,
  ];

  validate(code: string, filename: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Skip certain files
    if (this.shouldSkipFile(filename)) {
      return issues;
    }

    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip if line is a safe pattern
      if (this.isSafeLine(line)) {
        continue;
      }

      // Skip comments that are documentation
      if (this.isDocumentation(line, lines, i)) {
        continue;
      }

      // Check for secret patterns
      for (const { pattern, secretType, severity } of this.secretPatterns) {
        if (pattern.test(line)) {
          // Double check it's not a placeholder
          if (this.looksLikePlaceholder(line)) {
            continue;
          }

          issues.push({
            rule: this.name,
            severity,
            message: `Hardcoded ${secretType} detected`,
            location: {
              file: filename,
              line: i + 1,
              snippet: this.redactSecret(line.trim()),
            },
            suggestion: `Move ${secretType} to environment variables or a secure vault. Use process.env.${this.suggestEnvVar(secretType)} instead.`,
            autoFixable: false,
          });
          break; // One issue per line
        }
      }
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════
  //                      PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private shouldSkipFile(filename: string): boolean {
    return this.skipFilePatterns.some(pattern => pattern.test(filename));
  }

  private isSafeLine(line: string): boolean {
    return this.safePatterns.some(pattern => pattern.test(line));
  }

  private isDocumentation(line: string, lines: string[], index: number): boolean {
    // Check if in a documentation block
    const trimmed = line.trim();

    // JSDoc or multiline comment
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      // Check if it's example/documentation
      if (/example|usage|documentation|readme/i.test(line)) {
        return true;
      }
    }

    // Check surrounding context for documentation markers
    const context = lines.slice(Math.max(0, index - 3), index).join('\n');
    if (/\/\*\*|@example|@see|Example:|Usage:/i.test(context)) {
      return true;
    }

    return false;
  }

  private looksLikePlaceholder(line: string): boolean {
    const placeholderIndicators = [
      /xxx+/i,
      /your[_-]?(?:api)?[_-]?(?:key|token|secret)/i,
      /replace[_-]?(?:this|me|with)/i,
      /\[.*\]/,                           // [YOUR_KEY]
      /<.*>/,                             // <your-key>
      /example|sample|test|fake|mock|dummy|placeholder/i,
      /TODO|FIXME|CHANGEME/i,
    ];

    return placeholderIndicators.some(p => p.test(line));
  }

  private redactSecret(line: string): string {
    // Redact the actual secret value for security
    return line.replace(
      /([:=]\s*["'])[^"']{8,}(["'])/g,
      '$1****REDACTED****$2'
    ).slice(0, 80);
  }

  private suggestEnvVar(secretType: string): string {
    const mapping: Record<string, string> = {
      'API Key': 'API_KEY',
      'AWS Access Key': 'AWS_ACCESS_KEY_ID',
      'AWS Secret Key': 'AWS_SECRET_ACCESS_KEY',
      'Password': 'DB_PASSWORD',
      'JWT Secret': 'JWT_SECRET',
      'Database Connection String with Credentials': 'DATABASE_URL',
      'Stripe Secret Key': 'STRIPE_SECRET_KEY',
      'GitHub Token': 'GITHUB_TOKEN',
      'Google API Key': 'GOOGLE_API_KEY',
      'Encryption Key': 'ENCRYPTION_KEY',
    };

    return mapping[secretType] || secretType.toUpperCase().replace(/\s+/g, '_');
  }
}
