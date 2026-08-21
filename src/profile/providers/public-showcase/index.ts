import type {
  ProfileFetchError,
  ProfileFetchResult,
  ProfileField,
  ProfileFreshness,
  ProfileSourceMetadata,
  PublicProfileCharacter,
  PublicProfileLightCone,
  PublicProfileLoader,
  PublicProfilePlayer,
  PublicProfileRelic,
  PublicProfileRelicStat,
  PublicProfileSnapshot,
  PublicProfileStat,
  PublicProfileTrace,
} from "../../contracts";

const PROVIDER_NAME = "mihomo-public-showcase";
const DEFAULT_BASE_URL = "https://api.mihomo.me/sr_info_parsed";
const DEFAULT_ASSET_BASE_URL = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master";
const DEFAULT_LANGUAGE = "en";
const DEFAULT_TIMEOUT_MS = 8_000;
const HSR_UID_PATTERN = /^\d{9}$/;

type JsonRecord = Record<string, unknown>;
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface NormalizedPayload {
  player: PublicProfilePlayer;
  characters: PublicProfileCharacter[];
  isPartial: boolean;
}

interface FreshnessMetadata {
  fetchedAt: string;
  freshness: ProfileFreshness;
  expiresAt?: string;
  ttlSeconds?: number;
}

export interface PublicShowcaseProviderOptions {
  baseUrl?: string;
  assetBaseUrl?: string;
  language?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  now?: () => Date;
}

export function createPublicShowcaseProfileLoader(
  options: PublicShowcaseProviderOptions = {},
): PublicProfileLoader {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? DEFAULT_BASE_URL);
  const assetBaseUrl = trimTrailingSlash(options.assetBaseUrl ?? DEFAULT_ASSET_BASE_URL);
  const language = options.language?.trim() || DEFAULT_LANGUAGE;
  const timeoutMs = normalizeTimeout(options.timeoutMs);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const now = options.now ?? (() => new Date());

  return {
    fetchProfile(uid, signal) {
      return fetchProfile({
        uid,
        signal,
        baseUrl,
        assetBaseUrl,
        language,
        timeoutMs,
        fetchImpl,
        now,
      });
    },
  };
}

interface FetchProfileContext {
  uid: string;
  signal?: AbortSignal;
  baseUrl: string;
  assetBaseUrl: string;
  language: string;
  timeoutMs: number;
  fetchImpl: FetchLike;
  now: () => Date;
}

async function fetchProfile(context: FetchProfileContext): Promise<ProfileFetchResult> {
  const uid = context.uid.trim();
  if (!HSR_UID_PATTERN.test(uid)) {
    return failure("invalid-uid", "UID must contain exactly 9 decimal digits.");
  }

  const timeoutController = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    timeoutController.abort(new DOMException("Provider request timed out", "TimeoutError"));
  }, context.timeoutMs);

  const requestController = new AbortController();
  const abortFromCaller = () => requestController.abort(context.signal?.reason);
  const abortFromTimeout = () => requestController.abort(timeoutController.signal.reason);

  if (context.signal?.aborted) {
    abortFromCaller();
  } else {
    context.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }
  timeoutController.signal.addEventListener("abort", abortFromTimeout, { once: true });

  try {
    const url = new URL(`${context.baseUrl}/${encodeURIComponent(uid)}`);
    url.searchParams.set("lang", context.language);

    const response = await context.fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: requestController.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });

    if (!response.ok) {
      return mapHttpError(response);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return failure("malformed-response", "Provider returned a non-JSON response.");
    }

    const normalized = normalizePayload(payload, uid, context.assetBaseUrl);
    if (!normalized.ok) {
      return normalized;
    }

    const freshness = getFreshnessMetadata(response.headers, context.now());
    const source: ProfileSourceMetadata = {
      provider: PROVIDER_NAME,
      uid,
      ...freshness,
      isPartial: normalized.value.isPartial,
    };

    const snapshot: PublicProfileSnapshot = {
      source,
      player: normalized.value.player,
      characters: normalized.value.characters,
    };

    return { ok: true, snapshot };
  } catch (error) {
    if (timedOut) {
      return failure("timeout", `Provider request exceeded ${context.timeoutMs} ms.`);
    }
    if (context.signal?.aborted) {
      return failure("provider-unavailable", "Provider request was aborted by the caller.");
    }
    if (isAbortError(error)) {
      return failure("provider-unavailable", "Provider request was aborted.");
    }
    return failure("provider-unavailable", "Provider request failed before a valid response was received.");
  } finally {
    clearTimeout(timeoutId);
    context.signal?.removeEventListener("abort", abortFromCaller);
    timeoutController.signal.removeEventListener("abort", abortFromTimeout);
  }
}

function normalizePayload(
  payload: unknown,
  requestedUid: string,
  assetBaseUrl: string,
): { ok: true; value: NormalizedPayload } | { ok: false; error: ProfileFetchError } {
  const root = asRecord(payload);
  if (!root) {
    return failure("malformed-response", "Provider payload must be a JSON object.");
  }

  const rawPlayer = asRecord(root.player);
  const rawCharacters = Array.isArray(root.characters) ? root.characters : undefined;
  if (!rawPlayer || !rawCharacters) {
    return failure("malformed-response", "Provider payload is missing player or character showcase data.");
  }

  const providerUid = readStringOrNumber(rawPlayer, "uid");
  if (providerUid !== undefined && providerUid !== requestedUid) {
    return failure("malformed-response", "Provider payload UID does not match the requested UID.");
  }

  if (rawPlayer.is_display === false || rawCharacters.length === 0) {
    return failure("private-or-empty-showcase", "The profile showcase is private or contains no displayed characters.");
  }

  const characters: PublicProfileCharacter[] = [];
  let isPartial = false;
  for (const item of rawCharacters) {
    const normalizedCharacter = normalizeCharacter(item, assetBaseUrl);
    if (!normalizedCharacter.ok) {
      return normalizedCharacter;
    }
    characters.push(normalizedCharacter.value.character);
    isPartial ||= normalizedCharacter.value.isPartial;
  }

  const player: PublicProfilePlayer = {};
  assignIfDefined(player, "nickname", readString(rawPlayer, "nickname") ?? readString(rawPlayer, "name"));
  assignIfDefined(player, "trailblazeLevel", readFiniteNumber(rawPlayer, "level"));
  assignIfDefined(player, "equilibriumLevel", readFiniteNumber(rawPlayer, "world_level"));
  assignIfDefined(player, "signature", readString(rawPlayer, "signature"));

  const avatar = asRecord(rawPlayer.avatar);
  if (avatar) {
    assignIfDefined(player, "avatarIconUrl", normalizeAssetUrl(readString(avatar, "icon"), assetBaseUrl));
  } else if (Object.hasOwn(rawPlayer, "avatar")) {
    isPartial = true;
  }

  return { ok: true, value: { player, characters, isPartial } };
}

function normalizeCharacter(
  value: unknown,
  assetBaseUrl: string,
):
  | { ok: true; value: { character: PublicProfileCharacter; isPartial: boolean } }
  | { ok: false; error: ProfileFetchError } {
  const raw = asRecord(value);
  if (!raw) {
    return failure("malformed-response", "Character showcase entry must be an object.");
  }

  const id = readStringOrNumber(raw, "id");
  const name = readString(raw, "name");
  const level = readFiniteNumber(raw, "level");
  if (!id || !name || level === undefined) {
    return failure("malformed-response", "Character showcase entry is missing required identity fields.");
  }

  const stats = normalizeStats(raw.properties);
  const lightCone = normalizeLightCone(raw, assetBaseUrl);
  const relics = normalizeRelics(raw, assetBaseUrl);
  const traces = normalizeTraces(raw);
  const element = readNestedName(raw.element);
  const path = readNestedName(raw.path);

  const character: PublicProfileCharacter = {
    id,
    name,
    level,
    stats: stats.field,
    lightCone: lightCone.field,
    relics: relics.field,
    traces: traces.field,
  };

  assignIfDefined(character, "eidolon", readFiniteNumber(raw, "rank") ?? readFiniteNumber(raw, "eidolon"));
  assignIfDefined(character, "ascension", readFiniteNumber(raw, "promotion") ?? readFiniteNumber(raw, "ascension"));
  assignIfDefined(character, "element", element);
  assignIfDefined(character, "path", path);
  assignIfDefined(character, "iconUrl", normalizeAssetUrl(readString(raw, "icon"), assetBaseUrl));
  assignIfDefined(character, "portraitUrl", normalizeAssetUrl(readString(raw, "portrait"), assetBaseUrl));

  const isPartial = stats.partial || lightCone.partial || relics.partial || traces.partial;
  return { ok: true, value: { character, isPartial } };
}

function normalizeStats(value: unknown): { field: ProfileField<readonly PublicProfileStat[]>; partial: boolean } {
  if (value === undefined) {
    return { field: unavailable("Provider did not supply normalized character stats."), partial: true };
  }
  if (!Array.isArray(value)) {
    return { field: unavailable("Provider returned malformed character stats."), partial: true };
  }

  const stats: PublicProfileStat[] = [];
  let dropped = 0;
  for (const item of value) {
    const raw = asRecord(item);
    if (!raw) {
      dropped += 1;
      continue;
    }
    const key = readString(raw, "field") ?? readString(raw, "type");
    const label = readString(raw, "name");
    const numericValue = readFiniteNumber(raw, "value");
    if (!key || !label || numericValue === undefined) {
      dropped += 1;
      continue;
    }
    stats.push({
      key,
      label,
      value: numericValue,
      ...(raw.percent === true ? { unit: "%" } : {}),
    });
  }

  if (dropped > 0) {
    return {
      field: { state: "partial", value: stats, note: `${dropped} malformed stat entr${dropped === 1 ? "y was" : "ies were"} omitted.` },
      partial: true,
    };
  }
  return { field: { state: "available", value: stats }, partial: false };
}

function normalizeLightCone(
  character: JsonRecord,
  assetBaseUrl: string,
): { field: ProfileField<PublicProfileLightCone | null>; partial: boolean } {
  if (!Object.hasOwn(character, "light_cone")) {
    return { field: unavailable("Provider did not supply light cone data."), partial: true };
  }
  if (character.light_cone === null) {
    return { field: { state: "available", value: null }, partial: false };
  }

  const raw = asRecord(character.light_cone);
  if (!raw) {
    return { field: unavailable("Provider returned malformed light cone data."), partial: true };
  }

  const id = readStringOrNumber(raw, "id");
  const name = readString(raw, "name");
  const level = readFiniteNumber(raw, "level");
  if (!id || !name || level === undefined) {
    return { field: unavailable("Provider light cone data is missing required fields."), partial: true };
  }

  const lightCone: PublicProfileLightCone = { id, name, level };
  assignIfDefined(lightCone, "superimposition", readFiniteNumber(raw, "rank") ?? readFiniteNumber(raw, "superimpose"));
  assignIfDefined(lightCone, "rarity", readFiniteNumber(raw, "rarity"));
  assignIfDefined(lightCone, "iconUrl", normalizeAssetUrl(readString(raw, "icon"), assetBaseUrl));
  return { field: { state: "available", value: lightCone }, partial: false };
}

function normalizeRelics(
  character: JsonRecord,
  assetBaseUrl: string,
): { field: ProfileField<readonly PublicProfileRelic[]>; partial: boolean } {
  if (!Object.hasOwn(character, "relics")) {
    return { field: unavailable("Provider did not supply relic data."), partial: true };
  }
  if (!Array.isArray(character.relics)) {
    return { field: unavailable("Provider returned malformed relic data."), partial: true };
  }

  const relics: PublicProfileRelic[] = [];
  let partial = false;
  for (const item of character.relics) {
    const raw = asRecord(item);
    if (!raw) {
      partial = true;
      continue;
    }

    const mainStat = normalizeRelicStat(raw.main_affix);
    const substats = normalizeRelicSubstats(raw.sub_affix ?? raw.sub_affixes);
    const slot = readString(raw, "slot") ?? readString(raw, "position") ?? "unknown";
    partial ||= mainStat.partial || substats.partial || slot === "unknown";

    const relic: PublicProfileRelic = {
      slot,
      mainStat: mainStat.field,
      substats: substats.field,
    };
    assignIfDefined(relic, "id", readStringOrNumber(raw, "id"));
    assignIfDefined(relic, "name", readString(raw, "name"));
    assignIfDefined(relic, "level", readFiniteNumber(raw, "level"));
    assignIfDefined(relic, "rarity", readFiniteNumber(raw, "rarity"));
    assignIfDefined(relic, "iconUrl", normalizeAssetUrl(readString(raw, "icon"), assetBaseUrl));
    relics.push(relic);
  }

  if (partial) {
    return {
      field: {
        state: "partial",
        value: relics,
        note: "One or more relic fields were unavailable or malformed; unknown values were not inferred.",
      },
      partial: true,
    };
  }
  return { field: { state: "available", value: relics }, partial: false };
}

function normalizeRelicStat(value: unknown): { field: ProfileField<PublicProfileRelicStat>; partial: boolean } {
  const stat = toRelicStat(value);
  if (!stat) {
    return { field: unavailable("Relic main stat is unavailable or malformed."), partial: true };
  }
  return { field: { state: "available", value: stat }, partial: false };
}

function normalizeRelicSubstats(value: unknown): {
  field: ProfileField<readonly PublicProfileRelicStat[]>;
  partial: boolean;
} {
  if (value === undefined) {
    return { field: unavailable("Relic substats were not supplied."), partial: true };
  }
  if (!Array.isArray(value)) {
    return { field: unavailable("Relic substats are malformed."), partial: true };
  }

  const substats: PublicProfileRelicStat[] = [];
  let dropped = 0;
  for (const item of value) {
    const stat = toRelicStat(item);
    if (stat) {
      substats.push(stat);
    } else {
      dropped += 1;
    }
  }

  if (dropped > 0) {
    return {
      field: { state: "partial", value: substats, note: `${dropped} malformed relic substat entr${dropped === 1 ? "y was" : "ies were"} omitted.` },
      partial: true,
    };
  }
  return { field: { state: "available", value: substats }, partial: false };
}

function toRelicStat(value: unknown): PublicProfileRelicStat | undefined {
  const raw = asRecord(value);
  if (!raw) {
    return undefined;
  }
  const key = readString(raw, "field") ?? readString(raw, "type");
  const label = readString(raw, "name");
  const numericValue = readFiniteNumber(raw, "value");
  if (!key || !label || numericValue === undefined) {
    return undefined;
  }
  return {
    key,
    label,
    value: numericValue,
    ...(raw.percent === true ? { unit: "%" } : {}),
  };
}

function normalizeTraces(character: JsonRecord): {
  field: ProfileField<readonly PublicProfileTrace[]>;
  partial: boolean;
} {
  const source = Object.hasOwn(character, "skills") ? character.skills : character.traces;
  if (source === undefined) {
    return { field: unavailable("Provider did not supply trace data."), partial: true };
  }
  if (!Array.isArray(source)) {
    return { field: unavailable("Provider returned malformed trace data."), partial: true };
  }

  const traces: PublicProfileTrace[] = [];
  let dropped = 0;
  for (const item of source) {
    const raw = asRecord(item);
    if (!raw) {
      dropped += 1;
      continue;
    }
    const key = readStringOrNumber(raw, "id") ?? readString(raw, "type");
    const name = readString(raw, "name") ?? readString(raw, "type_text");
    const level = readFiniteNumber(raw, "level");
    if (!key || !name || level === undefined) {
      dropped += 1;
      continue;
    }

    const trace: PublicProfileTrace = { key, name, level };
    assignIfDefined(trace, "maxLevel", readFiniteNumber(raw, "max_level"));
    assignIfDefined(trace, "kind", normalizeTraceKind(readString(raw, "type") ?? readString(raw, "type_text")));
    traces.push(trace);
  }

  if (dropped > 0) {
    return {
      field: { state: "partial", value: traces, note: `${dropped} malformed trace entr${dropped === 1 ? "y was" : "ies were"} omitted.` },
      partial: true,
    };
  }
  return { field: { state: "available", value: traces }, partial: false };
}

function normalizeTraceKind(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "-");
  if (normalized.includes("basic")) return "basic";
  if (normalized.includes("skill")) return "skill";
  if (normalized.includes("ultimate") || normalized === "ult") return "ultimate";
  if (normalized.includes("talent")) return "talent";
  if (normalized.includes("technique")) return "technique";
  if (normalized.includes("bonus")) return "bonus";
  return value;
}

function mapHttpError(response: Response): ProfileFetchResult {
  if (response.status === 400 || response.status === 422) {
    return failure("invalid-uid", "Provider rejected the UID or request parameters.");
  }
  if (response.status === 404) {
    return failure("not-found", "No public profile was found for this UID.");
  }
  if (response.status === 408 || response.status === 504) {
    return failure("timeout", "Provider timed out while loading the profile.");
  }
  if (response.status === 429) {
    return {
      ok: false,
      error: {
        code: "rate-limited",
        message: "Provider rate limit was reached.",
        provider: PROVIDER_NAME,
        ...retryAfter(response.headers),
      },
    };
  }
  return failure(
    "provider-unavailable",
    response.status >= 500
      ? `Provider is unavailable (HTTP ${response.status}).`
      : `Provider request failed (HTTP ${response.status}).`,
  );
}

function getFreshnessMetadata(headers: Headers, now: Date): FreshnessMetadata {
  const providerDate = parseHttpDate(headers.get("date"));
  const fetchedAt = (providerDate ?? now).toISOString();
  const cacheControl = headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/(?:^|,)\s*(?:s-maxage|max-age)=(\d+)/i);
  const ttlSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : undefined;
  const ageSeconds = parseNonNegativeInteger(headers.get("age"));
  const explicitExpires = parseHttpDate(headers.get("expires"));

  let expiresAt: string | undefined;
  if (explicitExpires) {
    expiresAt = explicitExpires.toISOString();
  } else if (ttlSeconds !== undefined) {
    expiresAt = new Date((providerDate ?? now).getTime() + ttlSeconds * 1_000).toISOString();
  }

  let freshness: ProfileFreshness = "unknown";
  if (ttlSeconds !== undefined && ageSeconds !== undefined) {
    freshness = ageSeconds < ttlSeconds ? "fresh" : "stale";
  } else if (explicitExpires) {
    freshness = explicitExpires.getTime() > now.getTime() ? "fresh" : "expired";
  } else if (ttlSeconds !== undefined) {
    freshness = "fresh";
  }

  return {
    fetchedAt,
    freshness,
    ...(expiresAt ? { expiresAt } : {}),
    ...(ttlSeconds !== undefined ? { ttlSeconds } : {}),
  };
}

function retryAfter(headers: Headers): { retryAfterSeconds?: number } {
  const value = headers.get("retry-after");
  if (!value) return {};
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return { retryAfterSeconds: Math.ceil(seconds) };
  }
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    return { retryAfterSeconds: Math.max(0, Math.ceil((date - Date.now()) / 1_000)) };
  }
  return {};
}

function failure(code: ProfileFetchError["code"], message: string): { ok: false; error: ProfileFetchError } {
  return { ok: false, error: { code, message, provider: PROVIDER_NAME } };
}

function unavailable<T>(note: string): ProfileField<T> {
  return { state: "unavailable", note };
}

function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function readString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readStringOrNumber(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function readFiniteNumber(record: JsonRecord, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readNestedName(value: unknown): string | undefined {
  const record = asRecord(value);
  return record ? readString(record, "name") ?? readString(record, "id") : undefined;
}

function normalizeAssetUrl(value: string | undefined, assetBaseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    const normalizedPath = value.replace(/^\/+/, "");
    return `${assetBaseUrl}/${normalizedPath}`;
  }
}

function assignIfDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeTimeout(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.max(250, Math.floor(value));
}

function parseHttpDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp);
}

function parseNonNegativeInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
