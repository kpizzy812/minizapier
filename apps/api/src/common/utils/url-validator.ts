/**
 * URL Validator for SSRF Protection
 *
 * Validates URLs to prevent Server-Side Request Forgery (SSRF) attacks.
 * Blocks requests to internal networks, localhost, and cloud metadata endpoints.
 */

/**
 * Private/reserved IP ranges that should be blocked
 */
const BLOCKED_IP_PATTERNS = [
  // IPv4 localhost
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // IPv4 private networks
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
  // Link-local
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // 169.254.0.0/16 (includes AWS metadata)
  // Loopback
  /^0\.0\.0\.0$/,
  // IPv6 localhost/loopback
  /^::1$/,
  /^0:0:0:0:0:0:0:1$/,
  // IPv6 private
  /^fc[\da-f]{2}:/i, // fc00::/7 unique local
  /^fd[\da-f]{2}:/i, // fd00::/8 unique local
  /^fe80:/i, // fe80::/10 link-local
];

/**
 * Hostnames that should be blocked
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  // Cloud metadata endpoints
  'metadata.google.internal',
  'metadata.goog',
  // Kubernetes internal
  'kubernetes.default',
  'kubernetes.default.svc',
  'kubernetes.default.svc.cluster.local',
];

/**
 * Blocked ports (common internal services)
 */
const BLOCKED_PORTS = [
  22, // SSH
  25, // SMTP
  3306, // MySQL
  5432, // PostgreSQL
  6379, // Redis
  27017, // MongoDB
  9200, // Elasticsearch
  11211, // Memcached
];

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  hostname?: string;
  port?: number;
}

/**
 * Validates a URL for SSRF protection
 * @param urlString - The URL to validate
 * @returns Validation result
 */
export function validateUrlForSsrf(urlString: string): UrlValidationResult {
  let url: URL;

  // Parse URL
  try {
    url = new URL(urlString);
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  // Hostname may include brackets for IPv6, remove them for checking
  const rawHostname = url.hostname.toLowerCase();
  const hostname = rawHostname.replace(/^\[|\]$/g, ''); // Remove [] from IPv6
  const port = url.port
    ? parseInt(url.port, 10)
    : url.protocol === 'https:'
      ? 443
      : 80;

  // Check protocol - only allow HTTP/HTTPS
  if (!['http:', 'https:'].includes(url.protocol)) {
    return {
      isValid: false,
      error: `Protocol not allowed: ${url.protocol}. Only HTTP and HTTPS are supported.`,
      hostname,
      port,
    };
  }

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return {
      isValid: false,
      error: `Access to ${hostname} is not allowed for security reasons`,
      hostname,
      port,
    };
  }

  // Check blocked IP patterns
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        isValid: false,
        error: `Access to private/internal IP addresses is not allowed: ${hostname}`,
        hostname,
        port,
      };
    }
  }

  // Check blocked ports (only for non-standard ports)
  if (BLOCKED_PORTS.includes(port) && port !== 80 && port !== 443) {
    return {
      isValid: false,
      error: `Access to port ${port} is not allowed for security reasons`,
      hostname,
      port,
    };
  }

  // Check for IP address in hostname that might be encoded
  // Decode potential encoded characters
  const decodedHostname = decodeURIComponent(hostname);
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(decodedHostname)) {
      return {
        isValid: false,
        error: `Access to private/internal IP addresses is not allowed: ${decodedHostname}`,
        hostname: decodedHostname,
        port,
      };
    }
  }

  return {
    isValid: true,
    hostname,
    port,
  };
}

/**
 * Checks if an IP address is private/internal
 */
export function isPrivateIp(ip: string): boolean {
  return BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Checks if a hostname is blocked
 */
export function isBlockedHostname(hostname: string): boolean {
  return BLOCKED_HOSTNAMES.includes(hostname.toLowerCase());
}
