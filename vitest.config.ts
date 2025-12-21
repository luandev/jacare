import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'apps/**/src/**/__tests__/**/*.{test,spec}.ts',
      'apps/**/src/**/*.{test,spec}.ts',
      'packages/**/src/**/__tests__/**/*.{test,spec}.ts',
      'packages/**/src/**/*.{test,spec}.ts'
    ],
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8',
      reportsDirectory: 'coverage'
    }
  }
});