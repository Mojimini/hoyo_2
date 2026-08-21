import { describe, expect, it } from "vitest";
import type {
  ProfileSourceMetadata,
  PublicProfileCharacter,
} from "../../profile/contracts";
import { mapPublicProfileCharacterToBuildEvidence } from "./mapper";

const source: ProfileSourceMetadata = {
  provider: "fixture-provider",
  uid: "800000001",
  fetchedAt: "2026-08-21T04:30:00.000Z",
  freshness: "fresh",
  isPartial: false,
};

const completeCharacter: PublicProfileCharacter = {
  id: "1001",
  name: "Fixture Character",
  level: 80,
  eidolon: 2,
  stats: {
    state: "available",
    value: [
      { key: "spd", label: "SPD", value: 150 },
      { key: "break-effect", label: "Break Effect", value: 220, unit: "%" },
    ],
  },
  lightCone: {
    state: "available",
    value: {
      id: "lc-1",
      name: "Fixture Cone",
      level: 80,
      superimposition: 1,
    },
  },
  relics: {
    state: "available",
    value: [
      {
        id: "relic-1",
        slot: "head",
        level: 15,
        mainStat: {
          state: "available",
          value: { key: "hp-flat", label: "HP", value: 705 },
        },
        substats: {
          state: "available",
          value: [
            { key: "spd", label: "SPD", value: 6 },
            { key: "break-effect", label: "Break Effect", value: 12.3, unit: "%" },
          ],
        },
      },
    ],
  },
  traces: {
    state: "available",
    value: [
      { key: "skill", name: "Skill", level: 10, maxLevel: 10 },
      { key: "ultimate", name: "Ultimate", level: 10, maxLevel: 10 },
    ],
  },
};

describe("mapPublicProfileCharacterToBuildEvidence", () => {
  it("maps a complete public snapshot without scoring or target synthesis", () => {
    const result = mapPublicProfileCharacterToBuildEvidence(completeCharacter, source);

    expect(result.characterId).toBe("1001");
    expect(result.observedStats).toMatchObject({
      state: "available",
      value: [
        { key: "spd", label: "SPD", value: 150 },
        { key: "break-effect", label: "Break Effect", value: 220, unit: "%" },
      ],
    });
    expect(result.lightCone).toMatchObject({
      state: "available",
      value: { id: "lc-1", name: "Fixture Cone", level: 80, superimposition: 1 },
    });
    expect(result.relics).toMatchObject({
      state: "available",
      value: [
        {
          id: "relic-1",
          slot: "head",
          level: 15,
          mainStatKey: "hp-flat",
          substatKeys: ["spd", "break-effect"],
        },
      ],
    });
    expect(result.traces).toMatchObject({
      state: "available",
      value: [
        { key: "skill", name: "Skill", level: 10, maxLevel: 10 },
        { key: "ultimate", name: "Ultimate", level: 10, maxLevel: 10 },
      ],
    });

    for (const evidence of [result.observedStats, result.lightCone, result.relics, result.traces]) {
      expect(evidence.sources).toEqual([
        {
          kind: "public-profile",
          name: "fixture-provider",
          revision: "2026-08-21T04:30:00.000Z",
          fetchedAt: "2026-08-21T04:30:00.000Z",
          reference: "uid:800000001;freshness:fresh;partial:false",
        },
      ]);
    }
  });

  it("preserves partial states and marks nested relic gaps as partial", () => {
    const character: PublicProfileCharacter = {
      ...completeCharacter,
      stats: {
        state: "partial",
        value: [{ key: "spd", label: "SPD", value: 149 }],
        note: "Only a subset of normalized stats was returned.",
      },
      lightCone: {
        state: "partial",
        value: completeCharacter.lightCone.state === "available"
          ? completeCharacter.lightCone.value
          : null,
        note: "Light-cone metadata is incomplete.",
      },
      relics: {
        state: "available",
        value: [
          {
            slot: "body",
            mainStat: { state: "unavailable", note: "Main stat omitted by provider." },
            substats: {
              state: "partial",
              value: [{ key: "spd", label: "SPD", value: 4 }],
              note: "Some substats are missing.",
            },
          },
        ],
      },
      traces: {
        state: "partial",
        value: [{ key: "skill", name: "Skill", level: 8 }],
      },
    };

    const result = mapPublicProfileCharacterToBuildEvidence(character, {
      ...source,
      isPartial: true,
    });

    expect(result.observedStats.state).toBe("partial");
    expect(result.lightCone.state).toBe("partial");
    expect(result.relics.state).toBe("partial");
    expect(result.relics).toMatchObject({
      value: [{ slot: "body", substatKeys: ["spd"] }],
    });
    if (result.relics.state === "partial") {
      expect(result.relics.value[0]).not.toHaveProperty("mainStatKey");
      expect(result.relics.note).toContain("partial or unavailable");
    }
    expect(result.traces.state).toBe("partial");
  });

  it("preserves unavailable fields without fabricating zero or empty equipment values", () => {
    const character: PublicProfileCharacter = {
      ...completeCharacter,
      stats: { state: "unavailable", note: "Stats unavailable." },
      lightCone: { state: "unavailable", note: "Light cone unavailable." },
      relics: { state: "unavailable", note: "Relics unavailable." },
      traces: { state: "unavailable", note: "Traces unavailable." },
    };

    const result = mapPublicProfileCharacterToBuildEvidence(character, source);

    expect(result.observedStats).toMatchObject({ state: "unavailable", note: "Stats unavailable." });
    expect(result.lightCone).toMatchObject({ state: "unavailable", note: "Light cone unavailable." });
    expect(result.relics).toMatchObject({ state: "unavailable", note: "Relics unavailable." });
    expect(result.traces).toMatchObject({ state: "unavailable", note: "Traces unavailable." });
    expect(result.observedStats).not.toHaveProperty("value");
    expect(result.lightCone).not.toHaveProperty("value");
    expect(result.relics).not.toHaveProperty("value");
    expect(result.traces).not.toHaveProperty("value");
  });

  it("preserves an explicit empty light cone as known available null", () => {
    const character: PublicProfileCharacter = {
      ...completeCharacter,
      lightCone: { state: "available", value: null },
    };

    const result = mapPublicProfileCharacterToBuildEvidence(character, source);

    expect(result.lightCone).toMatchObject({ state: "available", value: null });
  });

  it("fails closed for malformed adapter-impossible field payloads", () => {
    const missingValue = {
      ...completeCharacter,
      stats: { state: "available" },
    } as unknown as PublicProfileCharacter;
    const nonFiniteTrace = {
      ...completeCharacter,
      traces: {
        state: "available",
        value: [{ key: "skill", name: "Skill", level: Number.NaN }],
      },
    } as PublicProfileCharacter;

    const missingValueResult = mapPublicProfileCharacterToBuildEvidence(missingValue, source);
    const nonFiniteTraceResult = mapPublicProfileCharacterToBuildEvidence(nonFiniteTrace, source);

    expect(missingValueResult.observedStats.state).toBe("unavailable");
    expect(missingValueResult.observedStats.note).toContain("Malformed");
    expect(nonFiniteTraceResult.traces.state).toBe("unavailable");
    expect(nonFiniteTraceResult.traces.note).toContain("Malformed");
  });

  it("keeps targetStats explicitly unavailable without a verified target source", () => {
    const result = mapPublicProfileCharacterToBuildEvidence(completeCharacter, source);

    expect(result.targetStats).toEqual({
      state: "unavailable",
      sources: [],
      note: "Target stats are unavailable until a verified target-stat source is provided.",
    });
  });

  it("rejects malformed source provenance instead of inventing it", () => {
    expect(() =>
      mapPublicProfileCharacterToBuildEvidence(completeCharacter, {
        ...source,
        provider: "",
      }),
    ).toThrow(/provenance/);
  });
});
