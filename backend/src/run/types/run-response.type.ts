export interface ShopifyRunPhaseTimings {
  cleanupMs: number;
  directoryCheckMs: number;
  functionInfoMs: number;
  functionRunnerMs: number;
  wasmPreparationMs: number;
}

export interface RunTimings {
  executionMs: number;
  parseMs: number;
  totalMs: number;
  shopifyPhases?: ShopifyRunPhaseTimings;
}

export interface RunResponse {
  success: boolean;
  output: Record<string, unknown>;
  executionTimeMs: number;
  errors: string[];
  timings: RunTimings;
}
