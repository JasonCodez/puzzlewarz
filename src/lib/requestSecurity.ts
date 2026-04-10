import { NextRequest, NextResponse } from "next/server";
import { getRedisClient, isRedisConfigured } from "@/lib/redis";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type GlobalRateLimitState = typeof globalThis & {
  __puzzlewarzRateLimitStore?: Map<string, RateLimitEntry>;
};

const globalRateLimitState = globalThis as GlobalRateLimitState;
const rateLimitStore = globalRateLimitState.__puzzlewarzRateLimitStore ?? new Map<string, RateLimitEntry>();

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl <= 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

if (!globalRateLimitState.__puzzlewarzRateLimitStore) {
  globalRateLimitState.__puzzlewarzRateLimitStore = rateLimitStore;
}

function getRequestOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function getHeaderOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Matches http(s)://, www., and markdown-style [text](url) links
const LINK_PATTERN = /https?:\/\/|www\.|\[.+?\]\(/i;

export function containsLinks(text: string): boolean {
  return LINK_PATTERN.test(text);
}

export function validateSameOrigin(request: NextRequest) {
  const expectedOrigin = getRequestOrigin(request);
  const origin = getHeaderOrigin(request.headers.get("origin"));
  const refererOrigin = getHeaderOrigin(request.headers.get("referer"));
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin) {
    if (origin === expectedOrigin) {
      return null;
    }

    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  if (refererOrigin) {
    if (refererOrigin === expectedOrigin) {
      return null;
    }

    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  if (fetchSite === "cross-site" || fetchSite === "same-site") {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  return null;
}

export function getClientAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstAddress] = forwardedFor.split(",");
    if (firstAddress?.trim()) {
      return firstAddress.trim();
    }
  }

  const realIp = request.headers.get("x-real-ip") ?? request.headers.get("cf-connecting-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

function buildRateLimitResponse(options: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}, count: number, resetAt: number) {
  const now = Date.now();
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  return NextResponse.json(
    { error: options.message ?? "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfterSeconds.toString(),
        "X-RateLimit-Limit": options.limit.toString(),
        "X-RateLimit-Remaining": Math.max(0, options.limit - count).toString(),
        "X-RateLimit-Reset": resetAt.toString(),
      },
    }
  );
}

/**
 * Synchronous in-memory rate limit check for use where a NextResponse cannot
 * be returned (e.g. inside NextAuth's authorize() callback).
 * Returns true if the caller should be blocked.
 */
export function checkLocalRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): boolean {
  const now = Date.now();
  const storageKey = `rate-limit:${options.key}`;

  if (rateLimitStore.size > 10000) {
    for (const [entryKey, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) rateLimitStore.delete(entryKey);
    }
  }

  const existing = rateLimitStore.get(storageKey);
  const entry =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : existing;

  entry.count += 1;
  rateLimitStore.set(storageKey, entry);

  return entry.count > options.limit;
}

function enforceLocalRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}) {
  const now = Date.now();

  if (rateLimitStore.size > 10000) {
    for (const [entryKey, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(entryKey);
      }
    }
  }

  const existing = rateLimitStore.get(options.key);
  const entry = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : existing;

  entry.count += 1;
  rateLimitStore.set(options.key, entry);

  if (entry.count <= options.limit) {
    return null;
  }

  return buildRateLimitResponse(options, entry.count, entry.resetAt);
}

export async function enforceRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}) {
  const storageKey = `rate-limit:${options.key}`;

  try {
    const redisClient = await getRedisClient();

    if (!redisClient) {
      // No Redis configured — fall back to in-memory rate limiter in all environments
      return enforceLocalRateLimit(options);
    }

    const now = Date.now();
    const rawResult = await redisClient.eval(RATE_LIMIT_SCRIPT, {
      keys: [storageKey],
      arguments: [options.windowMs.toString()],
    });

    if (!Array.isArray(rawResult) || rawResult.length < 2) {
      throw new Error("Unexpected rate limit result from Redis");
    }

    const count = Number(rawResult[0]);
    const ttlMs = Math.max(1, Number(rawResult[1]));
    const resetAt = now + ttlMs;

    if (count <= options.limit) {
      return null;
    }

    return buildRateLimitResponse(options, count, resetAt);
  } catch (error) {
    console.error("Rate limit enforcement failed:", error);
    // Redis failed — fall back to in-memory rate limiter in all environments
    return enforceLocalRateLimit(options);
  }
}