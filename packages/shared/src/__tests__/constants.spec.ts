import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../constants';

describe('shared defaults', () => {
  it('DEFAULT_SETTINGS has expected values', () => {
    expect(DEFAULT_SETTINGS.downloadDir).toBe('./downloads');
    expect(DEFAULT_SETTINGS.queue).toBeDefined();
    expect(DEFAULT_SETTINGS.queue).toEqual({ concurrency: 2 });
    expect(DEFAULT_SETTINGS.platformShortNames).toEqual({});
  });
});
