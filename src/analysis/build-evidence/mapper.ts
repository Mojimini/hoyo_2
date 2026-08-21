import type {
  AnalysisEvidence,
  AnalysisSourceRef,
  AnalysisStatValue,
  CharacterBuildEvidence,
} from "../contracts";
import type {
  ProfileSourceMetadata,
  PublicProfileCharacter,
} from "../../profile/contracts";

type Converted<T> = {
  value: T;
  partialNote?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined | null {
  const value = record[key];
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : null;
}

function optionalFiniteNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined | null {
  const value = record[key];
  if (value === undefined) return undefined;
  return isFiniteNumber(value) ? value : null;
}

function noteFrom(record: Record<string, unknown>): string | undefined {
  return typeof record.note === "string" && record.note.trim().length > 0
    ? record.note.trim()
    : undefined;
}

function combineNotes(...notes: Array<string | undefined>): string | undefined {
  const present = notes.filter((note): note is string => Boolean(note));
  return present.length > 0 ? present.join(" ") : undefined;
}

function unavailable<T>(note: string, source: AnalysisSourceRef): AnalysisEvidence<T> {
  return { state: "unavailable", note, sources: [source] };
}

function mapProfileField<T>(
  field: unknown,
  source: AnalysisSourceRef,
  label: string,
  convert: (value: unknown) => Converted<T> | null,
): AnalysisEvidence<T> {
  if (!isRecord(field)) {
    return unavailable(`Malformed public-profile ${label} evidence; mapping failed closed.`, source);
  }

  const state = field.state;
  const sourceNote = noteFrom(field);

  if (state === "unavailable") {
    return unavailable(
      sourceNote ?? `Public profile reports ${label} as unavailable.`,
      source,
    );
  }

  if (state !== "available" && state !== "partial") {
    return unavailable(`Malformed public-profile ${label} state; mapping failed closed.`, source);
  }

  if (!("value" in field)) {
    return unavailable(`Malformed public-profile ${label} evidence; mapping failed closed.`, source);
  }

  const converted = convert(field.value);
  if (!converted) {
    return unavailable(`Malformed public-profile ${label} value; mapping failed closed.`, source);
  }

  const partialNote = combineNotes(sourceNote, converted.partialNote);
  if (state === "partial" || converted.partialNote) {
    return {
      state: "partial",
      value: converted.value,
      sources: [source],
      note: partialNote ?? `Public profile marks ${label} as partial.`,
    };
  }

  return {
    state: "available",
    value: converted.value,
    sources: [source],
    ...(sourceNote ? { note: sourceNote } : {}),
  };
}

function normalizeStat(value: unknown): AnalysisStatValue | null {
  if (!isRecord(value) || !isNonEmptyString(value.key) || !isNonEmptyString(value.label)) {
    return null;
  }
  if (!isFiniteNumber(value.value)) return null;

  const unit = optionalString(value, "unit");
  if (unit === null) return null;

  return {
    key: value.key,
    label: value.label,
    value: value.value,
    ...(unit !== undefined ? { unit } : {}),
  };
}

function normalizeStats(value: unknown): Converted<readonly AnalysisStatValue[]> | null {
  if (!Array.isArray(value)) return null;
  const stats: AnalysisStatValue[] = [];
  for (const item of value) {
    const stat = normalizeStat(item);
    if (!stat) return null;
    stats.push(stat);
  }
  return { value: stats };
}

function normalizeLightCone(
  value: unknown,
): Converted<CharacterBuildEvidence["lightCone"] extends AnalysisEvidence<infer T> ? T : never> | null {
  if (value === null) return { value: null };
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.name)) {
    return null;
  }
  if (!isFiniteNumber(value.level)) return null;

  const superimposition = optionalFiniteNumber(value, "superimposition");
  if (superimposition === null) return null;

  return {
    value: {
      id: value.id,
      name: value.name,
      level: value.level,
      ...(superimposition !== undefined ? { superimposition } : {}),
    },
  };
}

function readNestedRelicStat(field: unknown): {
  key?: string;
  partial: boolean;
} | null {
  if (!isRecord(field)) return null;

  if (field.state === "unavailable") {
    return { partial: true };
  }

  if (field.state !== "available" && field.state !== "partial") return null;
  if (!("value" in field)) return null;

  const stat = normalizeStat(field.value);
  if (!stat) return null;
  return { key: stat.key, partial: field.state === "partial" };
}

function readNestedRelicSubstats(field: unknown): {
  keys: readonly string[];
  partial: boolean;
} | null {
  if (!isRecord(field)) return null;

  if (field.state === "unavailable") {
    return { keys: [], partial: true };
  }

  if (field.state !== "available" && field.state !== "partial") return null;
  if (!("value" in field) || !Array.isArray(field.value)) return null;

  const keys: string[] = [];
  for (const item of field.value) {
    const stat = normalizeStat(item);
    if (!stat) return null;
    keys.push(stat.key);
  }

  return { keys, partial: field.state === "partial" };
}

function normalizeRelics(
  value: unknown,
): Converted<CharacterBuildEvidence["relics"] extends AnalysisEvidence<infer T> ? T : never> | null {
  if (!Array.isArray(value)) return null;

  const relics: Array<{
    id?: string;
    slot: string;
    level?: number;
    mainStatKey?: string;
    substatKeys: readonly string[];
  }> = [];
  let hasNestedPartial = false;

  for (const item of value) {
    if (!isRecord(item) || !isNonEmptyString(item.slot)) return null;

    const id = optionalString(item, "id");
    const level = optionalFiniteNumber(item, "level");
    if (id === null || level === null) return null;

    const mainStat = readNestedRelicStat(item.mainStat);
    const substats = readNestedRelicSubstats(item.substats);
    if (!mainStat || !substats) return null;

    hasNestedPartial ||= mainStat.partial || substats.partial;

    relics.push({
      ...(id !== undefined ? { id } : {}),
      slot: item.slot,
      ...(level !== undefined ? { level } : {}),
      ...(mainStat.key !== undefined ? { mainStatKey: mainStat.key } : {}),
      substatKeys: substats.keys,
    });
  }

  return {
    value: relics,
    ...(hasNestedPartial
      ? {
          partialNote:
            "Some relic main-stat or substat evidence is partial or unavailable in the public profile.",
        }
      : {}),
  };
}

function normalizeTraces(
  value: unknown,
): Converted<CharacterBuildEvidence["traces"] extends AnalysisEvidence<infer T> ? T : never> | null {
  if (!Array.isArray(value)) return null;

  const traces: Array<{
    key: string;
    name: string;
    level: number;
    maxLevel?: number;
  }> = [];

  for (const item of value) {
    if (!isRecord(item) || !isNonEmptyString(item.key) || !isNonEmptyString(item.name)) {
      return null;
    }
    if (!isFiniteNumber(item.level)) return null;

    const maxLevel = optionalFiniteNumber(item, "maxLevel");
    if (maxLevel === null) return null;

    traces.push({
      key: item.key,
      name: item.name,
      level: item.level,
      ...(maxLevel !== undefined ? { maxLevel } : {}),
    });
  }

  return { value: traces };
}

export function publicProfileSourceRef(source: ProfileSourceMetadata): AnalysisSourceRef {
  if (
    !isNonEmptyString(source.provider) ||
    !isNonEmptyString(source.uid) ||
    !isNonEmptyString(source.fetchedAt) ||
    !["fresh", "stale", "expired", "unknown"].includes(source.freshness) ||
    typeof source.isPartial !== "boolean"
  ) {
    throw new TypeError("Malformed public-profile source metadata cannot provide provenance.");
  }

  return {
    kind: "public-profile",
    name: source.provider,
    revision: source.fetchedAt,
    fetchedAt: source.fetchedAt,
    reference: `uid:${source.uid};freshness:${source.freshness};partial:${String(source.isPartial)}`,
  };
}

export function mapPublicProfileCharacterToBuildEvidence(
  character: PublicProfileCharacter,
  source: ProfileSourceMetadata,
): CharacterBuildEvidence {
  if (!isRecord(character) || !isNonEmptyString(character.id)) {
    throw new TypeError("Malformed public-profile character identity cannot be mapped.");
  }

  const provenance = publicProfileSourceRef(source);

  return {
    characterId: character.id,
    observedStats: mapProfileField(character.stats, provenance, "observed stats", normalizeStats),
    lightCone: mapProfileField(character.lightCone, provenance, "light cone", normalizeLightCone),
    relics: mapProfileField(character.relics, provenance, "relics", normalizeRelics),
    traces: mapProfileField(character.traces, provenance, "traces", normalizeTraces),
    targetStats: {
      state: "unavailable",
      sources: [],
      note: "Target stats are unavailable until a verified target-stat source is provided.",
    },
  };
}
