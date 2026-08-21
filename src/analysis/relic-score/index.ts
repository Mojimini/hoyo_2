import type {
  RelicScoreMethod,
  RelicScoreResult,
  RelicWeightProfile,
} from "../contracts";

const MAX_RELIC_LEVEL = 15;
const MAX_SUBSTAT_COUNT = 4;
const SCORE_EPSILON = 1e-12;

export interface NormalizedRelicSubstatScoreInput {
  key: string;
  /** Count of base affix values represented by this normalized substat. */
  baseRolls: number;
  /** Count of 0.1 boost values represented by this normalized substat. */
  boostRolls: number;
}

export interface NormalizedRelicScoreInput {
  slot: string;
  level: number;
  mainStatKey: string;
  substats: readonly NormalizedRelicSubstatScoreInput[];
}

export type RelicScoreInputErrorCode =
  | "invalid-method"
  | "invalid-level"
  | "invalid-input"
  | "duplicate-substat"
  | "missing-main-weight"
  | "missing-substat-weight"
  | "missing-max-substat-score"
  | "invalid-weight"
  | "invalid-roll-count"
  | "score-out-of-range";

export class RelicScoreInputError extends Error {
  readonly code: RelicScoreInputErrorCode;

  constructor(code: RelicScoreInputErrorCode, message: string) {
    super(message);
    this.name = "RelicScoreInputError";
    this.code = code;
  }
}

function fail(code: RelicScoreInputErrorCode, message: string): never {
  throw new RelicScoreInputError(code, message);
}

function requireNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    fail("invalid-input", `${label} must be a non-empty string.`);
  }
}

function requireFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    fail("invalid-weight", `${label} must be finite and non-negative.`);
  }
}

function requireRollCount(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    fail("invalid-roll-count", `${label} must be a finite non-negative integer.`);
  }
}

function normalizeUnitScore(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    fail("score-out-of-range", `${label} is non-finite.`);
  }

  if (value < -SCORE_EPSILON || value > 1 + SCORE_EPSILON) {
    fail("score-out-of-range", `${label} must be within the normalized 0..1 range.`);
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function readMainStatWeight(
  profile: RelicWeightProfile,
  slot: string,
  mainStatKey: string,
): number {
  const slotWeights = profile.mainStatWeights[slot];
  if (!slotWeights || !Object.prototype.hasOwnProperty.call(slotWeights, mainStatKey)) {
    fail(
      "missing-main-weight",
      `No canonical main-stat weight exists for slot ${slot} and stat ${mainStatKey}.`,
    );
  }

  const weight = slotWeights[mainStatKey];
  requireFiniteNonNegative(weight, `Main-stat weight for ${slot}/${mainStatKey}`);
  return weight;
}

function readSubstatWeight(profile: RelicWeightProfile, key: string): number {
  if (!Object.prototype.hasOwnProperty.call(profile.substatWeights, key)) {
    fail("missing-substat-weight", `No canonical substat weight exists for ${key}.`);
  }

  const weight = profile.substatWeights[key];
  requireFiniteNonNegative(weight, `Substat weight for ${key}`);
  return weight;
}

function readMaxSubstatScore(profile: RelicWeightProfile): number {
  const max = profile.maxSubstatScore;
  if (max === undefined) {
    fail(
      "missing-max-substat-score",
      "The canonical weight profile must provide maxSubstatScore for SRS normalization.",
    );
  }

  if (!Number.isFinite(max) || max <= 0) {
    fail(
      "missing-max-substat-score",
      "maxSubstatScore must be finite and greater than zero.",
    );
  }

  return max;
}

function validateInput(input: NormalizedRelicScoreInput): void {
  requireNonEmpty(input.slot, "Relic slot");
  requireNonEmpty(input.mainStatKey, "Main-stat key");

  if (!Number.isFinite(input.level) || !Number.isInteger(input.level) || input.level < 0 || input.level > MAX_RELIC_LEVEL) {
    fail("invalid-level", `Relic level must be an integer from 0 to ${MAX_RELIC_LEVEL}.`);
  }

  if (!Array.isArray(input.substats) || input.substats.length > MAX_SUBSTAT_COUNT) {
    fail("invalid-input", `A relic may provide at most ${MAX_SUBSTAT_COUNT} normalized substats.`);
  }

  const seenKeys = new Set<string>();
  for (const substat of input.substats) {
    requireNonEmpty(substat.key, "Substat key");
    if (seenKeys.has(substat.key)) {
      fail("duplicate-substat", `Duplicate normalized substat key: ${substat.key}.`);
    }
    seenKeys.add(substat.key);

    requireRollCount(substat.baseRolls, `${substat.key} baseRolls`);
    requireRollCount(substat.boostRolls, `${substat.key} boostRolls`);
  }
}

function validateMethod(method: RelicScoreMethod): void {
  if (method !== "srs-n" && method !== "srs-m") {
    fail("invalid-method", `Unsupported relic score method: ${String(method)}.`);
  }
}

/**
 * Scores one normalized relic using only the canonical StarRailScore-derived
 * weights supplied by the caller. The engine never reconstructs missing rolls,
 * invents weights, or substitutes defaults for unavailable inputs.
 */
export function scoreRelic(
  input: NormalizedRelicScoreInput,
  profile: RelicWeightProfile,
  method: RelicScoreMethod,
): RelicScoreResult {
  validateMethod(method);
  validateInput(input);

  const mainWeight = readMainStatWeight(profile, input.slot, input.mainStatKey);
  const maxSubstatScore = readMaxSubstatScore(profile);

  // StarRailScore: relic levels 0..15 map to base values 1/16..16/16.
  const mainStatScore = normalizeUnitScore(
    ((input.level + 1) / 16) * mainWeight,
    "Normalized main-stat score",
  );

  let rawSubstatScore = 0;
  let effectiveSubstats = 0;

  for (const substat of input.substats) {
    const weight = readSubstatWeight(profile, substat.key);
    if (weight > 0) {
      effectiveSubstats += 1;
    }

    // StarRailScore: each boost count contributes one tenth of a base value.
    rawSubstatScore += (substat.baseRolls + substat.boostRolls * 0.1) * weight;
  }

  const substatScore = normalizeUnitScore(
    rawSubstatScore / maxSubstatScore,
    "Normalized substat score",
  );

  // SRS-N gives main stat and substats equal 50% shares.
  const srsN = normalizeUnitScore(
    mainStatScore * 0.5 + substatScore * 0.5,
    "SRS-N score",
  );

  // SRS-M is exactly the square root transform of SRS-N.
  const normalizedScore = method === "srs-m"
    ? normalizeUnitScore(Math.sqrt(srsN), "SRS-M score")
    : srsN;

  return {
    method,
    normalizedScore,
    mainStatScore,
    substatScore,
    effectiveSubstats,
    source: profile.source,
  };
}
