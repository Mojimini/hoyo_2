import type {
  AnalysisEvidence,
  AnalysisSourceKind,
  AnalysisSourceRef,
  RelicScoreMethod,
  TargetStatRange,
} from "../../analysis/contracts";

export type EvidenceState = AnalysisEvidence<unknown>["state"];

const sourceKindLabels: Record<AnalysisSourceKind, string> = {
  "public-profile": "Public profile",
  "game-metadata": "Game metadata",
  "community-methodology": "Community methodology",
};

const relicMethodLabels: Record<RelicScoreMethod, string> = {
  "srs-n": "SRS-N",
  "srs-m": "SRS-M",
};

export function evidenceStateLabel(state: EvidenceState) {
  switch (state) {
    case "available":
      return "Available";
    case "partial":
      return "Partial";
    case "unavailable":
      return "Unavailable";
  }
}

export function evidenceStateDescription(state: EvidenceState) {
  switch (state) {
    case "available":
      return "The contract contains evidence for this section.";
    case "partial":
      return "The contract contains incomplete evidence for this section.";
    case "unavailable":
      return "The contract does not contain enough evidence to present this section.";
  }
}

export function sourceKindLabel(kind: AnalysisSourceKind) {
  return sourceKindLabels[kind];
}

export function relicMethodLabel(method: RelicScoreMethod) {
  return relicMethodLabels[method];
}

export function sourceIdentity(source: AnalysisSourceRef) {
  return `${source.name} · revision ${source.revision}`;
}

export function formatObservedValue(value: number, unit?: string) {
  return `${value}${unit ?? ""}`;
}

export function formatTargetRange(range: TargetStatRange) {
  const unit = range.unit ?? "";

  if (range.min !== undefined && range.max !== undefined) {
    return `${range.min}${unit}–${range.max}${unit}`;
  }

  if (range.min !== undefined) {
    return `At least ${range.min}${unit}`;
  }

  if (range.max !== undefined) {
    return `Up to ${range.max}${unit}`;
  }

  return "Range unavailable";
}
