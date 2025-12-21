import { expect } from 'vitest';

async function setupDomMatchers() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const matchers = await import('@testing-library/jest-dom/matchers');
  expect.extend(matchers.default ?? matchers);
}

await setupDomMatchers();
