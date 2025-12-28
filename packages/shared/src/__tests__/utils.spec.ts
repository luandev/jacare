import { describe, it, expect } from 'vitest';
import {
  isValidAcronym,
  isValidIconBrand,
  resolvePlatformAcronym,
  resolvePlatformIcon
} from '../utils';
import type { Settings } from '../types';

describe('Platform Acronym and Icon Utilities', () => {
  describe('isValidAcronym', () => {
    it('should accept valid acronyms', () => {
      expect(isValidAcronym('snes')).toBe(true);
      expect(isValidAcronym('ps1')).toBe(true);
      expect(isValidAcronym('n64')).toBe(true);
      expect(isValidAcronym('a2600')).toBe(true);
      expect(isValidAcronym('x360')).toBe(true);
      expect(isValidAcronym('sfc')).toBe(true);
      expect(isValidAcronym('psx')).toBe(true);
      expect(isValidAcronym('md')).toBe(true);
      expect(isValidAcronym('neo-geo')).toBe(true);
      expect(isValidAcronym('pc_engine')).toBe(true);
      expect(isValidAcronym('AB')).toBe(true); // uppercase
      expect(isValidAcronym('Ab12')).toBe(true); // mixed case
    });

    it('should reject acronyms that are too short', () => {
      expect(isValidAcronym('a')).toBe(false);
      expect(isValidAcronym('x')).toBe(false);
      expect(isValidAcronym('')).toBe(false);
    });

    it('should reject acronyms that are too long', () => {
      expect(isValidAcronym('verylongacronym')).toBe(false);
      expect(isValidAcronym('morethan12chr')).toBe(false);
    });

    it('should reject acronyms with invalid characters', () => {
      expect(isValidAcronym('snes!')).toBe(false);
      expect(isValidAcronym('ps@1')).toBe(false);
      expect(isValidAcronym('n 64')).toBe(false); // space
      expect(isValidAcronym('game.boy')).toBe(false); // dot
      expect(isValidAcronym('snes/pal')).toBe(false); // slash
    });

    it('should handle edge cases', () => {
      expect(isValidAcronym('--')).toBe(true); // only dashes (valid but weird)
      expect(isValidAcronym('__')).toBe(true); // only underscores (valid but weird)
      expect(isValidAcronym('12')).toBe(true); // only numbers
      expect(isValidAcronym('-_-_-_-_-_-_')).toBe(true); // alternating (12 chars)
    });
  });

  describe('isValidIconBrand', () => {
    it('should accept valid icon brands', () => {
      expect(isValidIconBrand('nintendo')).toBe(true);
      expect(isValidIconBrand('sony')).toBe(true);
      expect(isValidIconBrand('xbox')).toBe(true);
      expect(isValidIconBrand('sega')).toBe(true);
      expect(isValidIconBrand('pc')).toBe(true);
      expect(isValidIconBrand('atari')).toBe(true);
      expect(isValidIconBrand('commodore')).toBe(true);
      expect(isValidIconBrand('nec')).toBe(true);
      expect(isValidIconBrand('generic')).toBe(true);
    });

    it('should reject invalid icon brands', () => {
      expect(isValidIconBrand('playstation')).toBe(false);
      expect(isValidIconBrand('microsoft')).toBe(false);
      expect(isValidIconBrand('Nintendo')).toBe(false); // case sensitive
      expect(isValidIconBrand('SONY')).toBe(false); // case sensitive
      expect(isValidIconBrand('')).toBe(false);
      expect(isValidIconBrand('unknown')).toBe(false);
    });
  });

  describe('resolvePlatformAcronym', () => {
    it('should return custom acronym when provided in settings', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {
          'snes': 'sfc',
          'playstation': 'psx'
        }
      };

      expect(resolvePlatformAcronym('snes', settings)).toBe('sfc');
      expect(resolvePlatformAcronym('playstation', settings)).toBe('psx');
    });

    it('should normalize platform name before lookup', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {
          'snes': 'sfc'
        }
      };

      expect(resolvePlatformAcronym('SNES', settings)).toBe('sfc');
      expect(resolvePlatformAcronym('Snes', settings)).toBe('sfc');
      expect(resolvePlatformAcronym('  snes  ', settings)).toBe('sfc');
    });

    it('should fall back to default acronym when custom not provided', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {}
      };

      expect(resolvePlatformAcronym('snes', settings)).toBe('snes');
      expect(resolvePlatformAcronym('playstation', settings)).toBe('ps1');
      expect(resolvePlatformAcronym('n64', settings)).toBe('n64');
      expect(resolvePlatformAcronym('game boy', settings)).toBe('gb');
    });

    it('should fall back to default when custom acronym is invalid', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {
          'snes': 'x', // too short
          'playstation': 'verylongacronym!' // too long and invalid chars
        }
      };

      expect(resolvePlatformAcronym('snes', settings)).toBe('snes');
      expect(resolvePlatformAcronym('playstation', settings)).toBe('ps1');
    });

    it('should sanitize platform name when no default exists', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {}
      };

      expect(resolvePlatformAcronym('unknown platform', settings)).toBe('unknown-plat');
      expect(resolvePlatformAcronym('test@platform!', settings)).toBe('test-platfor');
      expect(resolvePlatformAcronym('very-long-platform-name', settings)).toBe('very-long-pl');
    });

    it('should work without settings parameter', () => {
      expect(resolvePlatformAcronym('snes')).toBe('snes');
      expect(resolvePlatformAcronym('playstation')).toBe('ps1');
      expect(resolvePlatformAcronym('unknown platform')).toBe('unknown-plat');
    });

    it('should handle empty platformAcronyms object', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library'
      };

      expect(resolvePlatformAcronym('snes', settings)).toBe('snes');
    });
  });

  describe('resolvePlatformIcon', () => {
    it('should return custom icon when provided in settings', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformIcons: {
          'snes': 'atari',
          'playstation': 'pc'
        }
      };

      expect(resolvePlatformIcon('snes', settings)).toBe('atari');
      expect(resolvePlatformIcon('playstation', settings)).toBe('pc');
    });

    it('should normalize platform name before lookup', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformIcons: {
          'snes': 'pc'
        }
      };

      expect(resolvePlatformIcon('SNES', settings)).toBe('pc');
      expect(resolvePlatformIcon('Snes', settings)).toBe('pc');
      expect(resolvePlatformIcon('  snes  ', settings)).toBe('pc');
    });

    it('should fall back to default icon when custom not provided', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformIcons: {}
      };

      expect(resolvePlatformIcon('snes', settings)).toBe('nintendo');
      expect(resolvePlatformIcon('playstation', settings)).toBe('sony');
      expect(resolvePlatformIcon('xbox', settings)).toBe('xbox');
      expect(resolvePlatformIcon('genesis', settings)).toBe('sega');
    });

    it('should fall back to default when custom icon is invalid', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformIcons: {
          'snes': 'playstation', // invalid brand
          'playstation': 'Microsoft' // invalid brand
        }
      };

      expect(resolvePlatformIcon('snes', settings)).toBe('nintendo');
      expect(resolvePlatformIcon('playstation', settings)).toBe('sony');
    });

    it('should return generic for unknown platforms', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformIcons: {}
      };

      expect(resolvePlatformIcon('unknown platform', settings)).toBe('generic');
      expect(resolvePlatformIcon('future console', settings)).toBe('generic');
    });

    it('should work without settings parameter', () => {
      expect(resolvePlatformIcon('snes')).toBe('nintendo');
      expect(resolvePlatformIcon('playstation')).toBe('sony');
      expect(resolvePlatformIcon('unknown')).toBe('generic');
    });

    it('should handle empty platformIcons object', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library'
      };

      expect(resolvePlatformIcon('snes', settings)).toBe('nintendo');
    });
  });

  describe('Resolution precedence', () => {
    it('should prioritize custom over default for acronyms', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {
          'snes': 'custom'
        }
      };

      // Custom value should override default
      expect(resolvePlatformAcronym('snes', settings)).toBe('custom');
      // Non-customized should still use default
      expect(resolvePlatformAcronym('n64', settings)).toBe('n64');
    });

    it('should prioritize custom over default for icons', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformIcons: {
          'snes': 'sega' // odd but valid choice
        }
      };

      // Custom value should override default
      expect(resolvePlatformIcon('snes', settings)).toBe('sega');
      // Non-customized should still use default
      expect(resolvePlatformIcon('n64', settings)).toBe('nintendo');
    });

    it('should handle mixed valid and invalid custom values', () => {
      const settings: Settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {
          'snes': 'sfc', // valid
          'n64': 'x', // invalid - too short
          'playstation': 'psx' // valid
        },
        platformIcons: {
          'snes': 'pc', // valid
          'n64': 'invalid', // invalid brand
          'genesis': 'atari' // valid
        }
      };

      // Valid customs should be used
      expect(resolvePlatformAcronym('snes', settings)).toBe('sfc');
      expect(resolvePlatformAcronym('playstation', settings)).toBe('psx');
      expect(resolvePlatformIcon('snes', settings)).toBe('pc');
      expect(resolvePlatformIcon('genesis', settings)).toBe('atari');

      // Invalid customs should fall back to defaults
      expect(resolvePlatformAcronym('n64', settings)).toBe('n64');
      expect(resolvePlatformIcon('n64', settings)).toBe('nintendo');
    });
  });
});
