/**
 * lib/geoip.ts
 * Country lookup using Vercel/Cloudflare edge geo headers.
 * No binary database files — works in all serverless environments.
 *
 * Pass the NextRequest headers to lookupCountry for the most accurate result.
 * Falls back to null if no geo header is present.
 */

import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

/**
 * Returns the ISO 3166-1 alpha-2 country code from edge headers,
 * or null if unavailable.
 *
 * Checks (in order):
 *   x-vercel-ip-country  — set by Vercel Edge Network
 *   cf-ipcountry         — set by Cloudflare
 *   x-geo-country        — generic fallback some proxies set
 */
export function lookupCountry(
  _ip: string | null | undefined,
  headers?: ReadonlyHeaders | Headers | null
): string | null {
  if (!headers) return null;
  try {
    const country =
      headers.get("x-vercel-ip-country") ??
      headers.get("cf-ipcountry") ??
      headers.get("x-geo-country");
    return country && country !== "XX" ? country.toUpperCase() : null;
  } catch {
    return null;
  }
}
