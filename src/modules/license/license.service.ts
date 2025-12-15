/**
 * License Service
 *
 * @deprecated INTERNAL REFERENCE / LEGACY
 *
 * This file contains the server-side license database logic and will be
 * moved to the private `cloud-backend` repository. It is NOT part of
 * the default dev experience or quickstart flow.
 *
 * For license verification in the open-core CLI, use:
 * - @ccg/cloud-client (packages/cloud-client/) - LicenseGateway interface
 * - src/core/license-integration.ts - hasFeature(), getCurrentTier()
 *
 * The actual license database runs on the cloud backend at
 * api.codeguardian.studio, NOT from this public repository.
 *
 * See docs/LICENSE_SYSTEM.md for architecture details.
 *
 * ---
 * Original description:
 * Manages license creation, verification, and validation
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import type {
  License,
  LicenseTier,
  LicenseStatus,
  LicenseVerifyRequest,
  LicenseVerifyResponse,
  CreateLicenseParams,
  TIER_FEATURES,
} from './license.types.js';

export class LicenseService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(process.cwd(), '.ccg', 'licenses.db');
    const finalPath = dbPath || defaultPath;

    // Ensure directory exists
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(finalPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        license_key TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        tier TEXT NOT NULL,
        status TEXT NOT NULL,

        stripe_customer_id TEXT,
        stripe_subscription_id TEXT UNIQUE,
        stripe_price_id TEXT,

        company_name TEXT,
        seats INTEGER DEFAULT 1,

        created_at INTEGER NOT NULL,
        activated_at INTEGER,
        expires_at INTEGER,
        cancelled_at INTEGER,

        last_verified_at INTEGER,
        verify_count INTEGER DEFAULT 0,

        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
      CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
      CREATE INDEX IF NOT EXISTS idx_licenses_stripe_sub ON licenses(stripe_subscription_id);
      CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);

      -- Machine tracking for seat limits
      CREATE TABLE IF NOT EXISTS license_machines (
        id TEXT PRIMARY KEY,
        license_id TEXT NOT NULL,
        machine_id TEXT NOT NULL,
        last_seen_at INTEGER NOT NULL,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
        UNIQUE(license_id, machine_id)
      );

      CREATE INDEX IF NOT EXISTS idx_machines_license ON license_machines(license_id);
    `);
  }

  /**
   * Generate a license key
   * Format: CGS-{TIER}-{RANDOM}-{RANDOM}
   */
  generateLicenseKey(tier: LicenseTier): string {
    const tierPrefix = tier.toUpperCase().substring(0, 4);
    const part1 = this.randomString(4);
    const part2 = this.randomString(4);
    return `CGS-${tierPrefix}-${part1}-${part2}`;
  }

  private randomString(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  /**
   * Create a new license
   */
  createLicense(params: CreateLicenseParams): License {
    const id = crypto.randomUUID();
    const licenseKey = this.generateLicenseKey(params.tier);
    const now = Date.now();

    const license: License = {
      id,
      licenseKey,
      email: params.email,
      tier: params.tier,
      status: 'active',
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripePriceId: params.stripePriceId,
      companyName: params.companyName,
      seats: params.seats || (params.tier === 'team' ? 5 : undefined),
      createdAt: now,
      activatedAt: now,
      verifyCount: 0,
    };

    const stmt = this.db.prepare(`
      INSERT INTO licenses (
        id, license_key, email, tier, status,
        stripe_customer_id, stripe_subscription_id, stripe_price_id,
        company_name, seats,
        created_at, activated_at, verify_count
      ) VALUES (
        @id, @licenseKey, @email, @tier, @status,
        @stripeCustomerId, @stripeSubscriptionId, @stripePriceId,
        @companyName, @seats,
        @createdAt, @activatedAt, @verifyCount
      )
    `);

    stmt.run(license);

    return license;
  }

  /**
   * Get license by key
   */
  getLicenseByKey(licenseKey: string): License | null {
    const stmt = this.db.prepare(`
      SELECT * FROM licenses WHERE license_key = ?
    `);
    const row = stmt.get(licenseKey) as any;

    if (!row) return null;

    return this.rowToLicense(row);
  }

  /**
   * Get license by Stripe subscription ID
   */
  getLicenseByStripeSubscription(subscriptionId: string): License | null {
    const stmt = this.db.prepare(`
      SELECT * FROM licenses WHERE stripe_subscription_id = ?
    `);
    const row = stmt.get(subscriptionId) as any;

    if (!row) return null;

    return this.rowToLicense(row);
  }

  /**
   * Get all licenses for an email
   */
  getLicensesByEmail(email: string): License[] {
    const stmt = this.db.prepare(`
      SELECT * FROM licenses WHERE email = ? ORDER BY created_at DESC
    `);
    const rows = stmt.all(email) as any[];

    return rows.map(row => this.rowToLicense(row));
  }

  /**
   * Verify a license
   */
  verifyLicense(request: LicenseVerifyRequest): LicenseVerifyResponse {
    const license = this.getLicenseByKey(request.licenseKey);

    if (!license) {
      return {
        valid: false,
        error: 'License key not found',
      };
    }

    // Check if license is active
    if (license.status !== 'active') {
      return {
        valid: false,
        error: `License is ${license.status}`,
      };
    }

    // Check if expired
    if (license.expiresAt && license.expiresAt < Date.now()) {
      return {
        valid: false,
        error: 'License has expired',
      };
    }

    // Check seat limit if machineId provided
    if (request.machineId && license.seats) {
      const activeMachines = this.getActiveMachines(license.id);
      const isMachineRegistered = activeMachines.some(
        m => m.machine_id === request.machineId
      );

      if (!isMachineRegistered && activeMachines.length >= license.seats) {
        return {
          valid: false,
          error: `Seat limit reached (${license.seats} seats)`,
        };
      }

      // Register or update machine
      this.registerMachine(license.id, request.machineId);
    }

    // Update verification stats
    this.updateVerificationStats(license.id);

    // Get features for tier
    const features = this.getFeaturesForTier(license.tier);

    return {
      valid: true,
      license: {
        tier: license.tier,
        status: license.status,
        expiresAt: license.expiresAt,
        features,
      },
    };
  }

  /**
   * Update license status
   */
  updateLicenseStatus(
    licenseKey: string,
    status: LicenseStatus,
    expiresAt?: number
  ): boolean {
    const now = Date.now();
    const updates: any = { status };

    if (status === 'cancelled') {
      updates.cancelledAt = now;
    }

    if (expiresAt !== undefined) {
      updates.expiresAt = expiresAt;
    }

    const setClauses = Object.keys(updates).map(key => {
      const snakeKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      return `${snakeKey} = @${key}`;
    });

    const stmt = this.db.prepare(`
      UPDATE licenses SET ${setClauses.join(', ')}
      WHERE license_key = @licenseKey
    `);

    const result = stmt.run({ licenseKey, ...updates });
    return result.changes > 0;
  }

  /**
   * Cancel a license (for subscription cancellation)
   */
  cancelLicense(subscriptionId: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE licenses SET status = 'cancelled', cancelled_at = ?
      WHERE stripe_subscription_id = ?
    `);

    const result = stmt.run(Date.now(), subscriptionId);
    return result.changes > 0;
  }

  /**
   * Get active machines for a license
   */
  private getActiveMachines(licenseId: string): any[] {
    // Consider machines active if seen in last 30 days
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      SELECT * FROM license_machines
      WHERE license_id = ? AND last_seen_at > ?
      ORDER BY last_seen_at DESC
    `);

    return stmt.all(licenseId, cutoff) as any[];
  }

  /**
   * Register or update a machine
   */
  private registerMachine(licenseId: string, machineId: string): void {
    const id = crypto.randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO license_machines (id, license_id, machine_id, last_seen_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(license_id, machine_id) DO UPDATE SET last_seen_at = ?
    `);

    stmt.run(id, licenseId, machineId, now, now);
  }

  /**
   * Update verification stats
   */
  private updateVerificationStats(licenseId: string): void {
    const stmt = this.db.prepare(`
      UPDATE licenses
      SET last_verified_at = ?, verify_count = verify_count + 1
      WHERE id = ?
    `);

    stmt.run(Date.now(), licenseId);
  }

  /**
   * Get features for tier
   */
  private getFeaturesForTier(tier: LicenseTier): string[] {
    const TIER_FEATURES: Record<LicenseTier, string[]> = {
      dev: [
        'code_optimizer',
        'memory',
        'guard',
        'workflow',
        'basic_reports',
      ],
      team: [
        'code_optimizer',
        'memory',
        'guard',
        'workflow',
        'advanced_reports',
        'report_dashboard',
        'latent_chain',
        'agents',
        'thinking',
        'documents',
        'testing',
        'auto_agent',
        'priority_support',
      ],
      enterprise: [
        'code_optimizer',
        'memory',
        'guard',
        'workflow',
        'advanced_reports',
        'report_dashboard',
        'latent_chain',
        'agents',
        'thinking',
        'documents',
        'testing',
        'auto_agent',
        'priority_support',
        'soc2_compliance',
        'sso',
        'audit_logs',
        'dedicated_support',
        'custom_integrations',
        'unlimited_seats',
      ],
    };

    return TIER_FEATURES[tier] || [];
  }

  /**
   * Convert database row to License object
   */
  private rowToLicense(row: any): License {
    return {
      id: row.id,
      licenseKey: row.license_key,
      email: row.email,
      tier: row.tier as LicenseTier,
      status: row.status as LicenseStatus,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripePriceId: row.stripe_price_id,
      companyName: row.company_name,
      seats: row.seats,
      createdAt: row.created_at,
      activatedAt: row.activated_at,
      expiresAt: row.expires_at,
      cancelledAt: row.cancelled_at,
      lastVerifiedAt: row.last_verified_at,
      verifyCount: row.verify_count,
    };
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    byTier: Record<LicenseTier, number>;
    byStatus: Record<LicenseStatus, number>;
  } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM licenses');
    const total = (totalStmt.get() as any).count;

    const tierStmt = this.db.prepare(`
      SELECT tier, COUNT(*) as count FROM licenses GROUP BY tier
    `);
    const tierRows = tierStmt.all() as any[];
    const byTier: any = { dev: 0, team: 0, enterprise: 0 };
    tierRows.forEach(row => {
      byTier[row.tier] = row.count;
    });

    const statusStmt = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM licenses GROUP BY status
    `);
    const statusRows = statusStmt.all() as any[];
    const byStatus: any = { active: 0, inactive: 0, cancelled: 0, expired: 0 };
    statusRows.forEach(row => {
      byStatus[row.status] = row.count;
    });

    return { total, byTier, byStatus };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
