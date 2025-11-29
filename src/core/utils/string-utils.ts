// src/core/utils/string-utils.ts

/**
 * Convert string to different naming conventions
 */

export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^./, c => c.toLowerCase());
}

export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^./, c => c.toUpperCase());
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

export function toScreamingSnakeCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number, ellipsis: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Pluralize a word
 */
export function pluralize(word: string, count: number): string {
  if (count === 1) return word;

  // Simple pluralization rules
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

/**
 * Format bytes in human-readable form
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Generate a random string
 */
export function randomString(length: number, chars: string = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Escape string for regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if string is valid identifier
 */
export function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}
