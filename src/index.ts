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

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
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
