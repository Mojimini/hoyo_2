import type { ProfileSourceMetadata } from "../contracts";

export const MIN_FALLBACK_TTL_MS = 1_000;
export const DEFAULT_FALLBACK_TTL_MS = 5 * 60_000;
export const MAX_FALLBACK_TTL_MS = 15 * 60_000;

export type ProfileCacheFreshness = "fresh" | "stale-visible" | "expired";

export type ProfileCacheTtlSource =
  | "provider-expires-at"
  | "provider-ttl"
  | "fallback"
  | "invalid-metadata";

export type ProfileCacheFreshnessReason =
  | "provider-fresh"
  | "provider-stale"
  | "provider-unknown"
  | "provider-expired"
  | "ttl-expired"
  | "invalid-metadata";

export interface ProfileCachePolicyOptions {
  fallbackTtlMs?: number;
}

export interface ProfileFreshnessDecision {
  state: ProfileCacheFreshness;
  expiresAtMs: number | null;
  ttlSource: ProfileCacheTtlSource;
  reason: ProfileCacheFreshnessReason;
}

interface ExpiryDecision {
  expiresAtMs: number | null;
  ttlSource: ProfileCacheTtlSource;
}

export function normalizeProfileProvider(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (!normalized) {
    throw new TypeError("Profile provider must not be empty");
  }
  return normalized;
}

export function normalizeProfileUid(uid: string): string {
  const normalized = uid.trim();
  if (!normalized) {
    throw new TypeError("Profile UID must not be empty");
  }
  return normalized;
}

export function createProfileCacheKey(provider: string, uid: string): string {
  return JSON.stringify([
    normalizeProfileProvider(provider),
    normalizeProfileUid(uid),
  ]);
}

export function resolveFallbackTtlMs(
  requestedTtlMs = DEFAULT_FALLBACK_TTL_MS,
): number {
  if (!Number.isFinite(requestedTtlMs)) {
    throw new RangeError("Fallback TTL must be a finite number");
  }

  return Math.min(
    MAX_FALLBACK_TTL_MS,
    Math.max(MIN_FALLBACK_TTL_MS, Math.trunc(requestedTtlMs)),
  );
}

function parseTimestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveExpiry(
  source: ProfileSourceMetadata,
  options: ProfileCachePolicyOptions,
): ExpiryDecision {
  const fetchedAtMs = parseTimestamp(source.fetchedAt);
  if (fetchedAtMs === null) {
    return { expiresAtMs: null, ttlSource: "invalid-metadata" };
  }

  if (source.expiresAt !== undefined) {
    const expiresAtMs = parseTimestamp(source.expiresAt);
    return expiresAtMs === null
      ? { expiresAtMs: null, ttlSource: "invalid-metadata" }
      : { expiresAtMs, ttlSource: "provider-expires-at" };
  }

  if (source.ttlSeconds !== undefined) {
    if (!Number.isFinite(source.ttlSeconds) || source.ttlSeconds < 0) {
      return { expiresAtMs: null, ttlSource: "invalid-metadata" };
    }

    const expiresAtMs = fetchedAtMs + source.ttlSeconds * 1_000;
    return Number.isFinite(expiresAtMs)
      ? { expiresAtMs, ttlSource: "provider-ttl" }
      : { expiresAtMs: null, ttlSource: "invalid-metadata" };
  }

  const expiresAtMs = fetchedAtMs + resolveFallbackTtlMs(options.fallbackTtlMs);
  return { expiresAtMs, ttlSource: "fallback" };
}

export function evaluateProfileFreshness(
  source: ProfileSourceMetadata,
  nowMs = Date.now(),
  options: ProfileCachePolicyOptions = {},
): ProfileFreshnessDecision {
  if (!Number.isFinite(nowMs)) {
    throw new RangeError("Current time must be a finite timestamp");
  }

  const expiry = resolveExpiry(source, options);
  if (expiry.ttlSource === "invalid-metadata" || expiry.expiresAtMs === null) {
    return {
      state: "expired",
      expiresAtMs: null,
      ttlSource: "invalid-metadata",
      reason: "invalid-metadata",
    };
  }

  if (source.freshness === "expired") {
    return {
      state: "expired",
      expiresAtMs: expiry.expiresAtMs,
      ttlSource: expiry.ttlSource,
      reason: "provider-expired",
    };
  }

  if (nowMs >= expiry.expiresAtMs) {
    return {
      state: "expired",
      expiresAtMs: expiry.expiresAtMs,
      ttlSource: expiry.ttlSource,
      reason: "ttl-expired",
    };
  }

  if (source.freshness === "fresh") {
    return {
      state: "fresh",
      expiresAtMs: expiry.expiresAtMs,
      ttlSource: expiry.ttlSource,
      reason: "provider-fresh",
    };
  }

  if (source.freshness === "stale") {
    return {
      state: "stale-visible",
      expiresAtMs: expiry.expiresAtMs,
      ttlSource: expiry.ttlSource,
      reason: "provider-stale",
    };
  }

  if (source.freshness === "unknown") {
    return {
      state: "stale-visible",
      expiresAtMs: expiry.expiresAtMs,
      ttlSource: expiry.ttlSource,
      reason: "provider-unknown",
    };
  }

  return {
    state: "expired",
    expiresAtMs: null,
    ttlSource: "invalid-metadata",
    reason: "invalid-metadata",
  };
}
