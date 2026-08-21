import { describe, expect, it, vi } from "vitest";
import type { PublicProfileLoader, PublicProfileSnapshot } from "../contracts";
import { ProfileSessionCache } from "../cache";
import { createPublicProfileClient } from "./publicProfileClient";

function snapshot(uid: string, freshness: "fresh" | "stale" = "fresh"): PublicProfileSnapshot {
  const now = Date.now();
  return {
    source: {
      provider: "fixture-provider",
      uid,
      fetchedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 60_000).toISOString(),
      ttlSeconds: 60,
      freshness,
      isPartial: false,
    },
    player: { nickname: "Fixture Player" },
    characters: [],
  };
}

function loaderReturning(value: PublicProfileSnapshot) {
  const fetchProfile = vi.fn<PublicProfileLoader["fetchProfile"]>().mockResolvedValue({
    ok: true,
    snapshot: value,
  });
  return { loader: { fetchProfile } satisfies PublicProfileLoader, fetchProfile };
}

describe("createPublicProfileClient", () => {
  it("serves a repeated fresh UID load from the session cache", async () => {
    const value = snapshot("800123456");
    const { loader: providerLoader, fetchProfile } = loaderReturning(value);
    const client = createPublicProfileClient({
      providerLoader,
      providerName: "fixture-provider",
    });

    const first = await client.loader.fetchProfile("800123456");
    const second = await client.loader.fetchProfile("800123456");

    expect(first).toEqual({ ok: true, snapshot: value });
    expect(second).toEqual({ ok: true, snapshot: value });
    expect(fetchProfile).toHaveBeenCalledTimes(1);
  });

  it("forces the provider after explicit invalidation", async () => {
    const value = snapshot("800123456");
    const { loader: providerLoader, fetchProfile } = loaderReturning(value);
    const client = createPublicProfileClient({
      providerLoader,
      providerName: "fixture-provider",
    });

    await client.loader.fetchProfile("800123456");
    expect(client.invalidate("800123456")).toBe(true);
    await client.loader.fetchProfile("800123456");

    expect(fetchProfile).toHaveBeenCalledTimes(2);
  });

  it("does not serve a stale-visible cache entry as current data", async () => {
    const cache = new ProfileSessionCache();
    cache.write(snapshot("800123456", "stale"));

    const replacement = snapshot("800123456", "fresh");
    const { loader: providerLoader, fetchProfile } = loaderReturning(replacement);
    const client = createPublicProfileClient({
      providerLoader,
      providerName: "fixture-provider",
      cache,
    });

    const result = await client.loader.fetchProfile("800123456");

    expect(fetchProfile).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, snapshot: replacement });
  });
});
