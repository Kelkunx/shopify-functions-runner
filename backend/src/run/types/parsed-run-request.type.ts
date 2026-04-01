import { type SupportedFunctionType } from '../dto/run-request.dto';
import { type UploadedWasmFile } from './uploaded-wasm-file.type';

export interface ParsedRunRequest {
  hasRealRunnerConfig: boolean;
  normalizedFunctionType: SupportedFunctionType;
  parsedInput: Record<string, unknown>;
  requestedFunctionType?: string;
  trimmedExportName?: string;
  trimmedFunctionDir?: string;
  trimmedTarget?: string;
  wasmFile?: UploadedWasmFile;
}
