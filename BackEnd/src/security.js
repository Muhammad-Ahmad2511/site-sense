import dns from 'node:dns/promises';
import net from 'node:net';
import ipaddr from 'ipaddr.js';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_PORTS = new Set(['', '80', '443']);
const SAFE_NON_HTTP_PROTOCOLS = new Set(['about:', 'data:', 'blob:']);

function normalizeAddress(address) {
  let parsed = ipaddr.parse(address);
  if (parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }
  return parsed;
}

function isBlockedAddress(address) {
  const parsed = normalizeAddress(address);
  // ipaddr.js classifies globally routable IPv4 and IPv6 addresses as "unicast".
  // Everything else (private, loopback, reserved, documentation, multicast, etc.) is blocked.
  return parsed.range() !== 'unicast';
}

export function normalizeInputUrl(input) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new Error('Please enter a website address.');
  }

  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The website address is not valid.');
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error('Only HTTP and HTTPS websites can be audited.');
  }
  if (url.username || url.password) {
    throw new Error('Website addresses containing usernames or passwords are not accepted.');
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new Error('For safety, only standard web ports 80 and 443 are supported.');
  }

  url.hash = '';
  return url;
}

export class PublicUrlGuard {
  constructor() {
    this.cache = new Map();
  }

  async assertUrl(urlLike) {
    const url = urlLike instanceof URL ? urlLike : new URL(urlLike);

    if (SAFE_NON_HTTP_PROTOCOLS.has(url.protocol)) return url;
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      throw new Error(`Blocked unsupported protocol: ${url.protocol}`);
    }
    if (!ALLOWED_PORTS.has(url.port)) {
      throw new Error('Blocked a request to a non-standard port.');
    }
    if (url.username || url.password) {
      throw new Error('Blocked a URL containing credentials.');
    }

    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      throw new Error('Local and private network addresses cannot be audited.');
    }

    if (this.cache.has(hostname)) {
      const cached = this.cache.get(hostname);
      if (Date.now() - cached.checkedAt < 10 * 60 * 1000) {
        if (!cached.safe) throw new Error(cached.reason);
        return url;
      }
      this.cache.delete(hostname);
    }

    try {
      const literal = hostname.replace(/^\[|\]$/g, '');
      const records = net.isIP(literal)
        ? [{ address: literal }]
        : await dns.lookup(hostname, { all: true, verbatim: true });
      if (!records.length) throw new Error('The host did not resolve to an IP address.');

      for (const record of records) {
        if (isBlockedAddress(record.address)) {
          const reason = 'Local, private, reserved, and non-public network addresses cannot be audited.';
          this.cache.set(hostname, { safe: false, reason, checkedAt: Date.now() });
          throw new Error(reason);
        }
      }

      this.cache.set(hostname, { safe: true, checkedAt: Date.now() });
      return url;
    } catch (error) {
      const reason = error?.message || 'The website host could not be resolved.';
      this.cache.set(hostname, { safe: false, reason, checkedAt: Date.now() });
      throw new Error(reason);
    }
  }
}
