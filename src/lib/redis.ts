import { createClient } from "redis";

type PuzzleWarzRedisClient = ReturnType<typeof createClient>;

type GlobalRedisState = typeof globalThis & {
  __puzzlewarzRedisClient?: PuzzleWarzRedisClient;
  __puzzlewarzRedisConnectPromise?: Promise<PuzzleWarzRedisClient> | null;
  __puzzlewarzRedisErrorLoggerAttached?: boolean;
};

const globalRedisState = globalThis as GlobalRedisState;

function getRedisUrl() {
  const redisUrl = process.env.REDIS_URL?.trim();
  return redisUrl ? redisUrl : null;
}

function getOrCreateRedisClient() {
  if (!globalRedisState.__puzzlewarzRedisClient) {
    const redisUrl = getRedisUrl();
    if (!redisUrl) {
      return null;
    }

    globalRedisState.__puzzlewarzRedisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy(retries) {
          // Give up after 3 retries so .connect() rejects instead of hanging forever
          if (retries >= 3) return false;
          return Math.min(retries * 100, 1000);
        },
      },
    });
  }

  if (
    globalRedisState.__puzzlewarzRedisClient &&
    !globalRedisState.__puzzlewarzRedisErrorLoggerAttached
  ) {
    globalRedisState.__puzzlewarzRedisErrorLoggerAttached = true;
    globalRedisState.__puzzlewarzRedisClient.on("error", (error) => {
      console.error("Redis connection error:", error);
    });
  }

  return globalRedisState.__puzzlewarzRedisClient ?? null;
}

export function isRedisConfigured() {
  return Boolean(getRedisUrl());
}

export async function getRedisClient() {
  const client = getOrCreateRedisClient();
  if (!client) {
    return null;
  }

  if (client.isOpen) {
    return client;
  }

  if (!globalRedisState.__puzzlewarzRedisConnectPromise) {
    // Hard 5-second timeout so the app never hangs if Redis is unreachable
    const connectWithTimeout = Promise.race([
      client.connect().then(() => client),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis connect timeout (5s)")), 5000)
      ),
    ]);

    globalRedisState.__puzzlewarzRedisConnectPromise = connectWithTimeout
      .catch((err) => {
        // Reset client so the next request tries a fresh connection
        try { client.disconnect(); } catch { /* ignore */ }
        globalRedisState.__puzzlewarzRedisClient = undefined;
        globalRedisState.__puzzlewarzRedisErrorLoggerAttached = false;
        throw err;
      })
      .finally(() => {
        globalRedisState.__puzzlewarzRedisConnectPromise = null;
      });
  }

  return globalRedisState.__puzzlewarzRedisConnectPromise;
}