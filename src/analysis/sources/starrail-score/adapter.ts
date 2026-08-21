import type { AnalysisSourceRef, RelicWeightProfile } from "../../contracts";

export const STAR_RAIL_SCORE_DATASET_NAME = "Mar-7th/StarRailScore score.json";

export type StarRailScoreAdapterErrorCode =
  | "invalid-source-metadata"
  | "unsupported-dataset-shape"
  | "character-not-found"
  | "malformed-character-entry"
  | "invalid-weight";

export class StarRailScoreAdapterError extends Error {
  readonly code: StarRailScoreAdapterErrorCode;

  constructor(code: StarRailScoreAdapterErrorCode, message: string) {
    super(message);
    this.name = "StarRailScoreAdapterError";
    this.code = code;
  }
}

export interface StarRailScoreDatasetResponse {
  data: unknown;
  revision: string;
  fetchedAt: string;
  reference: string;
}

export interface StarRailScoreTransport {
  fetchScoreDataset(): Promise<StarRailScoreDatasetResponse>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new StarRailScoreAdapterError(
      "invalid-source-metadata",
      `StarRailScore source ${field} must be a non-empty string.`,
    );
  }
}

function createSourceRef(response: StarRailScoreDatasetResponse): AnalysisSourceRef {
  assertNonEmptyString(response.revision, "revision");
  assertNonEmptyString(response.fetchedAt, "fetchedAt");
  assertNonEmptyString(response.reference, "reference");

  if (Number.isNaN(Date.parse(response.fetchedAt))) {
    throw new StarRailScoreAdapterError(
      "invalid-source-metadata",
      "StarRailScore source fetchedAt must be a parseable timestamp.",
    );
  }

  return {
    kind: "community-methodology",
    name: STAR_RAIL_SCORE_DATASET_NAME,
    revision: response.revision,
    fetchedAt: response.fetchedAt,
    reference: response.reference,
  };
}

function parseFiniteWeight(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new StarRailScoreAdapterError(
      "invalid-weight",
      `StarRailScore weight at ${path} must be a finite number.`,
    );
  }

  return value;
}

function parseWeightRecord(
  value: unknown,
  path: string,
): Readonly<Record<string, number>> {
  if (!isRecord(value)) {
    throw new StarRailScoreAdapterError(
      "malformed-character-entry",
      `StarRailScore ${path} must be an object keyed by stat name.`,
    );
  }

  const parsed: Record<string, number> = {};
  for (const [statKey, rawWeight] of Object.entries(value)) {
    if (statKey.length === 0) {
      throw new StarRailScoreAdapterError(
        "malformed-character-entry",
        `StarRailScore ${path} contains an empty stat key.`,
      );
    }
    parsed[statKey] = parseFiniteWeight(rawWeight, `${path}.${statKey}`);
  }

  return parsed;
}

function parseMainStatWeights(
  value: unknown,
  path: string,
): Readonly<Record<string, Readonly<Record<string, number>>>> {
  if (!isRecord(value)) {
    throw new StarRailScoreAdapterError(
      "malformed-character-entry",
      `StarRailScore ${path} must be an object keyed by relic slot.`,
    );
  }

  const parsed: Record<string, Readonly<Record<string, number>>> = {};
  for (const [slotKey, rawWeights] of Object.entries(value)) {
    if (slotKey.length === 0) {
      throw new StarRailScoreAdapterError(
        "malformed-character-entry",
        `StarRailScore ${path} contains an empty relic-slot key.`,
      );
    }
    parsed[slotKey] = parseWeightRecord(rawWeights, `${path}.${slotKey}`);
  }

  return parsed;
}

export function parseStarRailScoreCharacter(
  dataset: unknown,
  characterId: string,
  source: AnalysisSourceRef,
): RelicWeightProfile {
  if (!isRecord(dataset)) {
    throw new StarRailScoreAdapterError(
      "unsupported-dataset-shape",
      "StarRailScore score.json root must be an object keyed by character ID.",
    );
  }

  const rawCharacter = dataset[characterId];
  if (rawCharacter === undefined) {
    throw new StarRailScoreAdapterError(
      "character-not-found",
      `Character ${characterId} is not present in the StarRailScore dataset.`,
    );
  }

  if (!isRecord(rawCharacter)) {
    throw new StarRailScoreAdapterError(
      "malformed-character-entry",
      `StarRailScore entry for character ${characterId} must be an object.`,
    );
  }

  const mainStatWeights = parseMainStatWeights(
    rawCharacter.main,
    `${characterId}.main`,
  );
  const substatWeights = parseWeightRecord(
    rawCharacter.weight,
    `${characterId}.weight`,
  );
  const maxSubstatScore = parseFiniteWeight(
    rawCharacter.max,
    `${characterId}.max`,
  );

  return {
    characterId,
    mainStatWeights,
    substatWeights,
    maxSubstatScore,
    source,
  };
}

export class StarRailScoreAdapter {
  constructor(private readonly transport: StarRailScoreTransport) {}

  async loadRelicWeightProfile(characterId: string): Promise<RelicWeightProfile> {
    if (characterId.trim().length === 0) {
      throw new StarRailScoreAdapterError(
        "character-not-found",
        "StarRailScore characterId must be non-empty.",
      );
    }

    const response = await this.transport.fetchScoreDataset();
    const source = createSourceRef(response);
    return parseStarRailScoreCharacter(response.data, characterId, source);
  }
}
