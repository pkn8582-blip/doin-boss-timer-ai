export interface BossSpawn {
  bossName: string;
  spawnTime: string; // Format: HH:MM:SS
  originalText?: string;
  remainingTimeText?: string; // The raw text detected for remaining time (e.g. "05:00:00")
}

export interface AnalysisResult {
  bosses: BossSpawn[];
  referenceTime: string;
}

export interface ProcessingState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}