import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Run integration tests sequentially to avoid file system conflicts
    fileParallelism: false,
    // Use single thread pool to avoid coverage file conflicts on Windows
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/bin/**',
        // Exclude re-export index files (no logic, just exports)
        'src/**/index.ts',
        // Exclude pure type definition files
        'src/**/*.types.ts',
        'src/**/*types.ts',
        // Exclude MCP tool definition files (mostly schema definitions)
        'src/**/*.tool-defs.ts',
      ],
      reportsDirectory: './coverage',
      clean: true,
      // Coverage thresholds - CI will fail if below these values
      // Current state: 50%+ overall (1464 tests)
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },
    testTimeout: 600000, // 10 minutes for E2E integration tests
    hookTimeout: 30000, // 30s for hooks
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
