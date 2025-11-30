// src/modules/testing/index.ts

import { TestingService } from './testing.service.js';
import { getTestingTools } from './testing.tools.js';
import { TestingModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';

export class TestingModule {
  private service: TestingService;

  constructor(
    config: TestingModuleConfig,
    eventBus: EventBus,
    logger: Logger,
    projectRoot?: string
  ) {
    this.service = new TestingService(config, eventBus, logger, projectRoot);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  async shutdown(): Promise<void> {
    await this.service.closeAllBrowsers();
  }

  getTools() {
    return getTestingTools();
  }

  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'testing_run':
        return this.service.runTests({
          files: args.files as string[] | undefined,
          grep: args.grep as string | undefined,
          coverage: args.coverage as boolean | undefined,
          timeout: args.timeout as number | undefined,
        });

      case 'testing_run_affected':
        return this.service.runAffectedTests(args.files as string[]);

      case 'testing_browser_open':
        return { sessionId: await this.service.openBrowser(args.url as string) };

      case 'testing_browser_screenshot':
        return {
          path: await this.service.takeScreenshot(
            args.sessionId as string,
            {
              selector: args.selector as string | undefined,
              fullPage: args.fullPage as boolean | undefined,
            }
          )
        };

      case 'testing_browser_logs':
        return this.service.getConsoleLogs(args.sessionId as string);

      case 'testing_browser_network':
        return this.service.getNetworkRequests(args.sessionId as string);

      case 'testing_browser_errors':
        return this.service.getBrowserErrors(args.sessionId as string);

      case 'testing_browser_close':
        await this.service.closeBrowser(args.sessionId as string);
        return { closed: true };

      case 'testing_cleanup':
        return this.service.cleanup();

      case 'testing_status':
        return this.service.getStatus();

      default:
        throw new Error(`Unknown testing tool: ${toolName}`);
    }
  }

  getStatus() {
    return this.service.getStatus();
  }

  // ═══════════════════════════════════════════════════════════════
  //                      WRAPPER METHODS
  // ═══════════════════════════════════════════════════════════════

  async runTests(options?: { files?: string[]; grep?: string; coverage?: boolean; timeout?: number }) {
    return this.service.runTests(options);
  }

  async runAffectedTests(files: string[]) {
    return this.service.runAffectedTests(files);
  }
}

export { TestingService } from './testing.service.js';
export { BrowserService } from './browser/browser.service.js';
export { getTestingTools } from './testing.tools.js';
export * from './testing.types.js';
