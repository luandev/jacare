import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, apiPost } from '../api';

// Mock fetch globally
global.fetch = vi.fn();

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiGet', () => {
    it('makes GET request to correct endpoint', async () => {
      const mockResponse = { data: 'test' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiGet('/test');

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3333/test');
      expect(result).toEqual(mockResponse);
    });

    it('throws error when response is not ok', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(apiGet('/test')).rejects.toThrow();
    });
  });

  describe('apiPost', () => {
    it('makes POST request with correct body', async () => {
      const mockResponse = { ok: true };
      const payload = { slug: 'test' };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiPost('/test', payload);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(payload)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('handles empty payload', async () => {
      const mockResponse = { ok: true };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await apiPost('/test', {});

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/test',
        expect.objectContaining({
          body: JSON.stringify({})
        })
      );
    });
  });
});

