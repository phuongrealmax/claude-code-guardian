// src/core/ccg-run/prompt-translator.ts
/**
 * Prompt Translator - Translates natural language prompts to tool sequences
 */

import { TranslatedSpec, ToolStep, PromptPattern, TinyPlannerResponse } from './types.js';

// ═══════════════════════════════════════════════════════════════
//                      PATTERN DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const PROMPT_PATTERNS: PromptPattern[] = [
  // Code Analysis
  {
    pattern: /(?:run\s+)?(?:quick\s+)?analysis|analyze\s+(?:code|codebase)/i,
    tools: [
      { tool: 'code_quick_analysis', args: { strategy: 'mixed', maxHotspots: 10 } },
    ],
    confidence: 0.9,
  },
  {
    pattern: /scan\s+(?:repo|repository)|hotspots?/i,
    tools: [
      { tool: 'code_scan_repository', args: {} },
      { tool: 'code_hotspots', args: { strategy: 'mixed' } },
    ],
    confidence: 0.85,
  },

  // Validation
  {
    pattern: /validate|check\s+code|guard/i,
    tools: [
      { tool: 'guard_validate', args: { ruleset: 'default' } },
    ],
    confidence: 0.85,
  },
  {
    pattern: /security\s+(?:check|audit|scan)/i,
    tools: [
      { tool: 'guard_validate', args: { ruleset: 'security' } },
    ],
    confidence: 0.9,
  },

  // Testing
  {
    pattern: /run\s+tests?|test\s+(?:suite|all)/i,
    tools: [
      { tool: 'testing_run', args: {} },
    ],
    confidence: 0.9,
  },
  {
    pattern: /run\s+affected\s+tests?/i,
    tools: [
      { tool: 'testing_run_affected', args: { files: [] } },
    ],
    confidence: 0.85,
  },

  // Memory
  {
    pattern: /(?:check|show|list)\s+memory|memory\s+(?:status|summary)/i,
    tools: [
      { tool: 'memory_summary', args: {} },
    ],
    confidence: 0.9,
  },
  {
    pattern: /(?:store|save|remember)\s+(?:that|this|:)/i,
    tools: [
      { tool: 'memory_store', args: { type: 'note', importance: 5 } },
    ],
    confidence: 0.8,
  },
  {
    pattern: /(?:recall|remember|what\s+(?:was|is))\s+/i,
    tools: [
      { tool: 'memory_recall', args: { limit: 10 } },
    ],
    confidence: 0.8,
  },

  // Workflow
  {
    pattern: /(?:create|start|new)\s+task/i,
    tools: [
      { tool: 'workflow_task_create', args: {} },
    ],
    confidence: 0.85,
  },
  {
    pattern: /(?:list|show)\s+tasks?/i,
    tools: [
      { tool: 'workflow_task_list', args: {} },
    ],
    confidence: 0.9,
  },
  {
    pattern: /(?:complete|done|finish)\s+(?:current\s+)?task/i,
    tools: [
      { tool: 'workflow_task_complete', args: {} },
    ],
    confidence: 0.85,
  },

  // Process
  {
    pattern: /(?:check|list)\s+(?:port|process)/i,
    tools: [
      { tool: 'process_list', args: {} },
    ],
    confidence: 0.85,
  },
  {
    pattern: /(?:kill|stop)\s+(?:process|port)\s*(\d+)?/i,
    tools: [
      { tool: 'process_kill_on_port', args: {} },
    ],
    confidence: 0.8,
  },

  // Documents
  {
    pattern: /(?:scan|index)\s+docs?|document\s+scan/i,
    tools: [
      { tool: 'documents_scan', args: {} },
    ],
    confidence: 0.85,
  },
  {
    pattern: /(?:search|find)\s+(?:in\s+)?docs?/i,
    tools: [
      { tool: 'documents_search', args: {} },
    ],
    confidence: 0.8,
  },

  // RAG
  {
    pattern: /(?:build|create|index)\s+(?:rag|search)\s+index/i,
    tools: [
      { tool: 'rag_build_index', args: {} },
    ],
    confidence: 0.9,
  },
  {
    pattern: /(?:semantic\s+)?(?:search|query)\s+(?:code|codebase)/i,
    tools: [
      { tool: 'rag_query', args: {} },
    ],
    confidence: 0.85,
  },

  // Resource/Checkpoint
  {
    pattern: /(?:create|save)\s+checkpoint/i,
    tools: [
      { tool: 'resource_checkpoint_create', args: { reason: 'manual' } },
    ],
    confidence: 0.9,
  },
  {
    pattern: /(?:list|show)\s+checkpoints?/i,
    tools: [
      { tool: 'resource_checkpoint_list', args: {} },
    ],
    confidence: 0.9,
  },

  // Status
  {
    pattern: /(?:show\s+)?status|(?:what'?s\s+)?(?:the\s+)?status/i,
    tools: [
      { tool: 'session_status', args: {} },
      { tool: 'workflow_status', args: {} },
    ],
    confidence: 0.85,
  },

  // Decompose task
  {
    pattern: /(?:break\s+down|decompose|split)\s+(?:this\s+)?task/i,
    tools: [
      { tool: 'auto_decompose_task', args: {} },
    ],
    confidence: 0.85,
  },
];

// ═══════════════════════════════════════════════════════════════
//                      TRANSLATOR
// ═══════════════════════════════════════════════════════════════

export function translatePrompt(prompt: string): TranslatedSpec {
  const normalizedPrompt = prompt.toLowerCase().trim();

  // Try pattern matching
  for (const { pattern, tools, confidence } of PROMPT_PATTERNS) {
    if (pattern.test(normalizedPrompt)) {
      // Extract dynamic args from prompt if needed
      const enrichedTools = tools.map(tool => enrichToolArgs(tool, prompt));
      return {
        steps: enrichedTools,
        confidence,
        source: 'pattern',
      };
    }
  }

  // Fallback: return low confidence with auto_decompose_task
  return {
    steps: [
      {
        tool: 'auto_decompose_task',
        args: {
          taskName: extractTaskName(prompt),
          taskDescription: prompt,
        },
      },
    ],
    confidence: 0.3, // Low confidence for unrecognized prompts
    source: 'pattern',
  };
}

function enrichToolArgs(tool: ToolStep, prompt: string): ToolStep {
  const args = { ...tool.args };

  // Extract query for search/recall tools
  if (tool.tool.includes('recall') || tool.tool.includes('search') || tool.tool.includes('query')) {
    args.query = extractQuery(prompt);
  }

  // Extract content for store tools
  if (tool.tool.includes('store')) {
    args.content = extractContent(prompt);
  }

  // Extract task name for task tools
  if (tool.tool.includes('task_create') || tool.tool.includes('decompose')) {
    args.name = args.name || extractTaskName(prompt);
  }

  // Extract port number
  if (tool.tool.includes('port')) {
    const portMatch = prompt.match(/\b(\d{4,5})\b/);
    if (portMatch) {
      args.port = parseInt(portMatch[1], 10);
    }
  }

  return { ...tool, args };
}

function extractQuery(prompt: string): string {
  // Remove common prefixes
  return prompt
    .replace(/^(?:recall|remember|search|find|query|what\s+(?:was|is))\s*/i, '')
    .replace(/\?$/, '')
    .trim();
}

function extractContent(prompt: string): string {
  // Remove common prefixes
  return prompt
    .replace(/^(?:store|save|remember)\s*(?:that|this|:)?\s*/i, '')
    .trim();
}

function extractTaskName(prompt: string): string {
  // Take first 50 chars as task name
  const name = prompt.substring(0, 50);
  return name.length < prompt.length ? name + '...' : name;
}

// ═══════════════════════════════════════════════════════════════
//                      TINY PLANNER PROVIDER
// ═══════════════════════════════════════════════════════════════

interface TinyPlannerApiResponse {
  steps?: Array<{ tool: string; args: Record<string, unknown> }>;
  confidence?: number;
}

export async function translateWithTinyPlanner(
  prompt: string,
  allowedTools: string[]
): Promise<TinyPlannerResponse | null> {
  const tinyUrl = process.env.CCG_TINY_TRANSLATOR_URL;
  if (!tinyUrl) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${tinyUrl}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        allowedTools,
        specVersion: '1.0',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as TinyPlannerApiResponse;

    // Validate response shape
    if (!data.steps || typeof data.confidence !== 'number') {
      return null;
    }

    return {
      steps: data.steps,
      confidence: data.confidence,
    };
  } catch {
    // Fallback on any error
    return null;
  }
}
