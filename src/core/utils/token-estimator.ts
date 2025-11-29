// src/core/utils/token-estimator.ts

/**
 * Estimate token count for text
 * Based on GPT tokenization (roughly 4 chars per token)
 */
export function estimateTokens(text: string): number {
  // Simple heuristic: ~4 characters per token
  // More accurate would be to use tiktoken
  const charCount = text.length;
  const wordCount = text.split(/\s+/).length;

  // Use weighted average of char-based and word-based estimates
  const charEstimate = Math.ceil(charCount / 4);
  const wordEstimate = Math.ceil(wordCount * 1.3);

  return Math.round((charEstimate + wordEstimate) / 2);
}

/**
 * Estimate tokens for code (more accurate for source files)
 */
export function estimateCodeTokens(code: string): number {
  // Code tends to have more tokens per character due to:
  // - Special characters
  // - Short identifiers
  // - Punctuation

  const lines = code.split('\n');
  let tokens = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line = 1 token
    if (!trimmed) {
      tokens += 1;
      continue;
    }

    // Comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      tokens += Math.ceil(trimmed.length / 4);
      continue;
    }

    // Code line - count elements
    const elements = trimmed.split(/[\s\(\)\[\]\{\}\,\;\:\.\=\+\-\*\/\<\>\!\&\|\?]+/);
    const operators = trimmed.match(/[\(\)\[\]\{\}\,\;\:\.\=\+\-\*\/\<\>\!\&\|\?]+/g) || [];

    tokens += elements.filter(Boolean).length;
    tokens += operators.length;
  }

  return tokens;
}

/**
 * Estimate task complexity based on description
 */
export function estimateTaskComplexity(description: string): {
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  tokenEstimate: number;
  timeEstimate: string;
} {
  const descLower = description.toLowerCase();

  const complexityIndicators = {
    low: ['fix', 'update', 'change', 'rename', 'simple', 'small', 'minor', 'typo', 'comment'],
    medium: ['add', 'create', 'implement', 'feature', 'component', 'function', 'method', 'class'],
    high: ['refactor', 'redesign', 'migrate', 'integrate', 'complex', 'system', 'api', 'database'],
    very_high: ['architecture', 'rewrite', 'overhaul', 'entire', 'complete', 'full', 'major', 'rebuild'],
  };

  const multipliers = {
    low: 1000,
    medium: 3000,
    high: 8000,
    very_high: 20000,
  };

  let complexity: keyof typeof multipliers = 'medium';

  // Check in order from highest to lowest
  for (const level of ['very_high', 'high', 'medium', 'low'] as const) {
    if (complexityIndicators[level].some(kw => descLower.includes(kw))) {
      complexity = level;
      break;
    }
  }

  const tokenEstimate = multipliers[complexity];
  const minutesEstimate = Math.ceil(tokenEstimate / 500); // Rough 500 tokens per minute

  const timeEstimate = minutesEstimate < 60
    ? `${minutesEstimate} minutes`
    : `${Math.ceil(minutesEstimate / 60)} hour(s)`;

  return {
    complexity,
    tokenEstimate,
    timeEstimate,
  };
}
