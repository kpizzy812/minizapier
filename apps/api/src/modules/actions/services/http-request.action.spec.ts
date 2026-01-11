/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { HttpRequestAction } from './http-request.action';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('HttpRequestAction', () => {
  let service: HttpRequestAction;

  beforeEach(() => {
    service = new HttpRequestAction();
    mockFetch.mockClear();
  });

  describe('execute - successful requests', () => {
    it('should execute GET request', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: 'test' }),
      });

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com/data',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        status: 200,
        statusText: 'OK',
        body: { success: true, data: 'test' },
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should execute POST request with JSON body', async () => {
      mockFetch.mockResolvedValue({
        status: 201,
        statusText: 'Created',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 123 }),
      });

      const result = await service.execute({
        method: 'POST',
        url: 'https://api.example.com/users',
        body: JSON.stringify({ name: 'John' }),
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        status: 201,
        body: { id: 123 },
      });
    });

    it('should handle text response', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Plain text response',
      });

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com/text',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        body: 'Plain text response',
      });
    });

    it('should include response headers', async () => {
      const responseHeaders = new Headers({
        'content-type': 'application/json',
        'x-request-id': 'abc123',
        'x-rate-limit': '100',
      });

      mockFetch.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: responseHeaders,
        json: async () => ({}),
      });

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com/data',
      });

      expect(result.success).toBe(true);
      expect(result.data?.headers).toMatchObject({
        'content-type': 'application/json',
        'x-request-id': 'abc123',
      });
    });

    it('should set content-type automatically for POST', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: async () => '',
      });

      await service.execute({
        method: 'POST',
        url: 'https://api.example.com/data',
        body: '{"test": true}',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );

      const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(callHeaders.get('Content-Type')).toBe('application/json');
    });

    it('should calculate duration', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: async () => '',
      });

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('execute - authentication', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: async () => '',
      });
    });

    it('should apply basic auth', async () => {
      await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
        auth: {
          type: 'basic',
          username: 'user',
          password: 'pass',
        },
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      const authHeader = callHeaders.get('Authorization');
      const expectedAuth =
        'Basic ' + Buffer.from('user:pass').toString('base64');
      expect(authHeader).toBe(expectedAuth);
    });

    it('should apply bearer token auth', async () => {
      await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
        auth: {
          type: 'bearer',
          token: 'my-jwt-token',
        },
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(callHeaders.get('Authorization')).toBe('Bearer my-jwt-token');
    });

    it('should apply API key auth with default header', async () => {
      await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
        auth: {
          type: 'api_key',
          apiKey: 'sk-12345',
        },
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(callHeaders.get('X-API-Key')).toBe('sk-12345');
    });

    it('should apply API key auth with custom header', async () => {
      await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
        auth: {
          type: 'api_key',
          apiKey: 'my-api-key',
          headerName: 'X-Custom-Auth',
        },
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(callHeaders.get('X-Custom-Auth')).toBe('my-api-key');
    });
  });

  describe('execute - custom headers', () => {
    it('should pass custom headers', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: async () => '',
      });

      await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
        headers: {
          'X-Custom-Header': 'custom-value',
          Accept: 'application/json',
        },
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(callHeaders.get('X-Custom-Header')).toBe('custom-value');
      expect(callHeaders.get('Accept')).toBe('application/json');
    });
  });

  describe('execute - error responses', () => {
    it('should return error for 4xx status', async () => {
      mockFetch.mockResolvedValue({
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Resource not found' }),
      });

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com/missing',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 404: Not Found');
      expect(result.data?.status).toBe(404);
    });

    it('should return error for 5xx status', async () => {
      mockFetch.mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        text: async () => 'Server error',
      });

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com/error',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500: Internal Server Error');
    });

    it('should consider 3xx as success', async () => {
      mockFetch.mockResolvedValue({
        status: 302,
        statusText: 'Found',
        headers: new Headers({ location: 'https://example.com/new' }),
        text: async () => '',
      });

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com/redirect',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - network errors', () => {
    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
        timeout: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle JSON parse error gracefully', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => 'Not valid JSON',
      });

      const result = await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data?.body).toBe('Not valid JSON');
    });
  });

  describe('execute - request methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: async () => '',
      });
    });

    it('should not include body for GET request', async () => {
      await service.execute({
        method: 'GET',
        url: 'https://api.example.com',
        body: 'should be ignored',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: undefined,
        }),
      );
    });

    it('should not include body for DELETE request', async () => {
      await service.execute({
        method: 'DELETE',
        url: 'https://api.example.com/item/1',
        body: 'should be ignored',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: undefined,
        }),
      );
    });

    it('should include body for PUT request', async () => {
      await service.execute({
        method: 'PUT',
        url: 'https://api.example.com/item/1',
        body: '{"updated": true}',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: '{"updated": true}',
        }),
      );
    });

    it('should include body for PATCH request', async () => {
      await service.execute({
        method: 'PATCH',
        url: 'https://api.example.com/item/1',
        body: '{"partial": true}',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: '{"partial": true}',
        }),
      );
    });
  });
});
