// src/modules/session/session.types.ts
// Session persistence and resume types

export type SessionStateVersion = '1';

export interface SessionTimelineEvent {
  ts: string; // ISO timestamp
  type: string; // e.g. "task:complete", "latent:phase:transition"
  summary?: string; // short human-friendly line
  data?: unknown; // optional payload (keep small)
}

export interface SessionModuleState {
  workflow?: unknown;
  latent?: unknown;
  resource?: unknown;
  memory?: unknown;
}

export interface SessionExportV1 {
  version: SessionStateVersion;
  sessionId: string;
  createdAt: string;
  updatedAt: string;

  // Module states for resume
  modules: SessionModuleState;

  // Checkpoint reference
  latestCheckpointId: string | null;

  // Timeline of events (last N)
  timeline: SessionTimelineEvent[];

  // Session metadata
  metadata?: {
    projectRoot?: string;
    ccgVersion?: string;
    resumeCount?: number;
  };
}

export interface SessionConfig {
  enabled: boolean;
  autoSave: boolean;
  autoSaveDebounceMs: number;
  maxTimelineEvents: number;
  sessionDir: string;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  enabled: true,
  autoSave: true,
  autoSaveDebounceMs: 500,
  maxTimelineEvents: 300,
  sessionDir: '.ccg/sessions',
};

export interface ResumeOffer {
  available: boolean;
  sessionId?: string;
  sessionFile?: string;
  updatedAt?: string;
  taskInProgress?: string;
  timelineCount?: number;
}

export interface SessionStatus {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  timelineCount: number;
  latestCheckpointId: string | null;
  dirty: boolean;
  autoSaveEnabled: boolean;
}
