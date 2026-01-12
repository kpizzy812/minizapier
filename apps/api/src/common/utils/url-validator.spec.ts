import {
  validateUrlForSsrf,
  isPrivateIp,
  isBlockedHostname,
} from './url-validator';

describe('URL Validator (SSRF Protection)', () => {
  describe('validateUrlForSsrf', () => {
    describe('valid URLs', () => {
      it('should allow regular HTTP URLs', () => {
        const result = validateUrlForSsrf('http://example.com/api');
        expect(result.isValid).toBe(true);
        expect(result.hostname).toBe('example.com');
      });

      it('should allow regular HTTPS URLs', () => {
        const result = validateUrlForSsrf('https://api.github.com/users');
        expect(result.isValid).toBe(true);
        expect(result.hostname).toBe('api.github.com');
      });

      it('should allow URLs with ports', () => {
        const result = validateUrlForSsrf('https://example.com:8080/api');
        expect(result.isValid).toBe(true);
        expect(result.port).toBe(8080);
      });

      it('should allow external IP addresses', () => {
        const result = validateUrlForSsrf('http://8.8.8.8/dns-query');
        expect(result.isValid).toBe(true);
      });
    });

    describe('blocked URLs - localhost', () => {
      it('should block localhost', () => {
        const result = validateUrlForSsrf('http://localhost/api');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('not allowed');
      });

      it('should block 127.0.0.1', () => {
        const result = validateUrlForSsrf('http://127.0.0.1/api');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('private/internal');
      });

      it('should block 127.x.x.x range', () => {
        const result = validateUrlForSsrf('http://127.0.0.255/api');
        expect(result.isValid).toBe(false);
      });

      it('should block 0.0.0.0', () => {
        const result = validateUrlForSsrf('http://0.0.0.0/api');
        expect(result.isValid).toBe(false);
      });
    });

    describe('blocked URLs - private networks', () => {
      it('should block 10.x.x.x range', () => {
        const result = validateUrlForSsrf('http://10.0.0.1/api');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('private/internal');
      });

      it('should block 192.168.x.x range', () => {
        const result = validateUrlForSsrf('http://192.168.1.1/api');
        expect(result.isValid).toBe(false);
      });

      it('should block 172.16.x.x range', () => {
        const result = validateUrlForSsrf('http://172.16.0.1/api');
        expect(result.isValid).toBe(false);
      });

      it('should block 172.31.x.x range', () => {
        const result = validateUrlForSsrf('http://172.31.255.255/api');
        expect(result.isValid).toBe(false);
      });

      it('should allow 172.32.x.x (outside private range)', () => {
        const result = validateUrlForSsrf('http://172.32.0.1/api');
        expect(result.isValid).toBe(true);
      });
    });

    describe('blocked URLs - cloud metadata', () => {
      it('should block AWS/GCP metadata endpoint', () => {
        const result = validateUrlForSsrf(
          'http://169.254.169.254/latest/meta-data',
        );
        expect(result.isValid).toBe(false);
      });

      it('should block Google metadata hostname', () => {
        const result = validateUrlForSsrf(
          'http://metadata.google.internal/computeMetadata/v1',
        );
        expect(result.isValid).toBe(false);
      });
    });

    describe('blocked URLs - protocols', () => {
      it('should block file:// protocol', () => {
        const result = validateUrlForSsrf('file:///etc/passwd');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Protocol not allowed');
      });

      it('should block ftp:// protocol', () => {
        const result = validateUrlForSsrf('ftp://example.com/file');
        expect(result.isValid).toBe(false);
      });
    });

    describe('blocked URLs - ports', () => {
      it('should block SSH port 22', () => {
        const result = validateUrlForSsrf('http://example.com:22/');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('port 22');
      });

      it('should block PostgreSQL port 5432', () => {
        const result = validateUrlForSsrf('http://example.com:5432/');
        expect(result.isValid).toBe(false);
      });

      it('should block Redis port 6379', () => {
        const result = validateUrlForSsrf('http://example.com:6379/');
        expect(result.isValid).toBe(false);
      });

      it('should allow standard HTTP port 80', () => {
        const result = validateUrlForSsrf('http://example.com:80/');
        expect(result.isValid).toBe(true);
      });

      it('should allow standard HTTPS port 443', () => {
        const result = validateUrlForSsrf('https://example.com:443/');
        expect(result.isValid).toBe(true);
      });
    });

    describe('invalid URLs', () => {
      it('should reject invalid URL format', () => {
        const result = validateUrlForSsrf('not-a-url');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid URL');
      });

      it('should reject empty string', () => {
        const result = validateUrlForSsrf('');
        expect(result.isValid).toBe(false);
      });
    });

    describe('IPv6 addresses', () => {
      it('should block IPv6 localhost ::1', () => {
        const result = validateUrlForSsrf('http://[::1]/api');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('isPrivateIp', () => {
    it('should return true for 127.0.0.1', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
    });

    it('should return true for 10.0.0.1', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
    });

    it('should return true for 192.168.0.1', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true);
    });

    it('should return false for 8.8.8.8', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
    });
  });

  describe('isBlockedHostname', () => {
    it('should return true for localhost', () => {
      expect(isBlockedHostname('localhost')).toBe(true);
    });

    it('should return true for metadata.google.internal', () => {
      expect(isBlockedHostname('metadata.google.internal')).toBe(true);
    });

    it('should return false for example.com', () => {
      expect(isBlockedHostname('example.com')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isBlockedHostname('LOCALHOST')).toBe(true);
    });
  });
});
