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
        reconnectStrategy(retries) {
          return Math.min(retries * 100, 3000);
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
    globalRedisState.__puzzlewarzRedisConnectPromise = client
      .connect()
      .then(() => client)
      .finally(() => {
        globalRedisState.__puzzlewarzRedisConnectPromise = null;
      });
  }

  return globalRedisState.__puzzlewarzRedisConnectPromise;
}