import { describe, expect, it, vi } from "vitest";
import { createPublicShowcaseProfileLoader } from "./index";

const UID = "800123456";

function makeRelic(type: number) {
  return {
    id: `relic-${type}`,
    name: `Relic ${type}`,
    type,
    level: 15,
    rarity: 5,
    icon: `icon/relic/${type}.png`,
    main_affix: {
      field: "HPDelta",
      name: "HP",
      value: 705,
      percent: false,
    },
    sub_affix: [
      {
        field: "CriticalDamageBase",
        name: "CRIT DMG",
        value: 0.1296,
        percent: true,
      },
    ],
  };
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    player: {
      uid: UID,
      nickname: "Synthetic Trailblazer",
      level: 70,
      world_level: 6,
      is_display: true,
      avatar: { icon: "icon/avatar/fixture.png" },
    },
    characters: [
      {
        id: "1307",
        name: "Synthetic Character",
        level: 80,
        rank: 2,
        promotion: 6,
        element: { name: "Quantum" },
        path: { name: "Erudition" },
        icon: "icon/avatar/1307.png",
        portrait: "image/character_portrait/1307.png",
        // Deliberately wrong-looking value: V2 `properties` is not the final stat list.
        properties: [
          { field: "WrongProperty", name: "Wrong property", value: 999, percent: false },
        ],
        statistics: [
          { field: "CriticalChanceBase", name: "CRIT Rate", value: 0.68312, percent: true },
          { field: "SpeedDelta", name: "SPD", value: 134, percent: false },
        ],
        light_cone: null,
        relics: [1, 2, 3, 4, 5, 6].map(makeRelic),
        skills: [{ id: "skill-1", name: "Synthetic Skill", type: "Skill", level: 10 }],
        ...overrides,
      },
    ],
  };
}

function responseFor(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "max-age=300",
      date: "Wed, 15 Jan 2026 12:00:00 GMT",
    },
  });
}

describe("MiHoMo public-showcase adapter", () => {
  it("normalizes V2 final statistics, fractional percentages, and relic type slots", async () => {
    const fetchImpl = vi.fn(async () => responseFor(makePayload()));
    const loader = createPublicShowcaseProfileLoader({
      fetchImpl,
      baseUrl: "https://example.invalid/sr_info_parsed",
      assetBaseUrl: "https://assets.example.invalid",
      now: () => new Date("2026-01-15T12:00:00.000Z"),
    });

    const result = await loader.fetchProfile(UID);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(fetchImpl).toHaveBeenCalledOnce();
    const character = result.snapshot.characters[0];

    expect(character.stats.state).toBe("available");
    if (character.stats.state !== "available") throw new Error("stats must be available");

    expect(character.stats.value.map((stat) => stat.label)).toEqual(["CRIT Rate", "SPD"]);
    expect(character.stats.value.find((stat) => stat.label === "Wrong property")).toBeUndefined();
    const critRate = character.stats.value.find((stat) => stat.label === "CRIT Rate");
    expect(critRate?.value).toBeCloseTo(68.312, 6);
    expect(critRate?.unit).toBe("%");

    expect(character.relics.state).toBe("available");
    if (character.relics.state !== "available") throw new Error("relics must be available");
    expect(character.relics.value.map((relic) => relic.slot)).toEqual([
      "head",
      "hands",
      "body",
      "feet",
      "planar-sphere",
      "link-rope",
    ]);

    const firstSubstats = character.relics.value[0].substats;
    expect(firstSubstats.state).toBe("available");
    if (firstSubstats.state !== "available") throw new Error("substats must be available");
    expect(firstSubstats.value[0].value).toBeCloseTo(12.96, 6);
    expect(firstSubstats.value[0].unit).toBe("%");
    expect(result.snapshot.source.isPartial).toBe(false);
  });

  it("marks an unknown relic type partial instead of inventing a slot", async () => {
    const payload = makePayload({ relics: [makeRelic(99)] });
    const loader = createPublicShowcaseProfileLoader({
      fetchImpl: async () => responseFor(payload),
      now: () => new Date("2026-01-15T12:00:00.000Z"),
    });

    const result = await loader.fetchProfile(UID);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    const relics = result.snapshot.characters[0].relics;
    expect(relics.state).toBe("partial");
    if (relics.state !== "partial") throw new Error("unknown slot must be partial");
    expect(relics.value[0].slot).toBe("unknown");
    expect(result.snapshot.source.isPartial).toBe(true);
  });

  it("keeps missing V2 statistics unavailable rather than falling back to properties", async () => {
    const payload = makePayload({ statistics: undefined });
    const loader = createPublicShowcaseProfileLoader({
      fetchImpl: async () => responseFor(payload),
      now: () => new Date("2026-01-15T12:00:00.000Z"),
    });

    const result = await loader.fetchProfile(UID);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.snapshot.characters[0].stats.state).toBe("unavailable");
    expect(result.snapshot.source.isPartial).toBe(true);
  });

  it("rejects invalid UIDs before making a network request", async () => {
    const fetchImpl = vi.fn(async () => responseFor(makePayload()));
    const loader = createPublicShowcaseProfileLoader({ fetchImpl });

    const result = await loader.fetchProfile("123");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("invalid UID must fail");
    expect(result.error.code).toBe("invalid-uid");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
