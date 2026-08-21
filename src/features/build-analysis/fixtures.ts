import type { AnalysisSourceRef, CharacterAnalysisResult } from "../../analysis/contracts";

export const demoPublicProfileSource: AnalysisSourceRef = {
  kind: "public-profile",
  name: "Synthetic public profile fixture",
  revision: "profile-fixture-v1",
  fetchedAt: "2026-08-21T00:00:00.000Z",
  reference: "offline-fixture",
};

export const demoMetadataSource: AnalysisSourceRef = {
  kind: "game-metadata",
  name: "Synthetic game metadata fixture",
  revision: "metadata-fixture-v1",
  fetchedAt: "2026-08-21T00:00:00.000Z",
};

export const demoCommunitySource: AnalysisSourceRef = {
  kind: "community-methodology",
  name: "Synthetic community methodology",
  revision: "community-fixture-v2",
  fetchedAt: "2026-08-21T00:00:00.000Z",
  reference: "offline-methodology-fixture",
};

export const availableAnalysisFixture: CharacterAnalysisResult = {
  characterId: "demo-character",
  evidence: {
    characterId: "demo-character",
    observedStats: {
      state: "available",
      value: [
        { key: "spd", label: "SPD", value: 145 },
        { key: "break", label: "Break Effect", value: 182, unit: "%" },
      ],
      sources: [demoPublicProfileSource],
    },
    lightCone: {
      state: "available",
      value: {
        id: "demo-light-cone",
        name: "Fixture Light Cone",
        level: 80,
        superimposition: 1,
      },
      sources: [demoPublicProfileSource],
    },
    relics: {
      state: "available",
      value: [
        {
          id: "demo-relic-head",
          slot: "head",
          level: 15,
          mainStatKey: "hp-flat",
          substatKeys: ["spd", "break-effect"],
        },
      ],
      sources: [demoPublicProfileSource],
    },
    traces: {
      state: "available",
      value: [{ key: "skill", name: "Skill", level: 10, maxLevel: 10 }],
      sources: [demoPublicProfileSource],
    },
    targetStats: {
      state: "available",
      value: [
        {
          key: "spd",
          label: "SPD",
          min: 145,
          context: "Synthetic target supplied by analysis fixture",
        },
      ],
      sources: [demoMetadataSource, demoCommunitySource],
    },
  },
  relicScores: {
    state: "available",
    value: [
      {
        relicId: "demo-relic-head",
        slot: "head",
        score: {
          method: "srs-n",
          normalizedScore: 0.82,
          mainStatScore: 1,
          substatScore: 0.64,
          effectiveSubstats: 5.5,
          source: demoCommunitySource,
          note: "Synthetic score supplied directly by the fixture.",
        },
      },
    ],
    sources: [demoPublicProfileSource, demoCommunitySource],
  },
  buildQuality: {
    state: "available",
    value: { label: "Fixture quality label", normalizedScore: 0.78 },
    sources: [demoPublicProfileSource, demoCommunitySource],
  },
  recommendation: {
    state: "available",
    value: {
      summary: "Fixture recommendation supplied by the analysis contract.",
      nextAction: "Fixture next action supplied by the analysis contract.",
    },
    sources: [demoPublicProfileSource, demoCommunitySource],
  },
};

export const partialAnalysisFixture: CharacterAnalysisResult = {
  characterId: "demo-partial-character",
  evidence: {
    characterId: "demo-partial-character",
    observedStats: {
      state: "partial",
      value: [{ key: "spd", label: "SPD", value: 134 }],
      sources: [demoPublicProfileSource],
      note: "Only a subset of observed stats was supplied.",
    },
    lightCone: {
      state: "unavailable",
      sources: [demoPublicProfileSource],
      note: "The fixture does not prove light cone state.",
    },
    relics: {
      state: "partial",
      value: [
        {
          slot: "body",
          mainStatKey: "crit-rate",
          substatKeys: [],
        },
      ],
      sources: [demoPublicProfileSource],
      note: "Only one relic was observed.",
    },
    traces: {
      state: "unavailable",
      sources: [demoPublicProfileSource],
      note: "Trace evidence was not supplied.",
    },
    targetStats: {
      state: "unavailable",
      sources: [demoMetadataSource],
      note: "No evidence-backed target ranges are available.",
    },
  },
  relicScores: {
    state: "partial",
    value: [],
    sources: [demoCommunitySource],
    note: "Methodology metadata exists, but no scored relic rows are available.",
  },
  buildQuality: {
    state: "unavailable",
    sources: [demoPublicProfileSource, demoCommunitySource],
    note: "Build quality cannot be established from partial evidence.",
  },
  recommendation: {
    state: "unavailable",
    sources: [demoPublicProfileSource, demoCommunitySource],
    note: "Recommendation is unavailable until evidence is sufficient.",
  },
};

export const unavailableAnalysisFixture: CharacterAnalysisResult = {
  characterId: "demo-unavailable-character",
  evidence: {
    characterId: "demo-unavailable-character",
    observedStats: {
      state: "unavailable",
      sources: [],
      note: "Observed stats are unavailable.",
    },
    lightCone: {
      state: "unavailable",
      sources: [],
      note: "Light cone evidence is unavailable.",
    },
    relics: {
      state: "unavailable",
      sources: [],
      note: "Relic evidence is unavailable.",
    },
    traces: {
      state: "unavailable",
      sources: [],
      note: "Trace evidence is unavailable.",
    },
    targetStats: {
      state: "unavailable",
      sources: [],
      note: "Target stats are unavailable.",
    },
  },
  relicScores: {
    state: "unavailable",
    sources: [],
    note: "Community relic scoring is unavailable.",
  },
  buildQuality: {
    state: "unavailable",
    sources: [],
    note: "Build quality is unavailable.",
  },
  recommendation: {
    state: "unavailable",
    sources: [],
    note: "Recommendation is unavailable.",
  },
};
