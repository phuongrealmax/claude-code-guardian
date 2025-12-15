// src/modules/latent/latent-delta.ts

/**
 * Delta Merging Logic for Latent Service
 *
 * Handles merging context deltas - the core feature of Latent Chain Mode.
 * Deltas are merged, not replaced, to minimize token usage.
 */

import {
  AgentLatentContext,
  ContextDelta,
  LatentDecision,
} from './latent.types.js';

/**
 * DeltaMerger - Handles intelligent context delta merging
 */
export class DeltaMerger {
  /**
   * Merge delta into context (key feature of Latent Chain Mode!)
   * Arrays are appended/deduplicated, not replaced
   */
  merge(context: AgentLatentContext, delta: ContextDelta): void {
    // Phase update
    if (delta.phase) {
      context.phase = delta.phase;
    }

    // Code map updates (merge, not replace)
    this.mergeCodeMap(context, delta);

    // Add constraints (append with deduplication)
    if (delta.constraints) {
      context.constraints = [
        ...new Set([...context.constraints, ...delta.constraints]),
      ];
    }

    // Add risks (append with deduplication)
    if (delta.risks) {
      context.risks = [...new Set([...context.risks, ...delta.risks])];
    }

    // Add decisions
    this.mergeDecisions(context, delta);

    // Artifact updates (merge)
    this.mergeArtifacts(context, delta);

    // Metadata updates
    if (delta.metadata) {
      context.metadata = { ...context.metadata, ...delta.metadata };
    }

    // Handle removals
    this.applyRemovals(context, delta);
  }

  /**
   * Merge code map updates
   */
  private mergeCodeMap(context: AgentLatentContext, delta: ContextDelta): void {
    if (!delta.codeMap) return;

    if (delta.codeMap.files) {
      context.codeMap.files = [
        ...new Set([...context.codeMap.files, ...delta.codeMap.files]),
      ];
    }
    if (delta.codeMap.hotSpots) {
      context.codeMap.hotSpots = [
        ...new Set([...context.codeMap.hotSpots, ...delta.codeMap.hotSpots]),
      ];
    }
    if (delta.codeMap.components) {
      context.codeMap.components = [
        ...new Set([...context.codeMap.components, ...delta.codeMap.components]),
      ];
    }
  }

  /**
   * Merge decisions with auto-generated IDs
   */
  private mergeDecisions(context: AgentLatentContext, delta: ContextDelta): void {
    if (!delta.decisions) return;

    for (const d of delta.decisions) {
      const decision: LatentDecision = {
        ...d,
        id: d.id || `D${String(context.decisions.length + 1).padStart(3, '0')}`,
        phase: d.phase || context.phase,
        createdAt: new Date(),
      };
      context.decisions.push(decision);
    }
  }

  /**
   * Merge artifact updates
   */
  private mergeArtifacts(context: AgentLatentContext, delta: ContextDelta): void {
    if (!delta.artifacts) return;

    if (delta.artifacts.tests) {
      context.artifacts.tests = [
        ...new Set([...context.artifacts.tests, ...delta.artifacts.tests]),
      ];
    }
    if (delta.artifacts.endpoints) {
      context.artifacts.endpoints = [
        ...new Set([...context.artifacts.endpoints, ...delta.artifacts.endpoints]),
      ];
    }
    if (delta.artifacts.other) {
      context.artifacts.other = {
        ...context.artifacts.other,
        ...delta.artifacts.other,
      };
    }
  }

  /**
   * Apply removal operations from delta
   */
  private applyRemovals(context: AgentLatentContext, delta: ContextDelta): void {
    if (!delta.remove) return;

    if (delta.remove.constraints) {
      context.constraints = context.constraints.filter(
        (c) => !delta.remove!.constraints!.includes(c)
      );
    }
    if (delta.remove.risks) {
      context.risks = context.risks.filter(
        (r) => !delta.remove!.risks!.includes(r)
      );
    }
    if (delta.remove.decisions) {
      context.decisions = context.decisions.filter(
        (d) => !delta.remove!.decisions!.includes(d.id)
      );
    }
    if (delta.remove.files) {
      context.codeMap.files = context.codeMap.files.filter(
        (f) => !delta.remove!.files!.includes(f)
      );
    }
    if (delta.remove.hotSpots) {
      context.codeMap.hotSpots = context.codeMap.hotSpots.filter(
        (h) => !delta.remove!.hotSpots!.includes(h)
      );
    }
  }
}
