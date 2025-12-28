import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import settingsRouter from '../settings';
import * as db from '../../db';
import { DEFAULT_SETTINGS } from '@crocdesk/shared';

// Mock the database module
vi.mock('../../db', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn()
}));

describe('Settings API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/settings', settingsRouter);
    vi.clearAllMocks();
  });

  describe('GET /settings', () => {
    it('should return default settings when no settings exist', async () => {
      vi.mocked(db.getSettings).mockReturnValue(null);

      const response = await request(app).get('/settings');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(DEFAULT_SETTINGS);
    });

    it('should return stored settings when they exist', async () => {
      const mockSettings = {
        downloadDir: '/custom/downloads',
        libraryDir: '/custom/library',
        platformAcronyms: { snes: 'sfc' },
        platformIcons: { snes: 'nintendo' }
      };
      vi.mocked(db.getSettings).mockReturnValue(mockSettings);

      const response = await request(app).get('/settings');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSettings);
    });
  });

  describe('PUT /settings', () => {
    it('should accept valid settings', async () => {
      const validSettings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {
          snes: 'sfc',
          playstation: 'psx'
        },
        platformIcons: {
          snes: 'nintendo',
          playstation: 'sony'
        }
      };

      const response = await request(app)
        .put('/settings')
        .send(validSettings);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
      expect(db.setSettings).toHaveBeenCalledWith(validSettings);
    });

    it('should handle empty body', async () => {
      // Express parses empty/null bodies as empty object {}
      // This is acceptable behavior as empty settings won't break anything
      const response = await request(app)
        .put('/settings')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it('should handle non-JSON content type', async () => {
      // When sending non-JSON, Express will reject it at middleware level
      const response = await request(app)
        .put('/settings')
        .set('Content-Type', 'text/plain')
        .send('invalid');

      // Express json middleware will produce empty body, which is {} after parsing
      // This will pass validation as an empty settings object
      expect(response.status).toBe(200);
    });

    describe('platformAcronyms validation', () => {
      it('should reject non-object platformAcronyms', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformAcronyms: 'not-an-object'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('platformAcronyms must be an object');
        expect(db.setSettings).not.toHaveBeenCalled();
      });

      it('should reject acronyms that are too short', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformAcronyms: {
              snes: 'x'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid acronym "x"');
        expect(response.body.error).toContain('Must be 2-12 characters');
        expect(db.setSettings).not.toHaveBeenCalled();
      });

      it('should reject acronyms that are too long', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformAcronyms: {
              snes: 'verylongacronym'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid acronym');
        expect(db.setSettings).not.toHaveBeenCalled();
      });

      it('should reject acronyms with invalid characters', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformAcronyms: {
              snes: 'snes!'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid acronym "snes!"');
        expect(db.setSettings).not.toHaveBeenCalled();
      });

      it('should accept valid acronyms', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformAcronyms: {
              snes: 'sfc',
              playstation: 'psx',
              'n64': 'n64',
              'xbox-360': 'x360'
            }
          });

        expect(response.status).toBe(200);
        expect(db.setSettings).toHaveBeenCalled();
      });
    });

    describe('platformIcons validation', () => {
      it('should reject non-object platformIcons', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformIcons: 'not-an-object'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('platformIcons must be an object');
        expect(db.setSettings).not.toHaveBeenCalled();
      });

      it('should reject invalid icon brands', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformIcons: {
              snes: 'playstation'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid icon brand "playstation"');
        expect(response.body.error).toContain('Must be one of: nintendo, sony, xbox, sega, pc, atari, commodore, nec, generic');
        expect(db.setSettings).not.toHaveBeenCalled();
      });

      it('should reject case-sensitive icon brands', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformIcons: {
              snes: 'Nintendo'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid icon brand "Nintendo"');
        expect(db.setSettings).not.toHaveBeenCalled();
      });

      it('should accept all valid icon brands', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformIcons: {
              platform1: 'nintendo',
              platform2: 'sony',
              platform3: 'xbox',
              platform4: 'sega',
              platform5: 'pc',
              platform6: 'atari',
              platform7: 'commodore',
              platform8: 'nec',
              platform9: 'generic'
            }
          });

        expect(response.status).toBe(200);
        expect(db.setSettings).toHaveBeenCalled();
      });
    });

    describe('Combined validation', () => {
      it('should validate both acronyms and icons together', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformAcronyms: {
              snes: 'sfc',
              playstation: 'psx'
            },
            platformIcons: {
              snes: 'nintendo',
              playstation: 'sony'
            }
          });

        expect(response.status).toBe(200);
        expect(db.setSettings).toHaveBeenCalled();
      });

      it('should stop at first validation error', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformAcronyms: {
              snes: 'x' // invalid
            },
            platformIcons: {
              playstation: 'invalid' // would also be invalid
            }
          });

        expect(response.status).toBe(400);
        // Should fail on acronym validation first
        expect(response.body.error).toContain('Invalid acronym "x"');
        expect(db.setSettings).not.toHaveBeenCalled();
      });

      it('should allow empty override objects', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library',
            platformAcronyms: {},
            platformIcons: {}
          });

        expect(response.status).toBe(200);
        expect(db.setSettings).toHaveBeenCalled();
      });

      it('should allow missing override fields', async () => {
        const response = await request(app)
          .put('/settings')
          .send({
            downloadDir: './downloads',
            libraryDir: './library'
          });

        expect(response.status).toBe(200);
        expect(db.setSettings).toHaveBeenCalled();
      });
    });
  });
});
