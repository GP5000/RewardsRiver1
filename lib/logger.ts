/**
 * lib/logger.ts
 * Structured logging via pino. In development uses pino-pretty for readability.
 * In production emits JSON (one object per line) for log aggregators.
 *
 * IMPORTANT: Never log full postback URLs (may contain advertiser secrets).
 * Log only the hostname and status. Never log API keys.
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const baseLogger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    base: { service: "rewardsriver" },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
      })
    : undefined
);

// Child loggers scoped per domain
export const clickLogger = baseLogger.child({ domain: "click" });
export const conversionLogger = baseLogger.child({ domain: "conversion" });
export const postbackLogger = baseLogger.child({ domain: "postback" });
export const fraudLogger = baseLogger.child({ domain: "fraud" });
export const authLogger = baseLogger.child({ domain: "auth" });

export default baseLogger;
