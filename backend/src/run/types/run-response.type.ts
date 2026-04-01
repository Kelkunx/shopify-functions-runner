export interface RunResponse {
  success: boolean;
  output: Record<string, unknown>;
  executionTimeMs: number;
  errors: string[];
}
