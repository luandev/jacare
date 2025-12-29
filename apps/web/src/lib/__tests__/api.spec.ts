import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, apiPost } from '../api';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window for getApiUrl()
const mockWindow = {
  location: { origin: 'http://localhost:3333' },
  API_URL: undefined
};

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
  configurable: true
});

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.API_URL
    mockWindow.API_URL = undefined;
    // Mock /api-config endpoint to return same origin (will use relative URLs)
    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api-config') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ apiUrl: 'http://localhost:3333', port: 3333 })
        });
      }
      return Promise.reject(new Error('Unexpected fetch call'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiGet', () => {
    it('makes GET request to correct endpoint', async () => {
      const mockResponse = { data: 'test' };
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api-config') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ apiUrl: 'http://localhost:3333', port: 3333 })
          });
        }
        if (url === '/test') {
          return Promise.resolve({
            ok: true,
            headers: {
              get: (name: string) => name === 'content-type' ? 'application/json' : null
            },
            json: async () => mockResponse
          });
        }
        return Promise.reject(new Error('Unexpected fetch call'));
      });

      const result = await apiGet('/test');

      expect(global.fetch).toHaveBeenCalledWith('/test');
      expect(result).toEqual(mockResponse);
    });

    it('throws error when response is not ok', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api-config') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ apiUrl: 'http://localhost:3333', port: 3333 })
          });
        }
        if (url === '/test') {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            headers: {
              get: () => null
            },
            text: async () => ''
          });
        }
        return Promise.reject(new Error('Unexpected fetch call'));
      });

      await expect(apiGet('/test')).rejects.toThrow();
    });
  });

  describe('apiPost', () => {
    it('makes POST request with correct body', async () => {
      const mockResponse = { ok: true };
      const payload = { slug: 'test' };
      
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api-config') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ apiUrl: 'http://localhost:3333', port: 3333 })
          });
        }
        if (url === '/test') {
          return Promise.resolve({
            ok: true,
            headers: {
              get: (name: string) => name === 'content-type' ? 'application/json' : null
            },
            json: async () => mockResponse
          });
        }
        return Promise.reject(new Error('Unexpected fetch call'));
      });

      const result = await apiPost('/test', payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/test',
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
      
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api-config') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ apiUrl: 'http://localhost:3333', port: 3333 })
          });
        }
        if (url === '/test') {
          return Promise.resolve({
            ok: true,
            headers: {
              get: (name: string) => name === 'content-type' ? 'application/json' : null
            },
            json: async () => mockResponse
          });
        }
        return Promise.reject(new Error('Unexpected fetch call'));
      });

      await apiPost('/test', {});

      expect(global.fetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          body: JSON.stringify({})
        })
      );
    });
  });
});

