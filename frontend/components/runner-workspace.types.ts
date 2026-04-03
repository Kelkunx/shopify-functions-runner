import type { FunctionType } from "@/lib/function-templates";
import type { RunnerMode } from "@/lib/saved-fixtures";

export interface RunResponse {
  success: boolean;
  output: Record<string, unknown>;
  executionTimeMs: number;
  errors: string[];
  timings: {
    executionMs: number;
    parseMs: number;
    totalMs: number;
    shopifyPhases?: {
      cleanupMs: number;
      directoryCheckMs: number;
      functionInfoMs: number;
      functionRunnerMs: number;
      wasmPreparationMs: number;
    };
  };
}

export interface RunnerFormState {
  exportName: string;
  fixtureName: string;
  functionDir: string;
  functionType: FunctionType;
  inputJson: string;
  runnerMode: RunnerMode;
  selectedTemplateId: string;
  target: string;
  wasmFile: File | null;
}
