export type BuildStatus = "needs-work" | "good" | "recommended" | "complete";
export type BuildQueueStage = "current" | "next" | "later" | "done";

export interface CharacterStat {
  key: string;
  label: string;
  current: number;
  target: number;
  unit?: string;
}

export interface CharacterSummary {
  id: string;
  name: string;
  role: "DPS" | "Support" | "Sustain";
  element: string;
  level: number;
  buildScore: number;
  status: BuildStatus;
  priority: number;
  queueStage: BuildQueueStage;
  nextAction: string;
  stats: CharacterStat[];
}

export interface TeamSummary {
  id: string;
  name: string;
  characterIds: string[];
  readiness: number;
  weakPointCharacterId?: string;
  recommendation: string;
}

export interface AccountSummary {
  displayName: string;
  region: string;
  readyCount: number;
  buildingCount: number;
  needsWorkCount: number;
  dpsCoverage: number;
  supportCoverage: number;
  sustainCoverage: number;
}
