// src/modules/session/session.tools.ts
// MCP tools for session management

import { SessionService } from './session.service.js';

export function getSessionToolDefinitions() {
  return [
    {
      name: 'session_status',
      description: 'Get current session status including ID, timeline count, and auto-save state.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'session_timeline',
      description: 'Show recent session timeline events (task completions, phase transitions, checkpoints).',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum events to return (default: 50, max: 300)',
            default: 50,
          },
        },
      },
    },
    {
      name: 'session_export',
      description: 'Export current session state to a JSON file for backup or sharing.',
      inputSchema: {
        type: 'object',
        properties: {
          outputPath: {
            type: 'string',
            description: 'Output file path (default: .ccg/sessions/export-<timestamp>.json)',
          },
        },
      },
    },
    {
      name: 'session_resume',
      description: 'Resume from a previous session file. Restores task context, timeline, and module states.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionFile: {
            type: 'string',
            description: 'Path to session file to resume from. If not provided, uses most recent session.',
          },
        },
      },
    },
    {
      name: 'session_replay',
      description: 'Replay session timeline in dry-run mode for debugging. Shows what happened without re-executing.',
      inputSchema: {
        type: 'object',
        properties: {
          from: {
            type: 'number',
            description: 'Start index (0-based)',
          },
          to: {
            type: 'number',
            description: 'End index (exclusive)',
          },
        },
      },
    },
    {
      name: 'session_save',
      description: 'Manually save the current session state. Useful before risky operations.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'session_offer',
      description: 'Check if a previous session is available for resume. Called on reconnect.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

export function createSessionToolHandlers(session: SessionService) {
  return {
    session_status: async () => {
      return session.getStatus();
    },

    session_timeline: async (args: { limit?: number }) => {
      const limit = Math.max(1, Math.min(args.limit ?? 50, 300));
      const state = session.getState();
      return {
        sessionId: state.sessionId,
        updatedAt: state.updatedAt,
        total: state.timeline.length,
        events: session.getTimeline(limit),
      };
    },

    session_export: async (args: { outputPath?: string }) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = `.ccg/sessions/export-${timestamp}.json`;
      const outputPath = args.outputPath || defaultPath;
      return await session.exportToFile(outputPath);
    },

    session_resume: async (args: { sessionFile?: string }) => {
      let targetFile = args.sessionFile;

      if (!targetFile) {
        targetFile = session.findLatestSession() ?? undefined;
        if (!targetFile) {
          return {
            success: false,
            error: 'No previous session found to resume',
          };
        }
      }

      try {
        const resumed = await session.loadFromFile(targetFile);
        return {
          success: true,
          sessionId: resumed.sessionId,
          resumedFrom: targetFile,
          timelineCount: resumed.timeline.length,
          latestCheckpoint: resumed.latestCheckpointId,
          resumeCount: resumed.metadata?.resumeCount,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to resume session',
        };
      }
    },

    session_replay: async (args: { from?: number; to?: number }) => {
      return session.replay(args);
    },

    session_save: async () => {
      const savedPath = await session.save();
      return {
        success: true,
        savedTo: savedPath,
        sessionId: session.getSessionId(),
      };
    },

    session_offer: async () => {
      return session.getResumeOffer();
    },
  };
}

export type SessionToolHandlers = ReturnType<typeof createSessionToolHandlers>;
