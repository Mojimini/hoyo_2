import { describe, expect, it } from "vitest";
import type { RelicWeightProfile } from "../contracts";
import {
  RelicScoreInputError,
  scoreRelic,
  type NormalizedRelicScoreInput,
} from "./index";

const source = Object.freeze({
  kind: "community-methodology" as const,
  name: "StarRailScore",
  revision: "test-revision",
  fetchedAt: "2026-08-21T00:00:00Z",
  reference: "https://github.com/Mar-7th/StarRailScore",
});

function makeProfile(
  overrides: Partial<RelicWeightProfile> = {},
): RelicWeightProfile {
  return {
    characterId: "1003",
    mainStatWeights: {
      body: {
        "crit-rate": 0.9,
        atk: 1,
        zero: 0,
        impossible: 2,
      },
    },
    substatWeights: {
      "crit-rate": 1,
      atk: 0.5,
      hp: 0,
      spd: 1,
      impossible: 1,
    },
    maxSubstatScore: 8,
    source,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<NormalizedRelicScoreInput> = {},
): NormalizedRelicScoreInput {
  return {
    slot: "body",
    level: 12,
    mainStatKey: "crit-rate",
    substats: [
      { key: "crit-rate", baseRolls: 3, boostRolls: 2 },
      { key: "atk", baseRolls: 1, boostRolls: 0 },
    ],
    ...overrides,
  };
}

describe("scoreRelic", () => {
  it("implements the documented main/substat formula and equal SRS-N weighting", () => {
    const result = scoreRelic(makeInput(), makeProfile(), "srs-n");

    // ((12 + 1) / 16) * 0.9
    expect(result.mainStatScore).toBeCloseTo(0.73125, 12);
    // ((3 + 2 * 0.1) * 1 + (1 + 0 * 0.1) * 0.5) / 8
    expect(result.substatScore).toBeCloseTo(0.4625, 12);
    // main and substats each contribute 50%.
    expect(result.normalizedScore).toBeCloseTo(0.596875, 12);
    expect(result.effectiveSubstats).toBe(2);
    expect(result.source).toBe(source);
  });

  it("implements SRS-M as the square root of SRS-N", () => {
    const input = makeInput();
    const profile = makeProfile();
    const normal = scoreRelic(input, profile, "srs-n");
    const modified = scoreRelic(input, profile, "srs-m");

    expect(modified.normalizedScore).toBeCloseTo(
      Math.sqrt(normal.normalizedScore),
      12,
    );
    expect(modified.normalizedScore ** 2).toBeCloseTo(
      normal.normalizedScore,
      12,
    );
    expect(modified.mainStatScore).toBe(normal.mainStatScore);
    expect(modified.substatScore).toBe(normal.substatScore);
  });

  it.each([
    {
      name: "zero canonical weights produce a zero score",
      input: makeInput({
        level: 0,
        mainStatKey: "zero",
        substats: [{ key: "hp", baseRolls: 4, boostRolls: 3 }],
      }),
      expected: 0,
      effective: 0,
    },
    {
      name: "explicit maximum inputs remain exactly normalized to one",
      input: makeInput({
        level: 15,
        mainStatKey: "atk",
        substats: [
          { key: "crit-rate", baseRolls: 2, boostRolls: 0 },
          { key: "spd", baseRolls: 6, boostRolls: 0 },
        ],
      }),
      expected: 1,
      effective: 2,
    },
  ])("handles normalized boundaries: $name", ({ input, expected, effective }) => {
    const result = scoreRelic(input, makeProfile(), "srs-n");

    expect(result.mainStatScore).toBe(expected);
    expect(result.substatScore).toBe(expected);
    expect(result.normalizedScore).toBe(expected);
    expect(result.effectiveSubstats).toBe(effective);
  });

  it.each([
    {
      name: "missing maxSubstatScore",
      input: makeInput(),
      profile: makeProfile({ maxSubstatScore: undefined }),
      code: "missing-max-substat-score",
    },
    {
      name: "non-finite maxSubstatScore",
      input: makeInput(),
      profile: makeProfile({ maxSubstatScore: Number.NaN }),
      code: "missing-max-substat-score",
    },
    {
      name: "missing main-stat weight",
      input: makeInput({ mainStatKey: "missing" }),
      profile: makeProfile(),
      code: "missing-main-weight",
    },
    {
      name: "missing substat weight",
      input: makeInput({ substats: [{ key: "missing", baseRolls: 1, boostRolls: 0 }] }),
      profile: makeProfile(),
      code: "missing-substat-weight",
    },
    {
      name: "non-finite substat weight",
      input: makeInput({ substats: [{ key: "atk", baseRolls: 1, boostRolls: 0 }] }),
      profile: makeProfile({ substatWeights: { atk: Number.POSITIVE_INFINITY } }),
      code: "invalid-weight",
    },
    {
      name: "level above the SRS 0..15 contract",
      input: makeInput({ level: 16 }),
      profile: makeProfile(),
      code: "invalid-level",
    },
    {
      name: "non-integer base roll count",
      input: makeInput({ substats: [{ key: "atk", baseRolls: 1.5, boostRolls: 0 }] }),
      profile: makeProfile(),
      code: "invalid-roll-count",
    },
    {
      name: "non-finite boost roll count",
      input: makeInput({ substats: [{ key: "atk", baseRolls: 1, boostRolls: Number.NaN }] }),
      profile: makeProfile(),
      code: "invalid-roll-count",
    },
    {
      name: "duplicate normalized substats",
      input: makeInput({
        substats: [
          { key: "atk", baseRolls: 1, boostRolls: 0 },
          { key: "atk", baseRolls: 1, boostRolls: 0 },
        ],
      }),
      profile: makeProfile(),
      code: "duplicate-substat",
    },
    {
      name: "main-stat score above one",
      input: makeInput({ level: 15, mainStatKey: "impossible", substats: [] }),
      profile: makeProfile(),
      code: "score-out-of-range",
    },
    {
      name: "substat score above one",
      input: makeInput({
        level: 15,
        mainStatKey: "atk",
        substats: [{ key: "impossible", baseRolls: 9, boostRolls: 0 }],
      }),
      profile: makeProfile(),
      code: "score-out-of-range",
    },
  ])("fails closed for malformed input: $name", ({ input, profile, code }) => {
    try {
      scoreRelic(input, profile, "srs-n");
      throw new Error("Expected scoreRelic to fail closed.");
    } catch (error) {
      expect(error).toBeInstanceOf(RelicScoreInputError);
      expect((error as RelicScoreInputError).code).toBe(code);
    }
  });

  it("is deterministic and does not mutate frozen canonical inputs", () => {
    const input = Object.freeze({
      ...makeInput(),
      substats: Object.freeze(
        makeInput().substats.map((substat) => Object.freeze({ ...substat })),
      ),
    });
    const profile = Object.freeze({
      ...makeProfile(),
      mainStatWeights: Object.freeze({
        body: Object.freeze({ ...makeProfile().mainStatWeights.body }),
      }),
      substatWeights: Object.freeze({ ...makeProfile().substatWeights }),
    });

    const first = scoreRelic(input, profile, "srs-m");
    for (let index = 0; index < 25; index += 1) {
      expect(scoreRelic(input, profile, "srs-m")).toEqual(first);
    }
  });
});
