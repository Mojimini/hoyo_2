import { describe, expect, it } from "vitest";
import type { AnalysisEvidence, AnalysisSourceRef, CharacterAnalysisResult } from "../contracts";
import {
  analysisSourceFixtures,
  characterAnalysisResultFixtures,
  characterBuildEvidenceFixtures,
  malformedRawAnalysisExamples,
  nonFiniteRawAnalysisExamples,
  relicWeightProfileFixtures,
} from "./fixtures";

function expectSourceRef(source: AnalysisSourceRef) {
  expect(["public-profile", "game-metadata", "community-methodology"]).toContain(source.kind);
  expect(source.name.length).toBeGreaterThan(0);
  expect(source.revision.length).toBeGreaterThan(0);
  expect(source.fetchedAt.length).toBeGreaterThan(0);
}

function expectEvidenceProvenance(evidence: AnalysisEvidence<unknown>) {
  expect(evidence.sources.length).toBeGreaterThan(0);
  evidence.sources.forEach(expectSourceRef);
}

function expectResultProvenance(result: CharacterAnalysisResult) {
  expectEvidenceProvenance(result.evidence.observedStats);
  expectEvidenceProvenance(result.evidence.lightCone);
  expectEvidenceProvenance(result.evidence.relics);
  expectEvidenceProvenance(result.evidence.traces);
  expectEvidenceProvenance(result.evidence.targetStats);
  expectEvidenceProvenance(result.relicScores);
  expectEvidenceProvenance(result.buildQuality);
  expectEvidenceProvenance(result.recommendation);

  if (result.relicScores.state !== "unavailable") {
    for (const relicScore of result.relicScores.value) {
      expectSourceRef(relicScore.score.source);
    }
  }
}

describe("analysis source fixtures", () => {
  it("covers each canonical Phase 4 provenance kind with synthetic references", () => {
    expect(analysisSourceFixtures.publicProfile.kind).toBe("public-profile");
    expect(analysisSourceFixtures.starRailResMetadata.kind).toBe("game-metadata");
    expect(analysisSourceFixtures.starRailScoreMethodology.kind).toBe("community-methodology");

    for (const source of Object.values(analysisSourceFixtures)) {
      expectSourceRef(source);
      expect(source.reference).toMatch(/^synthetic:\/\//);
    }
  });
});

describe("relic weight fixtures", () => {
  it("covers available, partial, and unavailable evidence states", () => {
    expect(relicWeightProfileFixtures.complete.state).toBe("available");
    expect(relicWeightProfileFixtures.partial.state).toBe("partial");
    expect(relicWeightProfileFixtures.unavailable.state).toBe("unavailable");

    Object.values(relicWeightProfileFixtures).forEach(expectEvidenceProvenance);
  });

  it("keeps methodology provenance attached to represented weight profiles", () => {
    if (relicWeightProfileFixtures.complete.state === "available") {
      expect(relicWeightProfileFixtures.complete.value.source).toEqual(
        analysisSourceFixtures.starRailScoreMethodology,
      );
    }

    if (relicWeightProfileFixtures.partial.state === "partial") {
      expect(relicWeightProfileFixtures.partial.value.source).toEqual(
        analysisSourceFixtures.starRailScoreMethodology,
      );
    }
  });
});

describe("character build evidence fixtures", () => {
  it("covers complete, partial, and unavailable evidence without fabricated defaults", () => {
    expect(characterBuildEvidenceFixtures.complete.observedStats.state).toBe("available");
    expect(characterBuildEvidenceFixtures.partial.observedStats.state).toBe("partial");
    expect(characterBuildEvidenceFixtures.unavailable.observedStats.state).toBe("unavailable");

    expect(characterBuildEvidenceFixtures.partial.targetStats.state).toBe("unavailable");
    expect("value" in characterBuildEvidenceFixtures.partial.targetStats).toBe(false);

    for (const evidence of Object.values(characterBuildEvidenceFixtures)) {
      expectEvidenceProvenance(evidence.observedStats);
      expectEvidenceProvenance(evidence.lightCone);
      expectEvidenceProvenance(evidence.relics);
      expectEvidenceProvenance(evidence.traces);
      expectEvidenceProvenance(evidence.targetStats);
    }
  });
});

describe("character analysis result fixtures", () => {
  it("keeps canonical source provenance on every result evidence field", () => {
    Object.values(characterAnalysisResultFixtures).forEach(expectResultProvenance);
  });

  it("fails closed when target stats, build quality, or recommendation evidence is missing", () => {
    const partial = characterAnalysisResultFixtures.partial;

    expect(partial.evidence.targetStats.state).toBe("unavailable");
    expect("value" in partial.evidence.targetStats).toBe(false);

    expect(partial.buildQuality.state).toBe("unavailable");
    expect("value" in partial.buildQuality).toBe(false);

    expect(partial.recommendation.state).toBe("unavailable");
    expect("value" in partial.recommendation).toBe(false);
  });

  it("keeps fully unavailable analysis fields explicitly unavailable", () => {
    const unavailable = characterAnalysisResultFixtures.unavailable;

    expect(unavailable.relicScores.state).toBe("unavailable");
    expect(unavailable.buildQuality.state).toBe("unavailable");
    expect(unavailable.recommendation.state).toBe("unavailable");

    expect("value" in unavailable.relicScores).toBe(false);
    expect("value" in unavailable.buildQuality).toBe(false);
    expect("value" in unavailable.recommendation).toBe(false);
  });
});

describe("raw boundary examples", () => {
  it("keeps malformed adapter inputs as unknown fixtures", () => {
    expect(malformedRawAnalysisExamples).toHaveLength(6);
    expect(malformedRawAnalysisExamples).toContainEqual({ characterId: 42 });
    expect(malformedRawAnalysisExamples).toContainEqual({ relics: "not-an-array" });
  });

  it("includes non-finite numbers for fail-closed boundary regression tests", () => {
    expect(nonFiniteRawAnalysisExamples).toHaveLength(5);
    expect(nonFiniteRawAnalysisExamples).toContainEqual({ normalizedScore: Number.NaN });
    expect(nonFiniteRawAnalysisExamples).toContainEqual({
      normalizedScore: Number.POSITIVE_INFINITY,
    });
    expect(nonFiniteRawAnalysisExamples).toContainEqual({
      normalizedScore: Number.NEGATIVE_INFINITY,
    });
  });
});
