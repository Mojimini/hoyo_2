import type {
  ProfileFetchResult,
  ProfileSourceMetadata,
  PublicProfileSnapshot,
} from "../contracts";

export const FRESHNESS_BOUNDARY_INSTANT = "2026-01-15T12:05:00.000Z";

export const freshBoundaryMetadata = {
  provider: "fixture",
  uid: "synthetic-fresh-boundary",
  fetchedAt: "2026-01-15T12:00:00.000Z",
  freshness: "fresh",
  expiresAt: "2026-01-15T12:05:00.001Z",
  ttlSeconds: 300,
  isPartial: false,
} satisfies ProfileSourceMetadata;

export const staleBoundaryMetadata = {
  provider: "fixture",
  uid: "synthetic-stale-boundary",
  fetchedAt: "2026-01-15T12:00:00.000Z",
  freshness: "stale",
  expiresAt: FRESHNESS_BOUNDARY_INSTANT,
  ttlSeconds: 300,
  isPartial: false,
} satisfies ProfileSourceMetadata;

export const completePublicShowcase = {
  source: {
    provider: "fixture",
    uid: "synthetic-complete-showcase",
    fetchedAt: "2026-01-15T12:00:00.000Z",
    freshness: "fresh",
    expiresAt: "2026-01-15T12:05:00.000Z",
    ttlSeconds: 300,
    isPartial: false,
  },
  player: {
    nickname: "Fixture Trailblazer",
    trailblazeLevel: 70,
    equilibriumLevel: 6,
    signature: "Synthetic profile for deterministic tests",
    avatarIconUrl: "/fixtures/avatar-complete.png",
  },
  characters: [
    {
      id: "fixture-character-complete",
      name: "Fixture Character",
      level: 80,
      eidolon: 2,
      ascension: 6,
      element: "Imaginary",
      path: "Harmony",
      iconUrl: "/fixtures/character-complete-icon.png",
      portraitUrl: "/fixtures/character-complete-portrait.png",
      stats: {
        state: "available",
        value: [
          { key: "hp", label: "HP", value: 3200 },
          { key: "spd", label: "SPD", value: 145 },
          { key: "break-effect", label: "Break Effect", value: 180, unit: "%" },
        ],
      },
      lightCone: {
        state: "available",
        value: {
          id: "fixture-light-cone",
          name: "Fixture Light Cone",
          level: 80,
          superimposition: 1,
          rarity: 5,
          iconUrl: "/fixtures/light-cone.png",
        },
      },
      relics: {
        state: "available",
        value: [
          {
            id: "fixture-relic-head",
            name: "Fixture Headpiece",
            slot: "head",
            level: 15,
            rarity: 5,
            iconUrl: "/fixtures/relic-head.png",
            mainStat: {
              state: "available",
              value: { key: "hp-flat", label: "HP", value: 705 },
            },
            substats: {
              state: "available",
              value: [
                { key: "spd", label: "SPD", value: 6 },
                { key: "break-effect", label: "Break Effect", value: 18, unit: "%" },
              ],
            },
          },
        ],
      },
      traces: {
        state: "available",
        value: [
          {
            key: "skill",
            name: "Fixture Skill",
            kind: "skill",
            level: 10,
            maxLevel: 10,
          },
        ],
      },
    },
  ],
} satisfies PublicProfileSnapshot;

export const partialEquipmentShowcase = {
  source: {
    provider: "fixture",
    uid: "synthetic-partial-showcase",
    fetchedAt: "2026-01-15T12:00:00.000Z",
    freshness: "fresh",
    expiresAt: "2026-01-15T12:05:00.000Z",
    ttlSeconds: 300,
    isPartial: true,
  },
  player: {
    nickname: "Partial Fixture",
  },
  characters: [
    {
      id: "fixture-character-partial",
      name: "Partial Fixture Character",
      level: 70,
      stats: {
        state: "partial",
        value: [{ key: "spd", label: "SPD", value: 121 }],
        note: "Only one normalized stat was supplied by the fixture source.",
      },
      lightCone: {
        state: "unavailable",
        note: "The source did not prove whether a light cone is equipped.",
      },
      relics: {
        state: "partial",
        value: [
          {
            slot: "body",
            level: 12,
            mainStat: {
              state: "available",
              value: { key: "atk-percent", label: "ATK", value: 34.5, unit: "%" },
            },
            substats: {
              state: "unavailable",
              note: "Substats were omitted by the fixture source.",
            },
          },
        ],
      },
      traces: {
        state: "unavailable",
        note: "Trace levels were not present in the source data.",
      },
    },
  ],
} satisfies PublicProfileSnapshot;

export const emptyPublicShowcase = {
  source: {
    provider: "fixture",
    uid: "synthetic-empty-showcase",
    fetchedAt: "2026-01-15T12:00:00.000Z",
    freshness: "fresh",
    expiresAt: "2026-01-15T12:05:00.000Z",
    ttlSeconds: 300,
    isPartial: false,
  },
  player: {
    nickname: "Empty Fixture",
  },
  characters: [],
} satisfies PublicProfileSnapshot;

export const privateShowcaseResult = {
  ok: false,
  error: {
    code: "private-or-empty-showcase",
    message: "Synthetic fixture: the public showcase is unavailable.",
    provider: "fixture",
  },
} satisfies ProfileFetchResult;

export const explicitNoLightConeShowcase = {
  source: {
    provider: "fixture",
    uid: "synthetic-no-light-cone",
    fetchedAt: "2026-01-15T12:00:00.000Z",
    freshness: "fresh",
    isPartial: false,
  },
  player: {},
  characters: [
    {
      id: "fixture-character-no-light-cone",
      name: "No Light Cone Fixture",
      level: 1,
      stats: { state: "unavailable" },
      lightCone: { state: "available", value: null },
      relics: { state: "unavailable" },
      traces: { state: "unavailable" },
    },
  ],
} satisfies PublicProfileSnapshot;

/**
 * Deliberately invalid provider-neutral input for adapter/runtime boundary tests.
 * It is typed as unknown so consumers must validate it before producing a
 * canonical PublicProfileSnapshot.
 */
export const malformedUnknownProfileInput: unknown = {
  uid: 123456789,
  fetchedAt: null,
  player: {
    nickname: ["unexpected", "array"],
    unknownPlayerField: true,
  },
  characters: "not-an-array",
  unknownTopLevelField: {
    nested: "synthetic-only",
  },
};
