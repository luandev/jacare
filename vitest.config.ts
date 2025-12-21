import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'apps/**/src/**/*.{test,spec}.{ts,tsx}',
      'packages/**/src/**/*.{test,spec}.{ts,tsx}'
    ],
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8',
      reportsDirectory: 'coverage'
    }
  },
  resolve: {
    alias: {
      '@crocdesk/shared': path.resolve(__dirname, 'packages/shared/src')
    }
  }
});
