import { describe, expect, it } from "vitest";
import type { PublicProfileSnapshot } from "../contracts";
import type { ProfileRuntimeState } from "../runtime";
import {
  isPublicProfileSnapshotStale,
  selectVisiblePublicProfileSnapshot,
} from "./PublicProfileContext";

function snapshot(uid: string): PublicProfileSnapshot {
  return {
    source: {
      provider: "fixture-provider",
      uid,
      fetchedAt: "2026-08-21T00:00:00.000Z",
      freshness: "fresh",
      isPartial: false,
    },
    player: {},
    characters: [],
  };
}

describe("public profile session visibility", () => {
  it("never shows a prior UID after a different UID load fails", () => {
    const oldSnapshot = snapshot("800111111");
    const state: ProfileRuntimeState = {
      status: "error",
      requestedUid: "800222222",
      error: { code: "not-found", message: "synthetic" },
      lastSuccessful: {
        requestedUid: "800111111",
        snapshot: oldSnapshot,
      },
    };

    expect(selectVisiblePublicProfileSnapshot(state)).toBeNull();
    expect(isPublicProfileSnapshotStale(state)).toBe(false);
  });

  it("keeps the same UID last-successful snapshot visible after refresh failure", () => {
    const oldSnapshot = snapshot("800111111");
    const state: ProfileRuntimeState = {
      status: "error",
      requestedUid: "800111111",
      error: { code: "provider-unavailable", message: "synthetic" },
      lastSuccessful: {
        requestedUid: "800111111",
        snapshot: oldSnapshot,
      },
    };

    expect(selectVisiblePublicProfileSnapshot(state)).toBe(oldSnapshot);
    expect(isPublicProfileSnapshotStale(state)).toBe(true);
  });
});
