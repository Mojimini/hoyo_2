import type {
  ProfileFetchResult,
  PublicProfileSnapshot,
} from "../contracts";
import {
  createProfileCacheKey,
  evaluateProfileFreshness,
  normalizeProfileProvider,
  type ProfileCacheFreshnessReason,
  type ProfileCachePolicyOptions,
  type ProfileCacheTtlSource,
} from "./policy";

export interface ProfileCacheRequest {
  provider: string;
  uid: string;
}

interface ProfileCacheBaseResult {
  key: string;
}

export interface ProfileCacheUnavailableResult extends ProfileCacheBaseResult {
  state: "unavailable";
}

export interface ProfileCacheFreshResult extends ProfileCacheBaseResult {
  state: "fresh";
  snapshot: PublicProfileSnapshot;
  expiresAtMs: number;
  ttlSource: Exclude<ProfileCacheTtlSource, "invalid-metadata">;
  reason: Extract<ProfileCacheFreshnessReason, "provider-fresh">;
}

export interface ProfileCacheStaleResult extends ProfileCacheBaseResult {
  state: "stale-visible";
  snapshot: PublicProfileSnapshot;
  expiresAtMs: number;
  ttlSource: Exclude<ProfileCacheTtlSource, "invalid-metadata">;
  reason: Extract<
    ProfileCacheFreshnessReason,
    "provider-stale" | "provider-unknown"
  >;
}

export interface ProfileCacheExpiredResult extends ProfileCacheBaseResult {
  state: "expired";
  expiredSnapshot: PublicProfileSnapshot;
  expiresAtMs: number | null;
  ttlSource: ProfileCacheTtlSource;
  reason: Extract<
    ProfileCacheFreshnessReason,
    "provider-expired" | "ttl-expired" | "invalid-metadata"
  >;
}

export type ProfileCacheLookupResult =
  | ProfileCacheUnavailableResult
  | ProfileCacheFreshResult
  | ProfileCacheStaleResult
  | ProfileCacheExpiredResult;

export type ProfileRequestOperation = () => Promise<ProfileFetchResult>;

export class ProfileSessionCache {
  private readonly snapshots = new Map<string, PublicProfileSnapshot>();
  private readonly inFlight = new Map<string, Promise<ProfileFetchResult>>();

  constructor(private readonly policy: ProfileCachePolicyOptions = {}) {}

  get size(): number {
    return this.snapshots.size;
  }

  read(
    request: ProfileCacheRequest,
    nowMs = Date.now(),
  ): ProfileCacheLookupResult {
    const key = createProfileCacheKey(request.provider, request.uid);
    const snapshot = this.snapshots.get(key);

    if (!snapshot) {
      return { state: "unavailable", key };
    }

    const decision = evaluateProfileFreshness(snapshot.source, nowMs, this.policy);

    if (decision.state === "fresh") {
      return {
        state: "fresh",
        key,
        snapshot,
        expiresAtMs: decision.expiresAtMs,
        ttlSource: decision.ttlSource,
        reason: decision.reason,
      } as ProfileCacheFreshResult;
    }

    if (decision.state === "stale-visible") {
      return {
        state: "stale-visible",
        key,
        snapshot,
        expiresAtMs: decision.expiresAtMs,
        ttlSource: decision.ttlSource,
        reason: decision.reason,
      } as ProfileCacheStaleResult;
    }

    return {
      state: "expired",
      key,
      expiredSnapshot: snapshot,
      expiresAtMs: decision.expiresAtMs,
      ttlSource: decision.ttlSource,
      reason: decision.reason,
    } as ProfileCacheExpiredResult;
  }

  write(snapshot: PublicProfileSnapshot): string {
    const key = createProfileCacheKey(
      snapshot.source.provider,
      snapshot.source.uid,
    );
    this.snapshots.set(key, snapshot);
    return key;
  }

  invalidate(request: ProfileCacheRequest): boolean {
    return this.snapshots.delete(
      createProfileCacheKey(request.provider, request.uid),
    );
  }

  invalidateProvider(provider: string): number {
    const normalizedProvider = normalizeProfileProvider(provider);
    let invalidated = 0;

    for (const [key, snapshot] of this.snapshots) {
      if (normalizeProfileProvider(snapshot.source.provider) === normalizedProvider) {
        this.snapshots.delete(key);
        invalidated += 1;
      }
    }

    return invalidated;
  }

  clear(): void {
    this.snapshots.clear();
  }

  isInFlight(request: ProfileCacheRequest): boolean {
    return this.inFlight.has(
      createProfileCacheKey(request.provider, request.uid),
    );
  }

  runDeduplicated(
    request: ProfileCacheRequest,
    operation: ProfileRequestOperation,
  ): Promise<ProfileFetchResult> {
    const key = createProfileCacheKey(request.provider, request.uid);
    const existing = this.inFlight.get(key);

    if (existing) {
      return existing;
    }

    const pending = Promise.resolve().then(operation);
    this.inFlight.set(key, pending);

    const cleanup = () => {
      if (this.inFlight.get(key) === pending) {
        this.inFlight.delete(key);
      }
    };

    void pending.then(cleanup, cleanup);
    return pending;
  }
}
