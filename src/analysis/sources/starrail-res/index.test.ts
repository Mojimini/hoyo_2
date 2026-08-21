import { describe, expect, it } from "vitest";

import {
  STAR_RAIL_RES_DEFAULT_REVISION,
  StarRailResAdapter,
  StarRailResSchemaError,
  StarRailResTransportError,
  createStarRailResFetchTransport,
  type StarRailResDataset,
  type StarRailResTransport,
} from "./index";

const validPayloads: Record<StarRailResDataset, unknown> = {
  characters: {
    "1003": {
      id: "1003",
      name: "Himeko",
      tag: "himeko",
      rarity: 5,
      path: "Mage",
      element: "Fire",
      max_sp: 120,
    },
  },
  properties: {
    AttackAddedRatio: {
      type: "AttackAddedRatio",
      name: "ATK",
      field: "atk",
      affix: true,
      ratio: true,
      percent: true,
      order: 2,
    },
    AttackDelta: {
      type: "AttackDelta",
      name: "ATK",
      field: "atk",
      affix: true,
      ratio: false,
      percent: false,
      order: 2,
    },
    CriticalChanceBase: {
      type: "CriticalChanceBase",
      name: "CRIT Rate",
      field: "crit_rate",
      affix: true,
      ratio: false,
      percent: true,
      order: 5,
    },
  },
  relics: {
    "31011": {
      id: "31011",
      set_id: "101",
      name: "Passerby's Rejuvenated Wooden Hairstick",
      rarity: 2,
      type: "HEAD",
      max_level: 6,
      main_affix_id: "21",
      sub_affix_id: "2",
    },
  },
  relic_sets: {
    "101": {
      id: "101",
      name: "Passerby of Wandering Cloud",
      desc: ["Example set bonus", "Example second bonus"],
      properties: [[{ type: "AttackAddedRatio", value: 0.12 }], []],
    },
  },
  relic_main_affixes: {
    "21": {
      id: "21",
      affixes: {
        "1": { affix_id: "1", property: "AttackDelta", base: 22.5792, step: 7.90272 },
      },
    },
  },
  relic_sub_affixes: {
    "2": {
      id: "2",
      affixes: {
        "8": {
          affix_id: "8",
          property: "CriticalChanceBase",
          base: 0.010368,
          step: 0.001296,
          step_num: 2,
        },
      },
    },
  },
};

function clonePayloads(): Record<StarRailResDataset, unknown> {
  return structuredClone(validPayloads);
}

function createFixtureTransport(
  payloads: Record<StarRailResDataset, unknown> = clonePayloads(),
  calls: StarRailResDataset[] = [],
): StarRailResTransport {
  return {
    async getJson(dataset, locale) {
      expect(locale).toBe("en");
      calls.push(dataset);
      return payloads[dataset];
    },
  };
}

describe("StarRailResAdapter", () => {
  it("loads the current metadata families through an injected offline transport", async () => {
    const calls: StarRailResDataset[] = [];
    const adapter = new StarRailResAdapter({
      transport: createFixtureTransport(clonePayloads(), calls),
      revision: "fixture-revision",
      now: () => new Date("2026-08-21T04:30:00.000Z"),
    });

    const result = await adapter.loadMetadata();

    expect(calls).toEqual([
      "characters",
      "properties",
      "relics",
      "relic_sets",
      "relic_main_affixes",
      "relic_sub_affixes",
    ]);
    expect(result.source).toEqual({
      kind: "game-metadata",
      name: "StarRailRes",
      revision: "fixture-revision",
      fetchedAt: "2026-08-21T04:30:00.000Z",
      reference:
        "https://github.com/Mar-7th/StarRailRes/tree/fixture-revision/index_new/en",
    });
    expect(result.characters["1003"]).toMatchObject({
      id: "1003",
      name: "Himeko",
      rarity: 5,
      path: "Mage",
      element: "Fire",
      maxSp: 120,
    });
    expect(result.relics["31011"]).toMatchObject({
      setId: "101",
      mainAffixId: "21",
      subAffixId: "2",
    });
    expect(result.relicMainAffixes["21"].affixes["1"].base).toBe(22.5792);
    expect(result.relicSubAffixes["2"].affixes["8"].stepNum).toBe(2);
  });

  it("fails closed on non-finite numeric data", async () => {
    const payloads = clonePayloads();
    const mainAffixes = payloads.relic_main_affixes as Record<string, any>;
    mainAffixes["21"].affixes["1"].base = Number.POSITIVE_INFINITY;

    const adapter = new StarRailResAdapter({ transport: createFixtureTransport(payloads) });

    await expect(adapter.loadMetadata()).rejects.toMatchObject<Partial<StarRailResSchemaError>>({
      name: "StarRailResSchemaError",
      path: "relic_main_affixes.21.affixes.1.base",
    });
  });

  it("fails closed when a relic references an unknown metadata group", async () => {
    const payloads = clonePayloads();
    const relics = payloads.relics as Record<string, any>;
    relics["31011"].main_affix_id = "missing";

    const adapter = new StarRailResAdapter({ transport: createFixtureTransport(payloads) });

    await expect(adapter.loadMetadata()).rejects.toThrow("unknown main affix group missing");
  });

  it("fails closed when an affix references an unknown property", async () => {
    const payloads = clonePayloads();
    const subAffixes = payloads.relic_sub_affixes as Record<string, any>;
    subAffixes["2"].affixes["8"].property = "UnverifiedProperty";

    const adapter = new StarRailResAdapter({ transport: createFixtureTransport(payloads) });

    await expect(adapter.loadMetadata()).rejects.toThrow("unknown property UnverifiedProperty");
  });
});

describe("createStarRailResFetchTransport", () => {
  it("uses a pinned revision and the current affixes filename without network access", async () => {
    let requestedUrl = "";
    let requestedMethod = "";
    const fakeFetch: typeof fetch = async (input, init) => {
      requestedUrl = String(input);
      requestedMethod = init?.method ?? "";
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const transport = createStarRailResFetchTransport({ fetchImpl: fakeFetch });
    const result = await transport.getJson("relic_main_affixes", "en");

    expect(requestedMethod).toBe("GET");
    expect(requestedUrl).toBe(
      `https://raw.githubusercontent.com/Mar-7th/StarRailRes/${STAR_RAIL_RES_DEFAULT_REVISION}/index_new/en/relic_main_affixes.json`,
    );
    expect(result).toEqual({ ok: true });
  });

  it("maps non-success HTTP responses to a typed transport error", async () => {
    const fakeFetch: typeof fetch = async () => new Response("missing", { status: 404 });
    const transport = createStarRailResFetchTransport({ fetchImpl: fakeFetch });

    await expect(transport.getJson("characters", "en")).rejects.toMatchObject<
      Partial<StarRailResTransportError>
    >({
      name: "StarRailResTransportError",
      status: 404,
    });
  });
});
