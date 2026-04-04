// server/db/connect.ts
import mongoose from "mongoose";
import { ENV } from "@/lib/env";
import { validateEnv } from "@/lib/validateEnv";

declare global {
  // eslint-disable-next-line no-var
  var _rewardsriverMongooseConn: Promise<typeof mongoose> | undefined;
}

// Graceful shutdown: drain in-flight requests before closing the connection
let _inflightCount = 0;
let _shuttingDown = false;

export function incrementInflight(): void {
  _inflightCount++;
}

export function decrementInflight(): void {
  _inflightCount--;
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (_shuttingDown) return;
  _shuttingDown = true;
  console.log(`[RewardsRiver] ${signal} received — draining ${_inflightCount} in-flight requests`);

  const deadline = Date.now() + 10_000;
  while (_inflightCount > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }

  if (_inflightCount > 0) {
    console.warn(`[RewardsRiver] Forced shutdown with ${_inflightCount} requests still in flight`);
  }

  await mongoose.connection.close();
  console.log("[RewardsRiver] MongoDB connection closed");
  process.exit(0);
}

// Register shutdown handlers once
if (typeof process !== "undefined") {
  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.once("SIGINT", () => gracefulShutdown("SIGINT"));
}

export async function connectDB(): Promise<typeof mongoose> {
  validateEnv();

  if (!global._rewardsriverMongooseConn) {
    global._rewardsriverMongooseConn = mongoose
      .connect(ENV.MONGODB_URI, { dbName: "adsriver" })
      .then((conn) => {
        if (ENV.NODE_ENV !== "production") {
          console.log("[RewardsRiver] Connected to MongoDB");
        }
        return conn;
      })
      .catch((err) => {
        console.error("[RewardsRiver] MongoDB connection error", err);
        global._rewardsriverMongooseConn = undefined;
        throw err;
      });
  }
  return global._rewardsriverMongooseConn;
}

export default connectDB;
