import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import type { Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type SupportedFunctionType } from './dto/run-request.dto';
import { RunRequestParserService } from './run-request-parser.service';
import { ShopifyFunctionRunnerService } from './shopify-function-runner.service';
import { type RunFunctionParams } from './types/run-function-params.type';
import { type RunResponse } from './types/run-response.type';
import { type UploadedWasmFile } from './types/uploaded-wasm-file.type';

interface TemporaryWasmArtifact {
  directoryPath: string;
  wasmPath: string;
}

@Injectable()
export class RunService {
  constructor(
    private readonly runRequestParser: RunRequestParserService,
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
    const { errors, parsedRequest } = this.runRequestParser.parse({
      exportName,
      functionDir,
      functionType,
      inputJson,
      target,
      wasmFile,
    });

    if (errors.length > 0 || !parsedRequest) {
      return this.buildResponse(false, {}, startTime, errors);
    }

    try {
      const output = parsedRequest.hasRealRunnerConfig
        ? await this.executeShopifyRunner({
            exportName: parsedRequest.trimmedExportName,
            functionDir: parsedRequest.trimmedFunctionDir!,
            parsedInput: parsedRequest.parsedInput,
            target: parsedRequest.trimmedTarget!,
            wasmFile: parsedRequest.wasmFile,
          })
        : this.executeMockRunner({
            functionType: parsedRequest.normalizedFunctionType,
            requestedFunctionType: parsedRequest.requestedFunctionType,
            parsedInput: parsedRequest.parsedInput,
            wasmFile: parsedRequest.wasmFile,
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
    const temporaryWasmArtifact = await this.writeTemporaryWasmFile(wasmFile);
    const wasmPath = temporaryWasmArtifact?.wasmPath ?? functionInfo.wasmPath;

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
      if (temporaryWasmArtifact) {
        await fs
          .rm(temporaryWasmArtifact.directoryPath, {
            force: true,
            recursive: true,
          })
          .catch(() => undefined);
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
  ): Promise<TemporaryWasmArtifact | null> {
    if (!wasmFile?.buffer?.length) {
      return null;
    }

    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'shopify-function-runner-'),
    );
    const fileName = wasmFile.originalname ?? 'uploaded-function.wasm';
    const temporaryWasmPath = path.join(temporaryDirectory, fileName);

    await fs.writeFile(temporaryWasmPath, wasmFile.buffer);

    return {
      directoryPath: temporaryDirectory,
      wasmPath: temporaryWasmPath,
    };
  }
}
