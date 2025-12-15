// src/api/http-server.ts
// HTTP API Server for CCG Dashboard Integration

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventBus } from '../core/event-bus.js';
import { Logger } from '../core/logger.js';
import { StateManager } from '../core/state-manager.js';
import { setupRoutes, setWsClients } from './routes.js';

import { MemoryModule } from '../modules/memory/index.js';
import { GuardModule } from '../modules/guard/index.js';
import { WorkflowModule } from '../modules/workflow/index.js';
import { ProcessModule } from '../modules/process/index.js';
import { DocumentsModule } from '../modules/documents/index.js';
import { AgentsModule } from '../modules/agents/index.js';
import { LatentModule } from '../modules/latent/index.js';
import { SessionModule } from '../modules/session/index.js';

// Types
export interface CCGModulesForAPI {
  memory: MemoryModule;
  guard: GuardModule;
  workflow: WorkflowModule;
  process: ProcessModule;
  documents: DocumentsModule;
  agents: AgentsModule;
  latent: LatentModule;
  session?: SessionModule;
}

export interface APIServerConfig {
  port: number;
  corsOrigins: string[];
}

// WebSocket clients
const wsClients = new Set<WebSocket>();

// Broadcast to all WebSocket clients
function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Create HTTP API Server
export function createAPIServer(
  modules: CCGModulesForAPI,
  stateManager: StateManager,
  eventBus: EventBus,
  logger: Logger,
  config: APIServerConfig = { port: 3334, corsOrigins: ['http://localhost:3333'] }
): { app: Express; server: HttpServer; wss: WebSocketServer; start: () => void } {
  const app = express();

  // Middleware
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
  }));
  app.use(express.json());

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`API ${req.method} ${req.path}`);
    next();
  });

  // Share wsClients with routes module
  setWsClients(wsClients);

  // Setup all routes
  setupRoutes(app, modules, stateManager);

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  });

  // Create HTTP server
  const server = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    logger.info('WebSocket client connected');
    wsClients.add(ws);

    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
      wsClients.delete(ws);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      wsClients.delete(ws);
    });

    // Handle incoming messages (for reconnect requests)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'session:check_resume' && modules.session) {
          const offer = modules.session.getService().getResumeOffer();
          ws.send(JSON.stringify({
            event: 'session:resume_offer',
            data: offer,
            timestamp: new Date().toISOString(),
          }));
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Send initial status with resume offer
    const resumeOffer = modules.session?.getService().getResumeOffer();
    ws.send(JSON.stringify({
      event: 'connected',
      data: {
        message: 'Connected to CCG API',
        resumeOffer: resumeOffer ?? { available: false },
      },
      timestamp: new Date().toISOString(),
    }));
  });

  // Subscribe to EventBus events and broadcast to WebSocket clients
  eventBus.on('memory:store', (data) => broadcast('memory:store', data));
  eventBus.on('memory:recall', (data) => broadcast('memory:recall', data));
  eventBus.on('memory:forget', (data) => broadcast('memory:forget', data));
  eventBus.on('task:create', (data) => broadcast('task:create', data));
  eventBus.on('task:start', (data) => broadcast('task:start', data));
  eventBus.on('task:complete', (data) => broadcast('task:complete', data));
  eventBus.on('task:fail', (data) => broadcast('task:fail', data));
  eventBus.on('guard:warning', (data) => broadcast('guard:warning', data));
  eventBus.on('guard:block', (data) => broadcast('guard:block', data));
  eventBus.on('guard:pass', (data) => broadcast('guard:pass', data));
  // Session events
  eventBus.on('session:saved', (data) => broadcast('session:saved', data));
  eventBus.on('session:resumed', (data) => broadcast('session:resumed', data));
  eventBus.on('session:event', (data) => broadcast('session:event', data));

  // Start function
  const start = () => {
    server.listen(config.port, () => {
      logger.info(`CCG API Server running on http://localhost:${config.port}`);
      logger.info(`WebSocket available on ws://localhost:${config.port}`);
    });
  };

  return { app, server, wss, start };
}
