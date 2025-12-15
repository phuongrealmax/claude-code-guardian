// src/api/routes.ts

/**
 * API Route Setup
 *
 * Main entry point for all API routes.
 * Individual route handlers are extracted to separate files.
 */

import { Express, Request, Response } from 'express';
import { WebSocket } from 'ws';
import { StateManager } from '../core/state-manager.js';
import type { CCGModulesForAPI } from './http-server.js';
import { setupMemoryRoutes } from './routes-memory.js';
import { setupWorkflowRoutes } from './routes-workflow.js';
import { setupSessionRoutes } from './routes-session.js';
import {
  setupAgentsRoutes,
  setupGuardRoutes,
  setupLatentRoutes,
  setupDocumentsRoutes,
  setupProcessRoutes,
} from './routes-other.js';

// WebSocket clients (shared with main server)
let wsClients: Set<WebSocket>;

export function setWsClients(clients: Set<WebSocket>): void {
  wsClients = clients;
}

// Broadcast to all WebSocket clients
function broadcast(event: string, data: unknown) {
  if (!wsClients) return;
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//                      ROUTE SETUP
// ═══════════════════════════════════════════════════════════════

export function setupRoutes(
  app: Express,
  modules: CCGModulesForAPI,
  stateManager: StateManager
): void {
  setupStatusRoute(app, modules, stateManager);
  setupMemoryRoutes(app, modules, broadcast);
  setupWorkflowRoutes(app, modules, broadcast);
  setupSessionRoutes(app, modules, broadcast);
  setupAgentsRoutes(app, modules);
  setupGuardRoutes(app, modules, broadcast);
  setupLatentRoutes(app, modules);
  setupDocumentsRoutes(app, modules, broadcast);
  setupProcessRoutes(app, modules, broadcast);
}

// ═══════════════════════════════════════════════════════════════
//                      STATUS ENDPOINT
// ═══════════════════════════════════════════════════════════════

function setupStatusRoute(
  app: Express,
  modules: CCGModulesForAPI,
  stateManager: StateManager
): void {
  app.get('/api/status', async (_req: Request, res: Response) => {
    try {
      const session = stateManager.getSession();
      const memoryStatus = modules.memory.getStatus();
      const guardStatus = modules.guard.getStatus();
      const workflowStatus = modules.workflow.getStatus();

      res.json({
        success: true,
        data: {
          session: session ? {
            id: session.id,
            status: session.status,
            startedAt: session.startedAt.toISOString(),
            active: true,
          } : { active: false },
          modules: {
            memory: memoryStatus,
            guard: guardStatus,
            workflow: workflowStatus,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}
