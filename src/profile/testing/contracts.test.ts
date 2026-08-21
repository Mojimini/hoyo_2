import { describe, expect, it } from "vitest";
import {
  FRESHNESS_BOUNDARY_INSTANT,
  completePublicShowcase,
  emptyPublicShowcase,
  explicitNoLightConeShowcase,
  freshBoundaryMetadata,
  malformedUnknownProfileInput,
  partialEquipmentShowcase,
  privateShowcaseResult,
  staleBoundaryMetadata,
} from "./fixtures";

describe("public profile fixture contracts", () => {
  it("represents a complete public showcase without missing equipment", () => {
    const character = completePublicShowcase.characters[0];

    expect(completePublicShowcase.source.isPartial).toBe(false);
    expect(character.stats.state).toBe("available");
    expect(character.lightCone.state).toBe("available");
    expect(character.relics.state).toBe("available");
    expect(character.traces.state).toBe("available");
  });

  it("preserves missing optional profile and equipment data instead of fabricating defaults", () => {
    const character = partialEquipmentShowcase.characters[0];

    expect(partialEquipmentShowcase.source.isPartial).toBe(true);
    expect(partialEquipmentShowcase.player).not.toHaveProperty("trailblazeLevel");
    expect(partialEquipmentShowcase.player).not.toHaveProperty("signature");

    expect(character.lightCone.state).toBe("unavailable");
    expect("value" in character.lightCone).toBe(false);
    expect(character.traces.state).toBe("unavailable");
    expect("value" in character.traces).toBe(false);

    expect(character.relics.state).toBe("partial");
    if (character.relics.state !== "partial") {
      throw new Error("partial equipment fixture must keep relics partial");
    }

    const relic = character.relics.value[0];
    expect(relic.substats.state).toBe("unavailable");
    expect("value" in relic.substats).toBe(false);
  });

  it("distinguishes an explicitly empty light-cone slot from unavailable source data", () => {
    const explicitCharacter = explicitNoLightConeShowcase.characters[0];
    const unavailableCharacter = partialEquipmentShowcase.characters[0];

    expect(explicitCharacter.lightCone.state).toBe("available");
    if (explicitCharacter.lightCone.state !== "available") {
      throw new Error("fixture must explicitly prove the light-cone state");
    }
    expect(explicitCharacter.lightCone.value).toBeNull();

    expect(unavailableCharacter.lightCone.state).toBe("unavailable");
    expect("value" in unavailableCharacter.lightCone).toBe(false);
  });

  it("covers empty and private showcase outcomes without a live UID", () => {
    expect(emptyPublicShowcase.characters).toHaveLength(0);
    expect(emptyPublicShowcase.source.uid).toBe("synthetic-empty-showcase");

    expect(privateShowcaseResult.ok).toBe(false);
    if (privateShowcaseResult.ok) {
      throw new Error("private showcase fixture must be an error result");
    }
    expect(privateShowcaseResult.error.code).toBe("private-or-empty-showcase");
  });

  it("keeps malformed and unknown input outside the canonical snapshot contract", () => {
    expect(malformedUnknownProfileInput).toEqual({
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
    });
  });

  it("uses fixed fresh and stale metadata fixtures around one deterministic boundary", () => {
    expect(Date.parse(freshBoundaryMetadata.expiresAt)).toBeGreaterThan(
      Date.parse(FRESHNESS_BOUNDARY_INSTANT),
    );
    expect(freshBoundaryMetadata.freshness).toBe("fresh");

    expect(Date.parse(staleBoundaryMetadata.expiresAt)).toBe(
      Date.parse(FRESHNESS_BOUNDARY_INSTANT),
    );
    expect(staleBoundaryMetadata.freshness).toBe("stale");
  });
});
