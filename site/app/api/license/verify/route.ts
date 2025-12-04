/**
 * License Verification API
 * POST /api/license/verify
 *
 * Verifies license keys from CLI
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey, email, machineId } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, error: 'License key required' },
        { status: 400 }
      );
    }

    // In real implementation, use LicenseService to verify
    //
    // const { LicenseService } = await import('@/modules/license/license.service');
    // const licenseService = new LicenseService();
    //
    // const result = licenseService.verifyLicense({
    //   licenseKey,
    //   email,
    //   machineId,
    // });
    //
    // return NextResponse.json(result);

    // Mock response for development
    // Accept any license key that starts with CGS-
    if (licenseKey.startsWith('CGS-')) {
      const tier = licenseKey.includes('TEAM') ? 'team' : 'enterprise';

      return NextResponse.json({
        valid: true,
        license: {
          tier,
          status: 'active',
          features: tier === 'team'
            ? [
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
              ]
            : [
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
        },
      });
    }

    return NextResponse.json({
      valid: false,
      error: 'Invalid license key',
    });
  } catch (error: any) {
    console.error('License verification error:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to verify a license.' },
    { status: 405 }
  );
}
