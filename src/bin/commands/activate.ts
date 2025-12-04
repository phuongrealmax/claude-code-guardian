/**
 * ccg activate command
 *
 * Activates a Team or Enterprise license
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline/promises';
import * as fs from 'fs';
import * as path from 'path';

interface LicenseConfig {
  licenseKey: string;
  tier: string;
  status: string;
  activatedAt: number;
  features: string[];
}

export function createActivateCommand(): Command {
  const command = new Command('activate');

  command
    .description('Activate your Team or Enterprise license')
    .action(async () => {
      await activateLicense();
    });

  return command;
}

async function activateLicense(): Promise<void> {
  console.log(chalk.cyan.bold('\n🛡️  Code Guardian Studio - License Activation\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Get license key from user
    const licenseKey = await rl.question(
      chalk.white('Enter your license key (format: CGS-XXXX-XXXX-XXXX): ')
    );

    if (!licenseKey || !licenseKey.startsWith('CGS-')) {
      console.log(chalk.red('\n❌ Invalid license key format'));
      console.log(
        chalk.gray('License keys should start with CGS- followed by your tier code')
      );
      rl.close();
      return;
    }

    console.log(chalk.gray('\nVerifying license key...'));

    // Verify license with API
    const verifyResult = await verifyLicenseKey(licenseKey);

    if (!verifyResult.valid) {
      console.log(chalk.red(`\n❌ License verification failed: ${verifyResult.error}`));
      console.log(chalk.gray('\nPlease check your license key and try again.'));
      console.log(
        chalk.gray('If you need help, contact: hello@codeguardian.studio')
      );
      rl.close();
      return;
    }

    // Save license to config
    const config: LicenseConfig = {
      licenseKey,
      tier: verifyResult.license!.tier,
      status: verifyResult.license!.status,
      activatedAt: Date.now(),
      features: verifyResult.license!.features,
    };

    saveLicenseConfig(config);

    // Success message
    console.log(chalk.green.bold('\n✅ License activated successfully!\n'));
    console.log(chalk.white(`Tier: ${chalk.cyan(config.tier.toUpperCase())}`));
    console.log(chalk.white(`Status: ${chalk.green(config.status)}`));
    console.log(chalk.white(`\nFeatures unlocked:`));

    config.features.forEach(feature => {
      const displayName = feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      console.log(chalk.gray(`  ✓ ${displayName}`));
    });

    console.log(chalk.white('\n🎉 You can now use all Team/Enterprise features!'));
    console.log(chalk.gray('\nRun `ccg --help` to see available commands.\n'));
  } catch (error: any) {
    console.error(chalk.red('\n❌ Activation error:'), error.message);
    console.log(chalk.gray('Please try again or contact support.\n'));
  } finally {
    rl.close();
  }
}

async function verifyLicenseKey(
  licenseKey: string
): Promise<{ valid: boolean; license?: any; error?: string }> {
  try {
    // Get machine ID for seat tracking
    const machineId = getMachineId();

    const response = await fetch(
      'https://codeguardian.studio/api/license/verify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey,
          machineId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as { valid: boolean; license?: any; error?: string };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Network error',
    };
  }
}

function saveLicenseConfig(config: LicenseConfig): void {
  const ccgDir = path.join(process.cwd(), '.ccg');
  const configPath = path.join(ccgDir, 'license.json');

  // Ensure .ccg directory exists
  if (!fs.existsSync(ccgDir)) {
    fs.mkdirSync(ccgDir, { recursive: true });
  }

  // Save license config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  // Also save to user's home directory (global license)
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir) {
    const globalCcgDir = path.join(homeDir, '.ccg');
    const globalConfigPath = path.join(globalCcgDir, 'license.json');

    if (!fs.existsSync(globalCcgDir)) {
      fs.mkdirSync(globalCcgDir, { recursive: true });
    }

    fs.writeFileSync(globalConfigPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

function getMachineId(): string {
  // Simple machine ID based on hostname and platform
  // In production, use a more robust machine ID library
  const os = require('os');
  const crypto = require('crypto');

  const data = `${os.hostname()}-${os.platform()}-${os.arch()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}
