import type {
  AnalysisEvidence,
  AnalysisSourceRef,
  CharacterAnalysisResult,
  CharacterBuildEvidence,
  RelicWeightProfile,
} from "../contracts";

const fixtureTimestamp = "2000-01-01T00:00:00.000Z";

export const publicProfileSourceRef = {
  kind: "public-profile",
  name: "Synthetic public-profile fixture",
  revision: "fixture-public-profile-v1",
  fetchedAt: fixtureTimestamp,
  reference: "synthetic://public-profile/profile-alpha",
} satisfies AnalysisSourceRef;

export const starRailResMetadataSourceRef = {
  kind: "game-metadata",
  name: "StarRailRes metadata (synthetic fixture)",
  revision: "fixture-starrailres-metadata-v1",
  fetchedAt: fixtureTimestamp,
  reference: "synthetic://starrailres/metadata",
} satisfies AnalysisSourceRef;

export const starRailScoreMethodologySourceRef = {
  kind: "community-methodology",
  name: "StarRailScore community methodology (synthetic fixture)",
  revision: "fixture-starrailscore-methodology-v1",
  fetchedAt: fixtureTimestamp,
  reference: "synthetic://starrailscore/methodology",
} satisfies AnalysisSourceRef;

export const analysisSourceFixtures = {
  publicProfile: publicProfileSourceRef,
  starRailResMetadata: starRailResMetadataSourceRef,
  starRailScoreMethodology: starRailScoreMethodologySourceRef,
} as const satisfies Record<string, AnalysisSourceRef>;

export const completeRelicWeightProfile = {
  characterId: "synthetic-character-alpha",
  mainStatWeights: {
    body: {
      "crit-rate": 1,
      "crit-dmg": 0.9,
    },
    feet: {
      spd: 1,
      atk: 0.6,
    },
  },
  substatWeights: {
    "crit-rate": 1,
    "crit-dmg": 0.8,
    spd: 0.6,
    atk: 0.4,
  },
  maxSubstatScore: 40,
  source: starRailScoreMethodologySourceRef,
} satisfies RelicWeightProfile;

export const partialRelicWeightProfile = {
  characterId: "synthetic-character-beta",
  mainStatWeights: {
    body: {
      atk: 1,
    },
  },
  substatWeights: {
    atk: 1,
  },
  source: starRailScoreMethodologySourceRef,
} satisfies RelicWeightProfile;

export const relicWeightProfileFixtures = {
  complete: {
    state: "available",
    value: completeRelicWeightProfile,
    sources: [starRailScoreMethodologySourceRef],
  },
  partial: {
    state: "partial",
    value: partialRelicWeightProfile,
    sources: [starRailScoreMethodologySourceRef],
    note: "Synthetic methodology intentionally omits optional maximum substat scoring metadata.",
  },
  unavailable: {
    state: "unavailable",
    sources: [starRailScoreMethodologySourceRef],
    note: "No synthetic methodology weights were supplied for this character.",
  },
} as const satisfies Record<"complete" | "partial" | "unavailable", AnalysisEvidence<RelicWeightProfile>>;

export const completeCharacterBuildEvidence = {
  characterId: "synthetic-character-alpha",
  observedStats: {
    state: "available",
    value: [
      { key: "atk", label: "ATK", value: 3000 },
      { key: "crit-rate", label: "CRIT Rate", value: 70, unit: "%" },
      { key: "crit-dmg", label: "CRIT DMG", value: 140, unit: "%" },
    ],
    sources: [publicProfileSourceRef],
  },
  lightCone: {
    state: "available",
    value: {
      id: "synthetic-light-cone-alpha",
      name: "Synthetic Light Cone Alpha",
      level: 80,
      superimposition: 1,
    },
    sources: [publicProfileSourceRef, starRailResMetadataSourceRef],
  },
  relics: {
    state: "available",
    value: [
      {
        id: "synthetic-relic-head-alpha",
        slot: "head",
        level: 15,
        mainStatKey: "hp-flat",
        substatKeys: ["crit-rate", "crit-dmg", "spd"],
      },
      {
        id: "synthetic-relic-body-alpha",
        slot: "body",
        level: 15,
        mainStatKey: "crit-rate",
        substatKeys: ["crit-dmg", "atk", "spd"],
      },
    ],
    sources: [publicProfileSourceRef, starRailResMetadataSourceRef],
  },
  traces: {
    state: "available",
    value: [
      { key: "skill", name: "Synthetic Skill", level: 10, maxLevel: 10 },
      { key: "ultimate", name: "Synthetic Ultimate", level: 10, maxLevel: 10 },
    ],
    sources: [publicProfileSourceRef, starRailResMetadataSourceRef],
  },
  targetStats: {
    state: "available",
    value: [
      { key: "crit-rate", label: "CRIT Rate", min: 70, unit: "%" },
      { key: "crit-dmg", label: "CRIT DMG", min: 140, unit: "%" },
    ],
    sources: [starRailScoreMethodologySourceRef],
  },
} as const satisfies CharacterBuildEvidence;

export const partialCharacterBuildEvidence = {
  characterId: "synthetic-character-beta",
  observedStats: {
    state: "partial",
    value: [{ key: "spd", label: "SPD", value: 120 }],
    sources: [publicProfileSourceRef],
    note: "Synthetic profile intentionally contains only one observed stat.",
  },
  lightCone: {
    state: "unavailable",
    sources: [publicProfileSourceRef],
    note: "Synthetic profile intentionally omits light-cone evidence.",
  },
  relics: {
    state: "partial",
    value: [
      {
        slot: "head",
        level: 12,
        mainStatKey: "hp-flat",
        substatKeys: ["atk"],
      },
    ],
    sources: [publicProfileSourceRef, starRailResMetadataSourceRef],
    note: "Synthetic fixture intentionally omits five relic slots.",
  },
  traces: {
    state: "partial",
    value: [{ key: "skill", name: "Synthetic Skill", level: 6 }],
    sources: [publicProfileSourceRef, starRailResMetadataSourceRef],
    note: "Synthetic fixture intentionally contains incomplete trace evidence.",
  },
  targetStats: {
    state: "unavailable",
    sources: [starRailScoreMethodologySourceRef],
    note: "Synthetic methodology intentionally supplies no target-stat ranges.",
  },
} as const satisfies CharacterBuildEvidence;

export const unavailableCharacterBuildEvidence = {
  characterId: "synthetic-character-unavailable",
  observedStats: {
    state: "unavailable",
    sources: [publicProfileSourceRef],
    note: "Synthetic profile has no observed-stat evidence.",
  },
  lightCone: {
    state: "unavailable",
    sources: [publicProfileSourceRef],
    note: "Synthetic profile has no light-cone evidence.",
  },
  relics: {
    state: "unavailable",
    sources: [publicProfileSourceRef, starRailResMetadataSourceRef],
    note: "Synthetic profile has no relic evidence.",
  },
  traces: {
    state: "unavailable",
    sources: [publicProfileSourceRef, starRailResMetadataSourceRef],
    note: "Synthetic profile has no trace evidence.",
  },
  targetStats: {
    state: "unavailable",
    sources: [starRailScoreMethodologySourceRef],
    note: "Synthetic methodology has no target-stat evidence for this character.",
  },
} as const satisfies CharacterBuildEvidence;

export const characterBuildEvidenceFixtures = {
  complete: completeCharacterBuildEvidence,
  partial: partialCharacterBuildEvidence,
  unavailable: unavailableCharacterBuildEvidence,
} as const satisfies Record<"complete" | "partial" | "unavailable", CharacterBuildEvidence>;

export const completeCharacterAnalysisResult = {
  characterId: completeCharacterBuildEvidence.characterId,
  evidence: completeCharacterBuildEvidence,
  relicScores: {
    state: "available",
    value: [
      {
        relicId: "synthetic-relic-head-alpha",
        slot: "head",
        score: {
          method: "srs-n",
          normalizedScore: 0.82,
          mainStatScore: 1,
          substatScore: 0.74,
          effectiveSubstats: 5.5,
          source: starRailScoreMethodologySourceRef,
          note: "Synthetic regression fixture value; not a production score.",
        },
      },
    ],
    sources: [publicProfileSourceRef, starRailScoreMethodologySourceRef],
  },
  buildQuality: {
    state: "available",
    value: {
      label: "Synthetic complete fixture",
      normalizedScore: 0.8,
    },
    sources: [publicProfileSourceRef, starRailScoreMethodologySourceRef],
  },
  recommendation: {
    state: "available",
    value: {
      summary: "Synthetic fixture recommendation for regression coverage only.",
      nextAction: "Keep the fixture unchanged unless the canonical contract changes.",
    },
    sources: [publicProfileSourceRef, starRailScoreMethodologySourceRef],
  },
} as const satisfies CharacterAnalysisResult;

export const partialCharacterAnalysisResult = {
  characterId: partialCharacterBuildEvidence.characterId,
  evidence: partialCharacterBuildEvidence,
  relicScores: {
    state: "partial",
    value: [
      {
        slot: "head",
        score: {
          method: "srs-m",
          normalizedScore: 0.5,
          mainStatScore: 1,
          substatScore: 0.25,
          effectiveSubstats: 2,
          source: starRailScoreMethodologySourceRef,
          note: "Synthetic partial score for the only represented relic slot.",
        },
      },
    ],
    sources: [publicProfileSourceRef, starRailScoreMethodologySourceRef],
    note: "Only one synthetic relic has enough evidence for a fixture score.",
  },
  buildQuality: {
    state: "unavailable",
    sources: [publicProfileSourceRef, starRailScoreMethodologySourceRef],
    note: "Build quality remains unavailable because required synthetic evidence is incomplete.",
  },
  recommendation: {
    state: "unavailable",
    sources: [publicProfileSourceRef, starRailScoreMethodologySourceRef],
    note: "Recommendation remains unavailable without target stats and build-quality evidence.",
  },
} as const satisfies CharacterAnalysisResult;

export const unavailableCharacterAnalysisResult = {
  characterId: unavailableCharacterBuildEvidence.characterId,
  evidence: unavailableCharacterBuildEvidence,
  relicScores: {
    state: "unavailable",
    sources: [publicProfileSourceRef, starRailScoreMethodologySourceRef],
    note: "Relic scoring is unavailable without relic evidence.",
  },
  buildQuality: {
    state: "unavailable",
    sources: [publicProfileSourceRef, starRailScoreMethodologySourceRef],
    note: "Build quality is unavailable without sufficient evidence.",
  },
  recommendation: {
    state: "unavailable",
    sources: [publicProfileSourceRef, starRailScoreMethodologySourceRef],
    note: "Recommendation is unavailable without sufficient evidence.",
  },
} as const satisfies CharacterAnalysisResult;

export const characterAnalysisResultFixtures = {
  complete: completeCharacterAnalysisResult,
  partial: partialCharacterAnalysisResult,
  unavailable: unavailableCharacterAnalysisResult,
} as const satisfies Record<"complete" | "partial" | "unavailable", CharacterAnalysisResult>;

export const malformedRawAnalysisExamples: readonly unknown[] = [
  null,
  {},
  { characterId: 42 },
  { relics: "not-an-array" },
  { source: { kind: "unsupported-source-kind" } },
  { targetStats: [{ key: null, min: "seventy" }] },
];

export const nonFiniteRawAnalysisExamples: readonly unknown[] = [
  { normalizedScore: Number.NaN },
  { normalizedScore: Number.POSITIVE_INFINITY },
  { normalizedScore: Number.NEGATIVE_INFINITY },
  { observedStats: [{ key: "spd", value: Number.NaN }] },
  { substatWeights: { "crit-rate": Number.POSITIVE_INFINITY } },
];
