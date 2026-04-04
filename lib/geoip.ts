/**
 * lib/geoip.ts
 * Thin wrapper around geoip-lite for IP → country lookups.
 * The geoip-lite database is bundled with the package and updated via
 * the postinstall script: node -e "require('geoip-lite').reloadDataSync()"
 */

// geoip-lite has no official TS types; require is fine here
// eslint-disable-next-line @typescript-eslint/no-require-imports
const geoip = require("geoip-lite");

/**
 * Returns the ISO 3166-1 alpha-2 country code for an IP address,
 * or null if the IP is invalid, private, or not found.
 */
export function lookupCountry(ip: string | null | undefined): string | null {
  if (!ip) return null;
  try {
    const geo = geoip.lookup(ip);
    return geo?.country ?? null;
  } catch {
    return null;
  }
}
