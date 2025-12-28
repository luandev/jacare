import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // Global coverage configuration
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: [
        'apps/**/src/**/*.{ts,tsx}',
        'packages/**/src/**/*.{ts,tsx}'
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.{test,spec}.{ts,tsx}',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**'
      ]
    },
    // Use projects instead of environmentMatchGlobs (deprecated in v4)
    projects: [
      {
        name: 'node-tests',
        test: {
          environment: 'node',
          setupFiles: ['tests/vitest.setup.ts'],
          include: [
            'apps/server/**/*.{test,spec}.{ts,tsx}',
            'apps/desktop/**/*.{test,spec}.{ts,tsx}',
            'packages/**/*.{test,spec}.{ts,tsx}'
          ]
        },
        resolve: {
          alias: {
            '@crocdesk/shared': path.resolve(__dirname, 'packages/shared/src')
          }
        }
      },
      {
        name: 'web-tests',
        test: {
          environment: 'jsdom',
          setupFiles: ['tests/vitest.setup.ts'],
          include: [
            'apps/web/**/*.{test,spec}.{ts,tsx}'
          ]
        },
        resolve: {
          alias: {
            '@crocdesk/shared': path.resolve(__dirname, 'packages/shared/src')
          }
        }
      }
    ]
  }
});
