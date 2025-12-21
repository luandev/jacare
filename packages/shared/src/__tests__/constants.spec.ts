import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_PROFILE } from '../constants';

describe('shared defaults', () => {
  it('DEFAULT_SETTINGS has expected values', () => {
    expect(DEFAULT_SETTINGS.downloadDir).toBe('./downloads');
    expect(DEFAULT_SETTINGS.queue).toBeDefined();
    expect(DEFAULT_SETTINGS.queue?.concurrency).toBe(2);
    expect(Array.isArray(DEFAULT_SETTINGS.libraryRoots)).toBe(true);
  });

  it('DEFAULT_PROFILE has expected values', () => {
    expect(DEFAULT_PROFILE.id).toBe('default');
    expect(DEFAULT_PROFILE.name).toBe('Default');
    expect(DEFAULT_PROFILE.postActions).toBeDefined();
    expect(DEFAULT_PROFILE.postActions!.writeManifest).toBe(true);
    expect(DEFAULT_PROFILE.postActions!.writePlaylists).toBe(false);
  });
});
