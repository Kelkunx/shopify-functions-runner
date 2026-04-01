import { Injectable } from '@nestjs/common';
import {
  SUPPORTED_FUNCTION_TYPES,
  type SupportedFunctionType,
} from './dto/run-request.dto';
import { type RunResponse } from './types/run-response.type';

interface UploadedWasmFile {
  originalname?: string;
  size?: number;
  buffer?: Buffer;
}

interface RunFunctionParams {
  wasmFile?: UploadedWasmFile;
  inputJson: string;
  functionType: string;
}

@Injectable()
export class RunService {
  async runFunction({
    wasmFile,
    inputJson,
    functionType,
  }: RunFunctionParams): Promise<RunResponse> {
    const startTime = process.hrtime.bigint();
    const errors: string[] = [];

    if (!wasmFile?.buffer?.length) {
      errors.push('A .wasm file is required.');
    }

    if (wasmFile?.originalname && !wasmFile.originalname.endsWith('.wasm')) {
      errors.push('The uploaded file must have a .wasm extension.');
    }

    if (
      !SUPPORTED_FUNCTION_TYPES.includes(functionType as SupportedFunctionType)
    ) {
      errors.push(
        `Unsupported function type "${functionType}". Supported types: ${SUPPORTED_FUNCTION_TYPES.join(', ')}.`,
      );
    }

    let parsedInput: Record<string, unknown> | null = null;

    try {
      parsedInput = JSON.parse(inputJson) as Record<string, unknown>;
    } catch {
      errors.push('Input JSON is invalid.');
    }

    if (errors.length > 0) {
      return this.buildResponse(false, {}, startTime, errors);
    }

    try {
      const output = await this.executeMockRunner({
        functionType: functionType as SupportedFunctionType,
        parsedInput: parsedInput ?? {},
        wasmFile,
      });

      return this.buildResponse(true, output, startTime, []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown runner error.';

      return this.buildResponse(false, {}, startTime, [message]);
    }
  }

  // This mock keeps the API stable while the real WASI runtime is added later.
  private async executeMockRunner({
    functionType,
    parsedInput,
    wasmFile,
  }: {
    functionType: SupportedFunctionType;
    parsedInput: Record<string, unknown>;
    wasmFile?: UploadedWasmFile;
  }): Promise<Record<string, unknown>> {
    if (parsedInput.forceError === true) {
      throw new Error('Forced runner error triggered by input.forceError.');
    }

    const baseMetadata = {
      mockRunner: true,
      functionType,
      wasmFileName: wasmFile?.originalname ?? 'unknown.wasm',
      wasmSizeBytes: wasmFile?.size ?? wasmFile?.buffer?.length ?? 0,
    };

    switch (functionType) {
      case 'product-discount':
        return {
          ...baseMetadata,
          discounts: [],
          discountApplicationStrategy: 'FIRST',
          inputSummary: {
            cartLines: this.getNestedArrayLength(parsedInput, 'cart', 'lines'),
          },
        };
      case 'delivery-customization':
        return {
          ...baseMetadata,
          operations: [],
          inputSummary: {
            deliveryGroups: this.getNestedArrayLength(
              parsedInput,
              'cart',
              'deliveryGroups',
            ),
          },
        };
      case 'cart-transform':
        return {
          ...baseMetadata,
          operations: [],
          inputSummary: {
            cartLines: this.getNestedArrayLength(parsedInput, 'cart', 'lines'),
          },
        };
    }
  }

  private buildResponse(
    success: boolean,
    output: Record<string, unknown>,
    startTime: bigint,
    errors: string[],
  ): RunResponse {
    const executionTimeMs =
      Number(process.hrtime.bigint() - startTime) / 1_000_000;

    return {
      success,
      output,
      executionTimeMs: Number(executionTimeMs.toFixed(3)),
      errors,
    };
  }

  private getNestedArrayLength(
    value: Record<string, unknown>,
    parentKey: string,
    childKey: string,
  ): number {
    const parentValue = value[parentKey];

    if (
      !parentValue ||
      typeof parentValue !== 'object' ||
      !Array.isArray((parentValue as Record<string, unknown>)[childKey])
    ) {
      return 0;
    }

    return ((parentValue as Record<string, unknown>)[childKey] as unknown[])
      .length;
  }
}
