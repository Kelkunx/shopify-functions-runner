import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import type { Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  SUPPORTED_FUNCTION_TYPES,
  type SupportedFunctionType,
} from './dto/run-request.dto';
import { ShopifyFunctionRunnerService } from './shopify-function-runner.service';
import { type RunResponse } from './types/run-response.type';

interface UploadedWasmFile {
  originalname?: string;
  size?: number;
  buffer?: Buffer;
}

interface RunFunctionParams {
  wasmFile?: UploadedWasmFile;
  inputJson: string;
  functionType?: string;
  functionDir?: string;
  target?: string;
  exportName?: string;
}

@Injectable()
export class RunService {
  constructor(
    private readonly shopifyFunctionRunner: ShopifyFunctionRunnerService,
  ) {}

  async runFunction({
    wasmFile,
    inputJson,
    functionType,
    functionDir,
    target,
    exportName,
  }: RunFunctionParams): Promise<RunResponse> {
    const startTime = process.hrtime.bigint();
    const errors: string[] = [];
    const hasRealRunnerConfig = Boolean(functionDir?.trim() && target?.trim());
    const normalizedFunctionType = this.normalizeFunctionType(functionType);

    if (wasmFile?.originalname && !wasmFile.originalname.endsWith('.wasm')) {
      errors.push('The uploaded file must have a .wasm extension.');
    }

    if (
      (functionDir?.trim() && !target?.trim()) ||
      (!functionDir?.trim() && target?.trim())
    ) {
      errors.push(
        'Both functionDir and target are required to use the real Shopify runner.',
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
      const output = hasRealRunnerConfig
        ? await this.executeShopifyRunner({
            exportName,
            functionDir: functionDir!.trim(),
            parsedInput: parsedInput ?? {},
            target: target!.trim(),
            wasmFile,
          })
        : this.executeMockRunner({
            functionType: normalizedFunctionType,
            requestedFunctionType: functionType?.trim(),
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

  private async executeShopifyRunner({
    exportName,
    functionDir,
    parsedInput,
    target,
    wasmFile,
  }: {
    exportName?: string;
    functionDir: string;
    parsedInput: Record<string, unknown>;
    target: string;
    wasmFile?: UploadedWasmFile;
  }): Promise<Record<string, unknown>> {
    await this.assertDirectoryExists(functionDir);

    const functionInfo =
      await this.shopifyFunctionRunner.getFunctionInfo(functionDir);
    const queryPath = functionInfo.targeting[target]?.inputQueryPath;

    if (!queryPath) {
      throw new Error(
        `Unknown target "${target}" for functionDir "${functionDir}".`,
      );
    }

    const exportToRun = exportName?.trim() || 'run';
    const temporaryWasmPath = await this.writeTemporaryWasmFile(wasmFile);
    const wasmPath = temporaryWasmPath ?? functionInfo.wasmPath;

    try {
      const result = await this.shopifyFunctionRunner.runFunction(
        {
          export: exportToRun,
          input: parsedInput,
          expectedOutput: {},
          target,
        },
        functionInfo.functionRunnerPath,
        wasmPath,
        queryPath,
        functionInfo.schemaPath,
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result.result?.output ?? {};
    } finally {
      if (temporaryWasmPath) {
        await fs.unlink(temporaryWasmPath).catch(() => undefined);
      }
    }
  }

  // This mock remains useful for the UI before a developer wires real Shopify metadata.
  private executeMockRunner({
    functionType,
    requestedFunctionType,
    parsedInput,
    wasmFile,
  }: {
    functionType: SupportedFunctionType;
    requestedFunctionType?: string;
    parsedInput: Record<string, unknown>;
    wasmFile?: UploadedWasmFile;
  }): Record<string, unknown> {
    if (parsedInput.forceError === true) {
      throw new Error('Forced runner error triggered by input.forceError.');
    }

    const baseMetadata = {
      mockRunner: true,
      functionType,
      requestedFunctionType:
        requestedFunctionType && requestedFunctionType !== functionType
          ? requestedFunctionType
          : undefined,
      wasmFileName: wasmFile?.originalname ?? 'mock-runner.wasm',
      wasmSizeBytes: wasmFile?.size ?? wasmFile?.buffer?.length ?? 0,
      usedUploadedWasm: Boolean(wasmFile?.buffer?.length),
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
      case 'custom':
        return {
          ...baseMetadata,
          output: {},
          inputSummary: {
            topLevelKeys: Object.keys(parsedInput).length,
          },
          echo: parsedInput,
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

  private async assertDirectoryExists(functionDir: string): Promise<void> {
    let stat: Stats;

    try {
      stat = await fs.stat(functionDir);
    } catch {
      throw new Error(`functionDir does not exist: ${functionDir}`);
    }

    if (!stat.isDirectory()) {
      throw new Error(`functionDir is not a directory: ${functionDir}`);
    }
  }

  private async writeTemporaryWasmFile(
    wasmFile?: UploadedWasmFile,
  ): Promise<string | null> {
    if (!wasmFile?.buffer?.length) {
      return null;
    }

    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'shopify-function-runner-'),
    );
    const fileName = wasmFile.originalname ?? 'uploaded-function.wasm';
    const temporaryWasmPath = path.join(temporaryDirectory, fileName);

    await fs.writeFile(temporaryWasmPath, wasmFile.buffer);

    return temporaryWasmPath;
  }

  private normalizeFunctionType(functionType?: string): SupportedFunctionType {
    const trimmed = functionType?.trim();

    if (
      trimmed &&
      SUPPORTED_FUNCTION_TYPES.includes(trimmed as SupportedFunctionType)
    ) {
      return trimmed as SupportedFunctionType;
    }

    return 'custom';
  }
}
