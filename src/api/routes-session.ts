// src/api/routes-session.ts
// Session HTTP API routes

import { Express, Request, Response } from 'express';
import type { CCGModulesForAPI } from './http-server.js';

type BroadcastFn = (event: string, data: unknown) => void;

export function setupSessionRoutes(
  app: Express,
  modules: CCGModulesForAPI,
  broadcast: BroadcastFn
): void {
  // Skip if session module not available
  if (!modules.session) {
    return;
  }

  const sessionService = modules.session.getService();

  // GET /api/session/status - Get current session status
  app.get('/api/session/status', async (_req: Request, res: Response) => {
    try {
      const status = sessionService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // GET /api/session/timeline - Get session timeline
  app.get('/api/session/timeline', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 300);
      const events = sessionService.getTimeline(limit);
      const state = sessionService.getState();
      res.json({
        success: true,
        data: {
          sessionId: state.sessionId,
          total: state.timeline.length,
          events,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // GET /api/session/offer - Check for resume offer
  app.get('/api/session/offer', async (_req: Request, res: Response) => {
    try {
      const offer = sessionService.getResumeOffer();
      res.json({ success: true, data: offer });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // POST /api/session/save - Manually save session
  app.post('/api/session/save', async (_req: Request, res: Response) => {
    try {
      const savedPath = await sessionService.save();
      broadcast('session:saved', { path: savedPath });
      res.json({
        success: true,
        data: {
          savedTo: savedPath,
          sessionId: sessionService.getSessionId(),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // POST /api/session/resume - Resume from a session file
  app.post('/api/session/resume', async (req: Request, res: Response) => {
    try {
      let sessionFile = req.body.sessionFile;

      if (!sessionFile) {
        sessionFile = sessionService.findLatestSession();
        if (!sessionFile) {
          res.status(404).json({
            success: false,
            error: 'No previous session found to resume',
          });
          return;
        }
      }

      const resumed = await sessionService.loadFromFile(sessionFile);
      broadcast('session:resumed', {
        sessionId: resumed.sessionId,
        resumedFrom: sessionFile,
      });

      res.json({
        success: true,
        data: {
          sessionId: resumed.sessionId,
          resumedFrom: sessionFile,
          timelineCount: resumed.timeline.length,
          resumeCount: resumed.metadata?.resumeCount,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // POST /api/session/export - Export session to file
  app.post('/api/session/export', async (req: Request, res: Response) => {
    try {
      const outputPath = req.body.outputPath;
      const result = await sessionService.exportToFile(outputPath);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // GET /api/session/replay - Replay timeline events
  app.get('/api/session/replay', async (req: Request, res: Response) => {
    try {
      const from = req.query.from ? parseInt(req.query.from as string) : undefined;
      const to = req.query.to ? parseInt(req.query.to as string) : undefined;
      const result = sessionService.replay({ from, to });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}
