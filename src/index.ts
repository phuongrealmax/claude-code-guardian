#!/usr/bin/env node

// src/index.ts
// Claude Code Guardian - MCP Server Entry Point

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCCGServer } from './server.js';

// ═══════════════════════════════════════════════════════════════
//                      MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  try {
    // Create the CCG server
    const server = await createCCGServer();

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
