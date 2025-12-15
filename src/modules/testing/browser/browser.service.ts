// src/modules/testing/browser/browser.service.ts

import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { BrowserTestConfig } from '../../../core/types.js';
import { Logger } from '../../../core/logger.js';
import {
  BrowserSession,
  BrowserAnalysis,
  ConsoleLog,
  NetworkRequest,
  Screenshot,
  BrowserError,
} from '../testing.types.js';

// Playwright types (optional import - may not be available)
type Browser = any;
type Page = any;
type BrowserContext = any;

export class BrowserService {
  private browser: Browser | null = null;
  private sessions: Map<string, {
    page: Page;
    context: BrowserContext;
    data: BrowserSession;
  }> = new Map();
  private screenshotDir: string;

  constructor(
    private config: BrowserTestConfig,
    private logger: Logger,
    private projectRoot: string = process.cwd()
  ) {
    this.screenshotDir = join(projectRoot, '.ccg', 'screenshots');
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    // Ensure screenshot directory exists
    if (!existsSync(this.screenshotDir)) {
      mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async openPage(url: string): Promise<string> {
    // Lazy load playwright
    let chromium: any;
    try {
      const playwright = await import('playwright');
      chromium = playwright.chromium;
    } catch {
      throw new Error('Playwright is not installed. Run: npm install playwright');
    }

    // Lazy initialize browser
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.config.headless,
      });
    }

    const sessionId = uuid();
    const context = await this.browser.newContext();
    const page = await context.newPage();

    const session: BrowserSession = {
      id: sessionId,
      url,
      startedAt: new Date(),
      status: 'active',
      consoleLogs: [],
      networkRequests: [],
      screenshots: [],
      errors: [],
    };

    // Set up listeners
    if (this.config.captureConsole) {
      page.on('console', (msg: any) => {
        session.consoleLogs.push({
          type: msg.type() as ConsoleLog['type'],
          message: msg.text(),
          timestamp: new Date(),
          source: msg.location().url,
          lineNumber: msg.location().lineNumber,
        });
      });
    }

    if (this.config.captureNetwork) {
      page.on('requestfinished', async (request: any) => {
        const response = await request.response();
        const timing = request.timing();

        session.networkRequests.push({
          id: uuid(),
          url: request.url(),
          method: request.method(),
          status: response?.status() || 0,
          statusText: response?.statusText() || '',
          duration: timing.responseEnd - timing.requestStart,
          size: (await response?.body())?.length || 0,
          type: request.resourceType(),
          timestamp: new Date(),
        });
      });

      page.on('requestfailed', (request: any) => {
        session.networkRequests.push({
          id: uuid(),
          url: request.url(),
          method: request.method(),
          status: 0,
          statusText: 'Failed',
          duration: 0,
          size: 0,
          type: request.resourceType(),
          error: request.failure()?.errorText,
          timestamp: new Date(),
        });
      });
    }

    // Capture page errors
    page.on('pageerror', (error: Error) => {
      session.errors.push({
        message: error.message,
        source: 'page',
        stack: error.stack,
        timestamp: new Date(),
      });
    });

    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle' });

    this.sessions.set(sessionId, { page, context, data: session });

    this.logger.info(`Browser session opened: ${sessionId} -> ${url}`);

    return sessionId;
  }

  async takeScreenshot(sessionId: string, options?: {
    selector?: string;
    fullPage?: boolean;
  }): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const screenshotId = uuid();
    const filename = `${screenshotId}.png`;
    const path = join(this.screenshotDir, filename);

    // Ensure screenshot directory exists
    if (!existsSync(this.screenshotDir)) {
      mkdirSync(this.screenshotDir, { recursive: true });
    }

    if (options?.selector) {
      await session.page.locator(options.selector).screenshot({ path });
    } else {
      await session.page.screenshot({
        path,
        fullPage: options?.fullPage ?? false,
      });
    }

    const viewport = session.page.viewportSize();

    const screenshot: Screenshot = {
      id: screenshotId,
      path,
      createdAt: new Date(),
      selector: options?.selector,
      fullPage: options?.fullPage ?? false,
      width: viewport?.width || 0,
      height: viewport?.height || 0,
    };

    session.data.screenshots.push(screenshot);

    this.logger.debug(`Screenshot taken: ${path}`);

    return path;
  }

  getConsoleLogs(sessionId: string): ConsoleLog[] {
    const session = this.sessions.get(sessionId);
    return session?.data.consoleLogs || [];
  }

  getNetworkRequests(sessionId: string): NetworkRequest[] {
    const session = this.sessions.get(sessionId);
    return session?.data.networkRequests || [];
  }

  getErrors(sessionId: string): BrowserError[] {
    const session = this.sessions.get(sessionId);
    return session?.data.errors || [];
  }

  /**
   * Get comprehensive analysis of browser session
   * Prioritizes errors and calculates health score
   */
  getAnalysis(sessionId: string): BrowserAnalysis {
    const session = this.sessions.get(sessionId)?.data;
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Categorize console logs by severity
    const consoleErrors = session.consoleLogs.filter(l => l.type === 'error');
    const consoleWarnings = session.consoleLogs.filter(l => l.type === 'warn');
    const consoleInfo = session.consoleLogs.filter(l =>
      l.type === 'info' || l.type === 'log' || l.type === 'debug'
    );

    // Identify problematic network requests
    const failedRequests = session.networkRequests.filter(
      r => r.status >= 400 || r.error
    );
    const slowRequests = session.networkRequests.filter(
      r => r.duration > 3000 // > 3 seconds
    );

    // Calculate health score (0-100)
    let healthScore = 100;
    healthScore -= consoleErrors.length * 10;      // -10 per error
    healthScore -= consoleWarnings.length * 2;     // -2 per warning
    healthScore -= failedRequests.length * 5;      // -5 per failed request
    healthScore -= slowRequests.length * 3;        // -3 per slow request
    healthScore -= session.errors.length * 15;     // -15 per page error
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Build issues list (prioritized)
    const issues: string[] = [];
    if (session.errors.length > 0) {
      issues.push(`🔴 ${session.errors.length} page error(s): ${session.errors[0].message.substring(0, 100)}`);
    }
    if (consoleErrors.length > 0) {
      issues.push(`🔴 ${consoleErrors.length} console error(s): ${consoleErrors[0].message.substring(0, 100)}`);
    }
    if (failedRequests.length > 0) {
      issues.push(`🟠 ${failedRequests.length} failed request(s): ${failedRequests[0].url.substring(0, 80)}`);
    }
    if (slowRequests.length > 0) {
      issues.push(`🟡 ${slowRequests.length} slow request(s) (>3s)`);
    }
    if (consoleWarnings.length > 0) {
      issues.push(`🟡 ${consoleWarnings.length} console warning(s)`);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (consoleErrors.length > 0) {
      recommendations.push('Fix console errors - they may indicate runtime issues');
    }
    if (failedRequests.length > 0) {
      const errorCodes = [...new Set(failedRequests.map(r => r.status))].join(', ');
      recommendations.push(`Check API endpoints returning errors (status: ${errorCodes})`);
    }
    if (slowRequests.length > 0) {
      recommendations.push('Optimize slow network requests for better UX');
    }
    if (session.errors.length > 0) {
      recommendations.push('Critical: Page errors detected - review JavaScript for uncaught exceptions');
    }

    // Build summary
    const summary = issues.length > 0
      ? `Found ${issues.length} issue(s): ${issues.slice(0, 2).map(i => i.split(':')[0]).join(', ')}`
      : '✅ No issues detected - page appears healthy';

    return {
      summary,
      consoleErrors,
      consoleWarnings,
      consoleInfo,
      failedRequests,
      slowRequests,
      pageErrors: session.errors,
      healthScore,
      issues,
      recommendations,
    };
  }

  async closePage(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    await session.page.close();
    await session.context.close();

    session.data.status = 'closed';
    this.sessions.delete(sessionId);

    this.logger.info(`Browser session closed: ${sessionId}`);
  }

  async closeAll(): Promise<void> {
    for (const [sessionId] of this.sessions) {
      await this.closePage(sessionId);
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId)?.data;
  }
}
