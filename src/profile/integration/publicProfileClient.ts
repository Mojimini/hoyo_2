import type { PublicProfileLoader } from "../contracts";
import { ProfileSessionCache } from "../cache";
import { createPublicShowcaseProfileLoader } from "../providers/public-showcase";

export const PUBLIC_SHOWCASE_PROVIDER_NAME = "mihomo-public-showcase";

export interface PublicProfileClientOptions {
  providerLoader?: PublicProfileLoader;
  cache?: ProfileSessionCache;
  providerName?: string;
}

export interface PublicProfileClient {
  loader: PublicProfileLoader;
  invalidate(uid: string): boolean;
  clear(): void;
}

/**
 * Composes the concrete public-showcase provider with the in-memory cache.
 * Only explicitly fresh cache entries are served. Stale/expired entries force
 * a provider request so old data is never silently presented as current.
 */
export function createPublicProfileClient(
  options: PublicProfileClientOptions = {},
): PublicProfileClient {
  const providerLoader = options.providerLoader ?? createPublicShowcaseProfileLoader();
  const cache = options.cache ?? new ProfileSessionCache();
  const providerName = options.providerName ?? PUBLIC_SHOWCASE_PROVIDER_NAME;

  const loader: PublicProfileLoader = {
    async fetchProfile(uid, signal) {
      const cached = cache.read({ provider: providerName, uid });
      if (cached.state === "fresh") {
        return { ok: true, snapshot: cached.snapshot };
      }

      const result = await providerLoader.fetchProfile(uid, signal);
      if (result.ok) {
        cache.write(result.snapshot);
      }
      return result;
    },
  };

  return {
    loader,
    invalidate(uid) {
      return cache.invalidate({ provider: providerName, uid });
    },
    clear() {
      cache.clear();
    },
  };
}
