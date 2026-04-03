import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import type { Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MockFunctionRunnerService } from './mock-function-runner.service';
import { RunRequestParserService } from './run-request-parser.service';
import { ShopifyFunctionRunnerService } from './shopify-function-runner.service';
import { type RunFunctionParams } from './types/run-function-params.type';
import {
  type RunTimings,
  type ShopifyRunPhaseTimings,
} from './types/run-response.type';
import { type RunResponse } from './types/run-response.type';
import { type UploadedWasmFile } from './types/uploaded-wasm-file.type';

interface TemporaryWasmArtifact {
  directoryPath: string;
  wasmPath: string;
}

interface ShopifyExecutionResult {
  output: Record<string, unknown>;
  shopifyPhases: ShopifyRunPhaseTimings;
}

@Injectable()
export class RunService {
  private readonly directoryCheckCache = new Map<string, Promise<void>>();

  constructor(
    private readonly mockFunctionRunner: MockFunctionRunnerService,
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
    const parseStartTime = process.hrtime.bigint();
    const { errors, parsedRequest } = this.runRequestParser.parse({
      exportName,
      functionDir,
      functionType,
      inputJson,
      target,
      wasmFile,
    });
    const parseMs = this.measureElapsedMs(parseStartTime);

    if (errors.length > 0 || !parsedRequest) {
      return this.buildResponse(false, {}, startTime, errors, {
        executionMs: 0,
        parseMs,
        totalMs: this.measureElapsedMs(startTime),
      });
    }

    try {
      let output: Record<string, unknown>;
      let shopifyPhases: ShopifyRunPhaseTimings | undefined;
      const executionStartTime = process.hrtime.bigint();

      if (parsedRequest.hasRealRunnerConfig) {
        const shopifyResult = await this.executeShopifyRunner({
            exportName: parsedRequest.trimmedExportName,
            functionDir: parsedRequest.trimmedFunctionDir!,
            parsedInput: parsedRequest.parsedInput,
            target: parsedRequest.trimmedTarget!,
            wasmFile: parsedRequest.wasmFile,
          });

        output = shopifyResult.output;
        shopifyPhases = shopifyResult.shopifyPhases;
      } else {
        output = this.mockFunctionRunner.run({
            functionType: parsedRequest.normalizedFunctionType,
            requestedFunctionType: parsedRequest.requestedFunctionType,
            parsedInput: parsedRequest.parsedInput,
            wasmFile: parsedRequest.wasmFile,
          });
      }

      const executionMs = this.measureElapsedMs(executionStartTime);

      return this.buildResponse(true, output, startTime, [], {
        executionMs,
        parseMs,
        shopifyPhases,
        totalMs: this.measureElapsedMs(startTime),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown runner error.';

      return this.buildResponse(false, {}, startTime, [message], {
        executionMs: this.measureElapsedMs(startTime) - parseMs,
        parseMs,
        totalMs: this.measureElapsedMs(startTime),
      });
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
  }): Promise<ShopifyExecutionResult> {
    const directoryCheckStartTime = process.hrtime.bigint();
    await this.assertDirectoryExists(functionDir);
    const directoryCheckMs = this.measureElapsedMs(directoryCheckStartTime);

    const functionInfoStartTime = process.hrtime.bigint();
    const functionInfo =
      await this.shopifyFunctionRunner.getFunctionInfo(functionDir);
    const functionInfoMs = this.measureElapsedMs(functionInfoStartTime);
    const targetConfig = functionInfo.targeting[target];
    const queryPath = targetConfig?.inputQueryPath;

    if (!queryPath) {
      throw new Error(
        `Unknown target "${target}" for functionDir "${functionDir}".`,
      );
    }

    const exportToRun = this.resolveExportName(exportName, targetConfig?.export);
    const wasmPreparationStartTime = process.hrtime.bigint();
    const temporaryWasmArtifact = await this.writeTemporaryWasmFile(wasmFile);
    const wasmPreparationMs = this.measureElapsedMs(wasmPreparationStartTime);
    const wasmPath = temporaryWasmArtifact?.wasmPath ?? functionInfo.wasmPath;
    let cleanupMs = 0;
    let output: Record<string, unknown> = {};
    let functionRunnerMs = 0;

    try {
      const functionRunnerStartTime = process.hrtime.bigint();
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
      functionRunnerMs = this.measureElapsedMs(functionRunnerStartTime);

      if (result.error) {
        throw new Error(result.error);
      }

      output = result.result?.output ?? {};
    } finally {
      if (temporaryWasmArtifact) {
        const cleanupStartTime = process.hrtime.bigint();
        await fs
          .rm(temporaryWasmArtifact.directoryPath, {
            force: true,
            recursive: true,
          })
          .catch(() => undefined);
        cleanupMs = this.measureElapsedMs(cleanupStartTime);
      }
    }

    return {
      output,
      shopifyPhases: {
        cleanupMs,
        directoryCheckMs,
        functionInfoMs,
        functionRunnerMs,
        wasmPreparationMs,
      },
    };
  }

  private resolveExportName(
    exportName: string | undefined,
    targetExportName: string | undefined,
  ): string {
    const trimmedExportName = exportName?.trim();

    if (!targetExportName) {
      return trimmedExportName || 'run';
    }

    if (
      !trimmedExportName ||
      trimmedExportName === 'run' ||
      trimmedExportName === `run${targetExportName}`
    ) {
      return targetExportName;
    }

    return trimmedExportName;
  }

  private buildResponse(
    success: boolean,
    output: Record<string, unknown>,
    startTime: bigint,
    errors: string[],
    timings: RunTimings,
  ): RunResponse {
    const executionTimeMs = timings.totalMs;

    return {
      success,
      output,
      executionTimeMs: Number(executionTimeMs.toFixed(3)),
      errors,
      timings: {
        ...timings,
        executionMs: Number(timings.executionMs.toFixed(3)),
        parseMs: Number(timings.parseMs.toFixed(3)),
        shopifyPhases: timings.shopifyPhases
          ? {
              cleanupMs: Number(timings.shopifyPhases.cleanupMs.toFixed(3)),
              directoryCheckMs: Number(
                timings.shopifyPhases.directoryCheckMs.toFixed(3),
              ),
              functionInfoMs: Number(
                timings.shopifyPhases.functionInfoMs.toFixed(3),
              ),
              functionRunnerMs: Number(
                timings.shopifyPhases.functionRunnerMs.toFixed(3),
              ),
              wasmPreparationMs: Number(
                timings.shopifyPhases.wasmPreparationMs.toFixed(3),
              ),
            }
          : undefined,
        totalMs: Number(timings.totalMs.toFixed(3)),
      },
    };
  }

  private measureElapsedMs(startTime: bigint): number {
    return Number(process.hrtime.bigint() - startTime) / 1_000_000;
  }

  private async assertDirectoryExists(functionDir: string): Promise<void> {
    const cachedDirectoryCheck = this.directoryCheckCache.get(functionDir);

    if (cachedDirectoryCheck) {
      return cachedDirectoryCheck;
    }

    const directoryCheckPromise = this.validateDirectory(functionDir).catch(
      (error) => {
        this.directoryCheckCache.delete(functionDir);
        throw error;
      },
    );

    this.directoryCheckCache.set(functionDir, directoryCheckPromise);

    return directoryCheckPromise;
  }

  private async validateDirectory(functionDir: string): Promise<void> {
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
