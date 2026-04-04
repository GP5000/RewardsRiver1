/**
 * lib/logger.ts
 * Lightweight structured logger compatible with Next.js / Vercel serverless.
 * Emits JSON lines in production, pretty-prints in development.
 * Same API as the pino child loggers it replaces — no call-site changes needed.
 *
 * IMPORTANT: Never log full postback URLs (may contain advertiser secrets).
 * Log only the hostname and status. Never log API keys.
 */

const isDev = process.env.NODE_ENV !== "production";
const level = process.env.LOG_LEVEL ?? "info";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

function shouldLog(l: Level): boolean {
  return LEVELS[l] >= LEVELS[(level as Level) ?? "info"];
}

function format(domain: string, l: Level, obj: Record<string, any>, msg?: string): string {
  if (isDev) {
    const parts = [`[${l.toUpperCase()}]`, `[${domain}]`];
    if (msg) parts.push(msg);
    const extra = Object.keys(obj).length ? JSON.stringify(obj) : "";
    return parts.join(" ") + (extra ? " " + extra : "");
  }
  return JSON.stringify({
    level: l,
    service: "rewardsriver",
    domain,
    ts: new Date().toISOString(),
    ...obj,
    msg,
  });
}

function makeLogger(domain: string) {
  return {
    debug(obj: Record<string, any>, msg?: string) {
      if (shouldLog("debug")) console.debug(format(domain, "debug", obj, msg));
    },
    info(obj: Record<string, any>, msg?: string) {
      if (shouldLog("info")) console.info(format(domain, "info", obj, msg));
    },
    warn(obj: Record<string, any>, msg?: string) {
      if (shouldLog("warn")) console.warn(format(domain, "warn", obj, msg));
    },
    error(obj: Record<string, any>, msg?: string) {
      if (shouldLog("error")) console.error(format(domain, "error", obj, msg));
    },
    child(bindings: Record<string, any>) {
      return makeLogger(bindings.domain ?? domain);
    },
  };
}

const baseLogger = makeLogger("app");

export const clickLogger = makeLogger("click");
export const conversionLogger = makeLogger("conversion");
export const postbackLogger = makeLogger("postback");
export const fraudLogger = makeLogger("fraud");
export const authLogger = makeLogger("auth");

export default baseLogger;
