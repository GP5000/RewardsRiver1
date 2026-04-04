// src/lib/env.ts
import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const ENV = {
  MONGODB_URI: requireEnv("MONGODB_URI"),
  NODE_ENV: process.env.NODE_ENV || "development",
  // Add more as you go:
  // STRIPE_SECRET_KEY: requireEnv("STRIPE_SECRET_KEY"),
  // PAYPAL_CLIENT_ID: requireEnv("PAYPAL_CLIENT_ID"),
  // PAYPAL_SECRET: requireEnv("PAYPAL_SECRET"),
};
