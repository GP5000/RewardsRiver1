/**
 * lib/validateUrl.ts
 * SSRF protection for advertiser-submitted URLs (trackingUrl, postbackUrl).
 * Resolves the hostname to an IP and rejects private/loopback/link-local ranges.
 *
 * Usage:
 *   await validatePublicUrl(url); // throws ValidationError if unsafe
 */

import dns from "dns/promises";

// Private and reserved IP ranges (IPv4)
const BLOCKED_RANGES: Array<[number, number, number]> = [
  // [start, end, mask bits] — all in 32-bit uint form
  // 10.0.0.0/8
  [ip4ToInt("10.0.0.0"), ip4ToInt("10.255.255.255"), 8],
  // 172.16.0.0/12
  [ip4ToInt("172.16.0.0"), ip4ToInt("172.31.255.255"), 12],
  // 192.168.0.0/16
  [ip4ToInt("192.168.0.0"), ip4ToInt("192.168.255.255"), 16],
  // 127.0.0.0/8 (loopback)
  [ip4ToInt("127.0.0.0"), ip4ToInt("127.255.255.255"), 8],
  // 169.254.0.0/16 (link-local / AWS metadata)
  [ip4ToInt("169.254.0.0"), ip4ToInt("169.254.255.255"), 16],
  // 0.0.0.0/8
  [ip4ToInt("0.0.0.0"), ip4ToInt("0.255.255.255"), 8],
  // 100.64.0.0/10 (CGNAT)
  [ip4ToInt("100.64.0.0"), ip4ToInt("100.127.255.255"), 10],
];

function ip4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIp(ip: string): boolean {
  // Reject obvious IPv6 loopback/private
  if (ip === "::1" || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  if (ip.includes(":")) return false; // non-loopback IPv6 — allow for now

  const intIp = ip4ToInt(ip);
  for (const [start, end] of BLOCKED_RANGES) {
    if (intIp >= start && intIp <= end) return true;
  }
  return false;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validates that a URL is safe for use as a tracking or postback target.
 * Throws ValidationError for invalid, non-HTTPS, or private-network URLs.
 */
export async function validatePublicUrl(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ValidationError(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "https:") {
    throw new ValidationError("URL must use HTTPS");
  }

  const hostname = parsed.hostname;

  // Reject numeric IPs directly
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new ValidationError(`URL hostname resolves to a private/reserved IP: ${hostname}`);
    }
    return rawUrl;
  }

  // Resolve hostname → IPs
  let addresses: string[];
  try {
    addresses = await dns.resolve4(hostname);
  } catch {
    throw new ValidationError(`Unable to resolve hostname: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new ValidationError(`No A records found for hostname: ${hostname}`);
  }

  for (const ip of addresses) {
    if (isPrivateIp(ip)) {
      throw new ValidationError(
        `URL hostname "${hostname}" resolves to a private/reserved IP: ${ip}`
      );
    }
  }

  return rawUrl;
}
