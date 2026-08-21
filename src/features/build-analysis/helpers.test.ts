import { describe, expect, it } from "vitest";
import {
  evidenceStateDescription,
  evidenceStateLabel,
  formatObservedValue,
  formatTargetRange,
  relicMethodLabel,
  sourceIdentity,
  sourceKindLabel,
} from "./helpers";
import {
  availableAnalysisFixture,
  demoCommunitySource,
  partialAnalysisFixture,
  unavailableAnalysisFixture,
} from "./fixtures";

describe("build analysis presentation helpers", () => {
  it("keeps evidence states explicit in accessible text", () => {
    expect(evidenceStateLabel("available")).toBe("Available");
    expect(evidenceStateLabel("partial")).toBe("Partial");
    expect(evidenceStateLabel("unavailable")).toBe("Unavailable");
    expect(evidenceStateDescription("unavailable")).toContain("does not contain enough evidence");
  });

  it("preserves source provenance names, revisions, and source kinds", () => {
    expect(sourceIdentity(demoCommunitySource)).toBe(
      "Synthetic community methodology · revision community-fixture-v2",
    );
    expect(sourceKindLabel(demoCommunitySource.kind)).toBe("Community methodology");
  });

  it("labels SRS methods as named community methodologies without deriving a score", () => {
    expect(relicMethodLabel("srs-n")).toBe("SRS-N");
    expect(relicMethodLabel("srs-m")).toBe("SRS-M");
    expect(availableAnalysisFixture.relicScores.state).toBe("available");
    if (availableAnalysisFixture.relicScores.state === "available") {
      expect(availableAnalysisFixture.relicScores.value[0]?.score.normalizedScore).toBe(82);
    }
  });

  it("formats observed values without generating targets", () => {
    expect(formatObservedValue(182, "%")).toBe("182%");
    expect(formatObservedValue(145)).toBe("145");
  });

  it("renders only target boundaries that already exist in the contract", () => {
    expect(formatTargetRange({ key: "spd", label: "SPD", min: 145 })).toBe("At least 145");
    expect(formatTargetRange({ key: "crit", label: "CRIT", max: 80, unit: "%" })).toBe("Up to 80%");
    expect(formatTargetRange({ key: "break", label: "Break", min: 160, max: 180, unit: "%" })).toBe(
      "160%–180%",
    );
    expect(formatTargetRange({ key: "unknown", label: "Unknown" })).toBe("Range unavailable");
  });
});

describe("typed build analysis fixtures", () => {
  it("does not fabricate values for unavailable analysis outputs", () => {
    expect(unavailableAnalysisFixture.evidence.targetStats.state).toBe("unavailable");
    expect("value" in unavailableAnalysisFixture.evidence.targetStats).toBe(false);

    expect(unavailableAnalysisFixture.buildQuality.state).toBe("unavailable");
    expect("value" in unavailableAnalysisFixture.buildQuality).toBe(false);

    expect(unavailableAnalysisFixture.recommendation.state).toBe("unavailable");
    expect("value" in unavailableAnalysisFixture.recommendation).toBe(false);
  });

  it("keeps partial evidence partial instead of upgrading it to available", () => {
    expect(partialAnalysisFixture.evidence.observedStats.state).toBe("partial");
    expect(partialAnalysisFixture.evidence.relics.state).toBe("partial");
    expect(partialAnalysisFixture.buildQuality.state).toBe("unavailable");
    expect(partialAnalysisFixture.recommendation.state).toBe("unavailable");
  });
});
