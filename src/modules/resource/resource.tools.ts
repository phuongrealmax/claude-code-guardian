// src/modules/resource/resource.tools.ts

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function getResourceTools(): Tool[] {
  return [
    {
      name: 'resource_status',
      description: 'Get current token usage and checkpoint status',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'resource_update_tokens',
      description: 'Update token usage tracking',
      inputSchema: {
        type: 'object',
        properties: {
          used: {
            type: 'number',
            description: 'Tokens used so far',
          },
          estimated: {
            type: 'number',
            description: 'Estimated total context window',
          },
        },
        required: ['used'],
      },
    },
    {
      name: 'resource_estimate_task',
      description: 'Estimate token usage for a task',
      inputSchema: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Task description',
          },
          filesCount: {
            type: 'number',
            description: 'Number of files to modify',
          },
          linesEstimate: {
            type: 'number',
            description: 'Estimated lines of code',
          },
          hasTests: {
            type: 'boolean',
            description: 'Whether task includes writing tests',
          },
          hasBrowserTesting: {
            type: 'boolean',
            description: 'Whether task includes browser testing',
          },
        },
        required: ['description'],
      },
    },
    {
      name: 'resource_checkpoint_create',
      description: 'Create a checkpoint to save current progress',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Checkpoint name',
          },
          reason: {
            type: 'string',
            enum: ['manual', 'before_risky_operation', 'task_complete'],
            description: 'Reason for checkpoint',
          },
        },
        required: [],
      },
    },
    {
      name: 'resource_checkpoint_list',
      description: 'List all checkpoints',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'resource_checkpoint_restore',
      description: 'Restore from a checkpoint',
      inputSchema: {
        type: 'object',
        properties: {
          checkpointId: {
            type: 'string',
            description: 'Checkpoint ID to restore',
          },
        },
        required: ['checkpointId'],
      },
    },
    {
      name: 'resource_checkpoint_delete',
      description: 'Delete a checkpoint',
      inputSchema: {
        type: 'object',
        properties: {
          checkpointId: {
            type: 'string',
            description: 'Checkpoint ID to delete',
          },
        },
        required: ['checkpointId'],
      },
    },
    // ═══════════════════════════════════════════════════════════════
    //                      TOKEN BUDGET GOVERNOR
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'resource_governor_state',
      description: `Get current token budget governor state. Returns mode (normal/conservative/critical), allowed and blocked actions based on token usage percentage.

Modes:
- normal (< 70%): All actions allowed
- conservative (70-84%): Delta-only responses, no browser testing or full test suites
- critical (≥ 85%): Must checkpoint immediately, only finish tasks and save work

Use this before starting heavy operations to check if they're allowed.`,
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'resource_action_allowed',
      description: 'Check if a specific action is allowed by the token budget governor',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Action to check (e.g., "browser_open", "full_test_suite", "task_decompose")',
          },
        },
        required: ['action'],
      },
    },
    // ═══════════════════════════════════════════════════════════════
    //                      CHECKPOINT DIFF
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'resource_checkpoint_diff',
      description: `Compare two checkpoints and show changes between them.

Returns:
- Files added, modified, deleted
- Line counts changed
- Token usage difference
- Formatted summary

Use this to understand what changed since a checkpoint.`,
      inputSchema: {
        type: 'object',
        properties: {
          fromCheckpointId: {
            type: 'string',
            description: 'Starting checkpoint ID',
          },
          toCheckpointId: {
            type: 'string',
            description: 'Ending checkpoint ID (use "current" for current state)',
          },
          includeUnchanged: {
            type: 'boolean',
            description: 'Include unchanged files in diff (default: false)',
          },
          maxFiles: {
            type: 'number',
            description: 'Maximum files to include in diff',
          },
        },
        required: ['fromCheckpointId'],
      },
    },
  ];
}
