// tests/unit/license.test.ts

// Using vitest globals
import { LicenseService } from '../../src/modules/license/license.service.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('LicenseService', () => {
  let service: LicenseService;
  let testDbPath: string;

  beforeEach(() => {
    // Use temp directory for test database
    testDbPath = path.join(os.tmpdir(), `test-licenses-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    service = new LicenseService(testDbPath);
  });

  afterEach(() => {
    try {
      service.close();
      // Clean up test database
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      LICENSE KEY GENERATION
  // ═══════════════════════════════════════════════════════════════

  describe('generateLicenseKey', () => {
    it('should generate valid dev tier key', () => {
      const key = service.generateLicenseKey('dev');

      expect(key).toMatch(/^CGS-DEV-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should generate valid team tier key', () => {
      const key = service.generateLicenseKey('team');

      expect(key).toMatch(/^CGS-TEAM-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should generate valid enterprise tier key', () => {
      const key = service.generateLicenseKey('enterprise');

      expect(key).toMatch(/^CGS-ENTE-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(service.generateLicenseKey('dev'));
      }
      expect(keys.size).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CREATE LICENSE
  // ═══════════════════════════════════════════════════════════════

  describe('createLicense', () => {
    it('should create a dev license', () => {
      const license = service.createLicense({
        email: 'test@example.com',
        tier: 'dev',
      });

      expect(license.id).toBeDefined();
      expect(license.licenseKey).toMatch(/^CGS-DEV-/);
      expect(license.email).toBe('test@example.com');
      expect(license.tier).toBe('dev');
      expect(license.status).toBe('active');
      expect(license.createdAt).toBeDefined();
      expect(license.activatedAt).toBeDefined();
    });

    it('should create a team license with default seats', () => {
      const license = service.createLicense({
        email: 'team@example.com',
        tier: 'team',
      });

      expect(license.tier).toBe('team');
      expect(license.seats).toBe(5); // Default for team
    });

    it('should create a team license with custom seats', () => {
      const license = service.createLicense({
        email: 'team@example.com',
        tier: 'team',
        seats: 10,
      });

      expect(license.seats).toBe(10);
    });

    it('should create an enterprise license', () => {
      const license = service.createLicense({
        email: 'enterprise@example.com',
        tier: 'enterprise',
        companyName: 'Acme Corp',
      });

      expect(license.tier).toBe('enterprise');
      expect(license.companyName).toBe('Acme Corp');
    });

    it('should store Stripe metadata', () => {
      const license = service.createLicense({
        email: 'stripe@example.com',
        tier: 'team',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_456',
        stripePriceId: 'price_789',
      });

      expect(license.stripeCustomerId).toBe('cus_123');
      expect(license.stripeSubscriptionId).toBe('sub_456');
      expect(license.stripePriceId).toBe('price_789');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      GET LICENSE
  // ═══════════════════════════════════════════════════════════════

  describe('getLicenseByKey', () => {
    it('should retrieve license by key', () => {
      const created = service.createLicense({
        email: 'test@example.com',
        tier: 'dev',
      });

      const retrieved = service.getLicenseByKey(created.licenseKey);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.email).toBe('test@example.com');
    });

    it('should return null for non-existent key', () => {
      const result = service.getLicenseByKey('CGS-FAKE-KEY1-KEY2');

      expect(result).toBeNull();
    });
  });

  describe('getLicenseByStripeSubscription', () => {
    it('should retrieve license by Stripe subscription ID', () => {
      const created = service.createLicense({
        email: 'stripe@example.com',
        tier: 'team',
        stripeSubscriptionId: 'sub_test123',
      });

      const retrieved = service.getLicenseByStripeSubscription('sub_test123');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should return null for non-existent subscription', () => {
      const result = service.getLicenseByStripeSubscription('sub_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getLicensesByEmail', () => {
    it('should retrieve all licenses for email', () => {
      service.createLicense({ email: 'multi@example.com', tier: 'dev' });
      service.createLicense({ email: 'multi@example.com', tier: 'team' });
      service.createLicense({ email: 'other@example.com', tier: 'dev' });

      const licenses = service.getLicensesByEmail('multi@example.com');

      expect(licenses.length).toBe(2);
      expect(licenses.every(l => l.email === 'multi@example.com')).toBe(true);
    });

    it('should return empty array for unknown email', () => {
      const licenses = service.getLicensesByEmail('unknown@example.com');

      expect(licenses).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      VERIFY LICENSE
  // ═══════════════════════════════════════════════════════════════

  describe('verifyLicense', () => {
    it('should verify valid active license', () => {
      const license = service.createLicense({
        email: 'test@example.com',
        tier: 'dev',
      });

      const result = service.verifyLicense({
        licenseKey: license.licenseKey,
      });

      expect(result.valid).toBe(true);
      expect(result.license).toBeDefined();
      expect(result.license!.tier).toBe('dev');
      expect(result.license!.features).toContain('memory');
      expect(result.license!.features).toContain('guard');
    });

    it('should reject non-existent license', () => {
      const result = service.verifyLicense({
        licenseKey: 'CGS-FAKE-KEY1-KEY2',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('License key not found');
    });

    it('should reject cancelled license', () => {
      const license = service.createLicense({
        email: 'test@example.com',
        tier: 'dev',
      });
      service.updateLicenseStatus(license.licenseKey, 'cancelled');

      const result = service.verifyLicense({
        licenseKey: license.licenseKey,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cancelled');
    });

    it('should reject expired license', () => {
      const license = service.createLicense({
        email: 'test@example.com',
        tier: 'dev',
      });
      // Set expiration to past
      service.updateLicenseStatus(license.licenseKey, 'active', Date.now() - 1000);

      const result = service.verifyLicense({
        licenseKey: license.licenseKey,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should return features for team tier', () => {
      const license = service.createLicense({
        email: 'team@example.com',
        tier: 'team',
      });

      const result = service.verifyLicense({
        licenseKey: license.licenseKey,
      });

      expect(result.valid).toBe(true);
      expect(result.license!.features).toContain('latent_chain');
      expect(result.license!.features).toContain('agents');
      expect(result.license!.features).toContain('testing');
    });

    it('should return features for enterprise tier', () => {
      const license = service.createLicense({
        email: 'enterprise@example.com',
        tier: 'enterprise',
      });

      const result = service.verifyLicense({
        licenseKey: license.licenseKey,
      });

      expect(result.valid).toBe(true);
      expect(result.license!.features).toContain('sso');
      expect(result.license!.features).toContain('audit_logs');
      expect(result.license!.features).toContain('unlimited_seats');
    });

    it('should enforce seat limits', () => {
      const license = service.createLicense({
        email: 'team@example.com',
        tier: 'team',
        seats: 2,
      });

      // First two machines should work
      const result1 = service.verifyLicense({
        licenseKey: license.licenseKey,
        machineId: 'machine-1',
      });
      const result2 = service.verifyLicense({
        licenseKey: license.licenseKey,
        machineId: 'machine-2',
      });

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);

      // Third machine should fail
      const result3 = service.verifyLicense({
        licenseKey: license.licenseKey,
        machineId: 'machine-3',
      });

      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('Seat limit');
    });

    it('should allow same machine to verify multiple times', () => {
      const license = service.createLicense({
        email: 'team@example.com',
        tier: 'team',
        seats: 1,
      });

      // Same machine can verify multiple times
      const result1 = service.verifyLicense({
        licenseKey: license.licenseKey,
        machineId: 'machine-1',
      });
      const result2 = service.verifyLicense({
        licenseKey: license.licenseKey,
        machineId: 'machine-1',
      });

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      UPDATE LICENSE STATUS
  // ═══════════════════════════════════════════════════════════════

  describe('updateLicenseStatus', () => {
    it('should update license status', () => {
      const license = service.createLicense({
        email: 'test@example.com',
        tier: 'dev',
      });

      const success = service.updateLicenseStatus(license.licenseKey, 'inactive');

      expect(success).toBe(true);

      const updated = service.getLicenseByKey(license.licenseKey);
      expect(updated!.status).toBe('inactive');
    });

    it('should set expiration date', () => {
      const license = service.createLicense({
        email: 'test@example.com',
        tier: 'dev',
      });
      const futureDate = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

      service.updateLicenseStatus(license.licenseKey, 'active', futureDate);

      const updated = service.getLicenseByKey(license.licenseKey);
      expect(updated!.expiresAt).toBe(futureDate);
    });

    it('should return false for non-existent license', () => {
      const success = service.updateLicenseStatus('CGS-FAKE-KEY1-KEY2', 'inactive');

      expect(success).toBe(false);
    });
  });

  describe('cancelLicense', () => {
    it('should cancel license by subscription ID', () => {
      const license = service.createLicense({
        email: 'test@example.com',
        tier: 'team',
        stripeSubscriptionId: 'sub_cancel123',
      });

      const success = service.cancelLicense('sub_cancel123');

      expect(success).toBe(true);

      const updated = service.getLicenseByKey(license.licenseKey);
      expect(updated!.status).toBe('cancelled');
      expect(updated!.cancelledAt).toBeDefined();
    });

    it('should return false for non-existent subscription', () => {
      const success = service.cancelLicense('sub_nonexistent');

      expect(success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STATISTICS
  // ═══════════════════════════════════════════════════════════════

  describe('getStats', () => {
    it('should return zero stats for empty database', () => {
      const stats = service.getStats();

      expect(stats.total).toBe(0);
      expect(stats.byTier.dev).toBe(0);
      expect(stats.byTier.team).toBe(0);
      expect(stats.byTier.enterprise).toBe(0);
      expect(stats.byStatus.active).toBe(0);
    });

    it('should return correct counts', () => {
      service.createLicense({ email: 'dev1@test.com', tier: 'dev' });
      service.createLicense({ email: 'dev2@test.com', tier: 'dev' });
      service.createLicense({ email: 'team@test.com', tier: 'team' });
      const ent = service.createLicense({ email: 'ent@test.com', tier: 'enterprise' });
      service.updateLicenseStatus(ent.licenseKey, 'cancelled');

      const stats = service.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byTier.dev).toBe(2);
      expect(stats.byTier.team).toBe(1);
      expect(stats.byTier.enterprise).toBe(1);
      expect(stats.byStatus.active).toBe(3);
      expect(stats.byStatus.cancelled).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DATABASE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  describe('database', () => {
    it('should create database in custom path', () => {
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should handle close gracefully', () => {
      service.close();
      // Should not throw
    });
  });
});
