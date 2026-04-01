import { type UploadedWasmFile } from './uploaded-wasm-file.type';

export interface RunFunctionParams {
  wasmFile?: UploadedWasmFile;
  inputJson: string;
  functionType?: string;
  functionDir?: string;
  target?: string;
  exportName?: string;
}
