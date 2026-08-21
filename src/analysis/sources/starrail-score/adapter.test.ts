import { describe, expect, it, vi } from "vitest";
import type { AnalysisSourceRef } from "../../contracts";
import {
  STAR_RAIL_SCORE_DATASET_NAME,
  StarRailScoreAdapter,
  StarRailScoreAdapterError,
  parseStarRailScoreCharacter,
  type StarRailScoreTransport,
} from "./adapter";

const source: AnalysisSourceRef = {
  kind: "community-methodology",
  name: STAR_RAIL_SCORE_DATASET_NAME,
  revision: "6c842c9",
  fetchedAt: "2026-08-21T04:30:00.000Z",
  reference: "https://github.com/Mar-7th/StarRailScore/blob/master/score.json",
};

const syntheticDataset = {
  "1002": {
    main: {
      "1": { HPDelta: 1 },
      "3": {
        AttackAddedRatio: 1,
        CriticalChanceBase: 1,
        CriticalDamageBase: 1,
      },
    },
    weight: {
      AttackDelta: 0.3,
      AttackAddedRatio: 1,
      SpeedDelta: 1,
      CriticalChanceBase: 1,
      CriticalDamageBase: 1,
    },
    max: 10.24,
  },
};

describe("parseStarRailScoreCharacter", () => {
  it("normalizes only verified upstream weight fields", () => {
    const result = parseStarRailScoreCharacter(syntheticDataset, "1002", source);

    expect(result).toEqual({
      characterId: "1002",
      mainStatWeights: {
        "1": { HPDelta: 1 },
        "3": {
          AttackAddedRatio: 1,
          CriticalChanceBase: 1,
          CriticalDamageBase: 1,
        },
      },
      substatWeights: {
        AttackDelta: 0.3,
        AttackAddedRatio: 1,
        SpeedDelta: 1,
        CriticalChanceBase: 1,
        CriticalDamageBase: 1,
      },
      maxSubstatScore: 10.24,
      source,
    });
    expect(result.mainStatWeights["1"]).not.toHaveProperty("AttackDelta");
    expect(result.substatWeights).not.toHaveProperty("DefenceDelta");
  });

  it("reports a missing character explicitly", () => {
    expect(() =>
      parseStarRailScoreCharacter(syntheticDataset, "9999", source),
    ).toThrowError(
      expect.objectContaining<Partial<StarRailScoreAdapterError>>({
        code: "character-not-found",
      }),
    );
  });

  it("rejects unsupported root shapes", () => {
    expect(() => parseStarRailScoreCharacter([], "1002", source)).toThrowError(
      expect.objectContaining<Partial<StarRailScoreAdapterError>>({
        code: "unsupported-dataset-shape",
      }),
    );
  });

  it("rejects malformed character shapes", () => {
    expect(() =>
      parseStarRailScoreCharacter({ "1002": { main: [] } }, "1002", source),
    ).toThrowError(
      expect.objectContaining<Partial<StarRailScoreAdapterError>>({
        code: "malformed-character-entry",
      }),
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, "1"])(
    "rejects invalid/non-finite weights: %s",
    (badWeight) => {
      const dataset = {
        "1002": {
          ...syntheticDataset["1002"],
          weight: { SpeedDelta: badWeight },
        },
      };

      expect(() => parseStarRailScoreCharacter(dataset, "1002", source)).toThrowError(
        expect.objectContaining<Partial<StarRailScoreAdapterError>>({
          code: "invalid-weight",
        }),
      );
    },
  );

  it("rejects non-finite max values", () => {
    const dataset = {
      "1002": {
        ...syntheticDataset["1002"],
        max: Number.NEGATIVE_INFINITY,
      },
    };

    expect(() => parseStarRailScoreCharacter(dataset, "1002", source)).toThrowError(
      expect.objectContaining<Partial<StarRailScoreAdapterError>>({
        code: "invalid-weight",
      }),
    );
  });
});

describe("StarRailScoreAdapter", () => {
  it("uses injected transport and carries source provenance", async () => {
    const fetchScoreDataset = vi.fn(async () => ({
      data: syntheticDataset,
      revision: "upstream-revision",
      fetchedAt: "2026-08-21T04:30:00.000Z",
      reference: "https://github.com/Mar-7th/StarRailScore/blob/master/score.json",
    }));
    const transport: StarRailScoreTransport = { fetchScoreDataset };

    const adapter = new StarRailScoreAdapter(transport);
    const result = await adapter.loadRelicWeightProfile("1002");

    expect(fetchScoreDataset).toHaveBeenCalledTimes(1);
    expect(result.source).toEqual({
      kind: "community-methodology",
      name: STAR_RAIL_SCORE_DATASET_NAME,
      revision: "upstream-revision",
      fetchedAt: "2026-08-21T04:30:00.000Z",
      reference: "https://github.com/Mar-7th/StarRailScore/blob/master/score.json",
    });
  });

  it("rejects invalid source metadata instead of fabricating provenance", async () => {
    const transport: StarRailScoreTransport = {
      fetchScoreDataset: async () => ({
        data: syntheticDataset,
        revision: "",
        fetchedAt: "not-a-date",
        reference: "",
      }),
    };

    await expect(
      new StarRailScoreAdapter(transport).loadRelicWeightProfile("1002"),
    ).rejects.toMatchObject({ code: "invalid-source-metadata" });
  });
});
