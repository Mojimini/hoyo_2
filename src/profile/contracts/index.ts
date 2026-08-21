export type ProfileFieldState = "available" | "partial" | "unavailable";
export type ProfileFreshness = "fresh" | "stale" | "expired" | "unknown";

export type ProfileField<T> =
  | {
      state: "available";
      value: T;
      note?: string;
    }
  | {
      state: "partial";
      value: T;
      note?: string;
    }
  | {
      state: "unavailable";
      note?: string;
    };

export interface ProfileSourceMetadata {
  provider: string;
  uid: string;
  fetchedAt: string;
  freshness: ProfileFreshness;
  expiresAt?: string;
  ttlSeconds?: number;
  isPartial: boolean;
}

export interface PublicProfilePlayer {
  nickname?: string;
  trailblazeLevel?: number;
  equilibriumLevel?: number;
  signature?: string;
  avatarIconUrl?: string;
}

export interface PublicProfileStat {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

export interface PublicProfileLightCone {
  id: string;
  name: string;
  level: number;
  superimposition?: number;
  rarity?: number;
  iconUrl?: string;
}

export interface PublicProfileRelicStat {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

export type PublicProfileRelicSlot =
  | "head"
  | "hands"
  | "body"
  | "feet"
  | "planar-sphere"
  | "link-rope"
  | string;

export interface PublicProfileRelic {
  id?: string;
  name?: string;
  slot: PublicProfileRelicSlot;
  level?: number;
  rarity?: number;
  iconUrl?: string;
  mainStat: ProfileField<PublicProfileRelicStat>;
  substats: ProfileField<readonly PublicProfileRelicStat[]>;
}

export type PublicProfileTraceKind = "basic" | "skill" | "ultimate" | "talent" | "technique" | "bonus" | string;

export interface PublicProfileTrace {
  key: string;
  name: string;
  kind?: PublicProfileTraceKind;
  level: number;
  maxLevel?: number;
}

export interface PublicProfileCharacter {
  id: string;
  name: string;
  level: number;
  eidolon?: number;
  ascension?: number;
  element?: string;
  path?: string;
  iconUrl?: string;
  portraitUrl?: string;
  stats: ProfileField<readonly PublicProfileStat[]>;
  lightCone: ProfileField<PublicProfileLightCone | null>;
  relics: ProfileField<readonly PublicProfileRelic[]>;
  traces: ProfileField<readonly PublicProfileTrace[]>;
}

export interface PublicProfileSnapshot {
  source: ProfileSourceMetadata;
  player: PublicProfilePlayer;
  characters: readonly PublicProfileCharacter[];
}

export type ProfileFetchErrorCode =
  | "invalid-uid"
  | "not-found"
  | "private-or-empty-showcase"
  | "rate-limited"
  | "timeout"
  | "malformed-response"
  | "provider-unavailable"
  | "unknown";

export interface ProfileFetchError {
  code: ProfileFetchErrorCode;
  message: string;
  provider?: string;
  retryAfterSeconds?: number;
}

export type ProfileFetchResult =
  | {
      ok: true;
      snapshot: PublicProfileSnapshot;
    }
  | {
      ok: false;
      error: ProfileFetchError;
    };

export interface PublicProfileLoader {
  fetchProfile(uid: string, signal?: AbortSignal): Promise<ProfileFetchResult>;
}
