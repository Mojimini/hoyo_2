export type AnalysisSourceKind =
  | "public-profile"
  | "game-metadata"
  | "community-methodology";

export interface AnalysisSourceRef {
  kind: AnalysisSourceKind;
  name: string;
  revision: string;
  fetchedAt: string;
  reference?: string;
}

export type AnalysisEvidence<T> =
  | {
      state: "available";
      value: T;
      sources: readonly AnalysisSourceRef[];
      note?: string;
    }
  | {
      state: "partial";
      value: T;
      sources: readonly AnalysisSourceRef[];
      note: string;
    }
  | {
      state: "unavailable";
      sources: readonly AnalysisSourceRef[];
      note: string;
    };

export interface AnalysisStatValue {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

export interface TargetStatRange {
  key: string;
  label: string;
  min?: number;
  max?: number;
  unit?: string;
  context?: string;
}

export interface RelicWeightProfile {
  characterId: string;
  mainStatWeights: Readonly<Record<string, Readonly<Record<string, number>>>>;
  substatWeights: Readonly<Record<string, number>>;
  maxSubstatScore?: number;
  source: AnalysisSourceRef;
}

export type RelicScoreMethod = "srs-n" | "srs-m";

export interface RelicScoreResult {
  method: RelicScoreMethod;
  normalizedScore: number;
  mainStatScore: number;
  substatScore: number;
  effectiveSubstats: number;
  source: AnalysisSourceRef;
  note?: string;
}

export interface CharacterBuildEvidence {
  characterId: string;
  observedStats: AnalysisEvidence<readonly AnalysisStatValue[]>;
  lightCone: AnalysisEvidence<{
    id?: string;
    name?: string;
    level?: number;
    superimposition?: number;
  } | null>;
  relics: AnalysisEvidence<readonly {
    id?: string;
    slot: string;
    level?: number;
    mainStatKey?: string;
    substatKeys: readonly string[];
  }[]>;
  traces: AnalysisEvidence<readonly {
    key: string;
    name: string;
    level: number;
    maxLevel?: number;
  }[]>;
  targetStats: AnalysisEvidence<readonly TargetStatRange[]>;
}

export interface CharacterAnalysisResult {
  characterId: string;
  evidence: CharacterBuildEvidence;
  relicScores: AnalysisEvidence<readonly {
    relicId?: string;
    slot: string;
    score: RelicScoreResult;
  }[]>;
  buildQuality: AnalysisEvidence<{
    label: string;
    normalizedScore?: number;
  }>;
  recommendation: AnalysisEvidence<{
    summary: string;
    nextAction?: string;
  }>;
}

export function unavailableAnalysisEvidence<T>(
  note: string,
  sources: readonly AnalysisSourceRef[] = [],
): AnalysisEvidence<T> {
  return { state: "unavailable", note, sources };
}
