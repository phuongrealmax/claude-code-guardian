#!/usr/bin/env node

// src/index.ts
// Claude Code Guardian - MCP Server Entry Point

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCCGServer, type CCGServerOptions } from './server.js';

// ═══════════════════════════════════════════════════════════════
//                      CLI ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════

function parseArgs(): CCGServerOptions {
  const args = process.argv.slice(2);
  const options: CCGServerOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--resume' || arg === '-r') {
      options.resume = true;
      // Check if next arg is a file path (not another flag)
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        options.sessionFile = nextArg;
        i++;
      }
    } else if (arg === '--help' || arg === '-h') {
      console.error(`
Claude Code Guardian MCP Server

Usage: ccg-server [options]

Options:
  --resume, -r [file]    Resume from previous session (optionally specify file)
  --help, -h             Show this help message

Environment Variables:
  CCG_PROJECT_ROOT       Project root directory (default: cwd)
  CCG_LOG_LEVEL          Log level: debug, info, warn, error (default: info)
`);
      process.exit(0);
    }
  }

  return options;
}

// ═══════════════════════════════════════════════════════════════
//                      MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  try {
    // Parse CLI arguments
    const options = parseArgs();

    // Create the CCG server
    const server = await createCCGServer(options);

    // Create stdio transport for MCP communication
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    // Log to stderr (stdout is reserved for MCP protocol)
    console.error('Claude Code Guardian MCP Server running on stdio');
    console.error('Ready to accept connections...');

  } catch (error) {
    console.error('Fatal error starting CCG server:', error);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
//                      GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════

function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    console.error(`\nReceived ${signal}. Shutting down gracefully...`);
    // Give time for cleanup
    setTimeout(() => {
      console.error('Shutdown complete.');
      process.exit(0);
    }, 1000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught exceptions - log but don't crash for recoverable errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // Only exit for truly fatal errors, otherwise log and continue
    if (error.message?.includes('FATAL') || error.message?.includes('out of memory')) {
      process.exit(1);
    }
    // Log stack trace for debugging
    console.error('Stack:', error.stack);
  });

  // Handle unhandled rejections - log but keep server running
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise);
    console.error('Reason:', reason);
    // Don't exit - log the error and let the server continue
    // This prevents crashes from non-critical async errors
  });
}

// ═══════════════════════════════════════════════════════════════
//                      START SERVER
// ═══════════════════════════════════════════════════════════════

setupGracefulShutdown();
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
