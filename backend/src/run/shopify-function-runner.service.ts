import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

interface FixtureData {
  export: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  target: string;
}

interface RunFunctionResult {
  result: {
    output: Record<string, unknown>;
  } | null;
  error: string | null;
}

export interface ShopifyFunctionInfo {
  schemaPath: string;
  functionRunnerPath: string;
  wasmPath: string;
  targeting: Record<string, { inputQueryPath?: string; export?: string }>;
}

interface ShopifyFunctionTestHelpersModule {
  getFunctionInfo: (functionDir: string) => Promise<ShopifyFunctionInfo>;
}

@Injectable()
export class ShopifyFunctionRunnerService {
  private readonly functionInfoCache = new Map<
    string,
    Promise<ShopifyFunctionInfo>
  >();
  private helpersModulePromise: Promise<ShopifyFunctionTestHelpersModule> | null =
    null;
  private shopifyRunQueue: Promise<void> = Promise.resolve();
  private readonly dynamicImport = new Function(
    'specifier',
    'return import(specifier)',
  ) as (specifier: string) => Promise<ShopifyFunctionTestHelpersModule>;

  async getFunctionInfo(functionDir: string): Promise<ShopifyFunctionInfo> {
    const resolvedFunctionDir = path.resolve(functionDir);
    const cachedFunctionInfo = this.functionInfoCache.get(resolvedFunctionDir);

    if (cachedFunctionInfo) {
      return cachedFunctionInfo;
    }

    const functionInfoPromise = this.loadHelpersModule()
      .then((helpers) => helpers.getFunctionInfo(resolvedFunctionDir))
      .catch((error) => {
        this.functionInfoCache.delete(resolvedFunctionDir);
        throw error;
      });

    this.functionInfoCache.set(resolvedFunctionDir, functionInfoPromise);

    return functionInfoPromise;
  }

  async runFunction(
    fixture: FixtureData,
    functionRunnerPath: string,
    wasmPath: string,
    queryPath: string,
    schemaPath: string,
  ): Promise<RunFunctionResult> {
    return this.runFunctionExclusively(async () => {
      await this.prepareRunnerSlot();

      return new Promise<RunFunctionResult>((resolve) => {
        const runnerProcess = spawn(
          functionRunnerPath,
          [
            '-f',
            wasmPath,
            '--export',
            fixture.export,
            '--query-path',
            queryPath,
            '--schema-path',
            schemaPath,
            '--json',
          ],
          {
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        let stdout = '';
        let stderr = '';

        runnerProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        runnerProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        runnerProcess.on('error', (error) => {
          resolve({
            result: null,
            error: `function-runner failed to start: ${error.message}`,
          });
        });

        runnerProcess.on('close', (code) => {
          if (code !== 0) {
            resolve({
              result: null,
              error: `function-runner failed with exit code ${code}: ${stderr}`,
            });
            return;
          }

          try {
            const parsedOutput = JSON.parse(stdout) as {
              output?: Record<string, unknown>;
            };

            if (!parsedOutput.output) {
              resolve({
                result: null,
                error:
                  "function-runner returned unexpected format - missing 'output' field.",
              });
              return;
            }

            resolve({
              result: {
                output: parsedOutput.output,
              },
              error: null,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            resolve({
              result: null,
              error: `Failed to parse function-runner output: ${errorMessage}`,
            });
          }
        });

        runnerProcess.stdin.write(JSON.stringify(fixture.input));
        runnerProcess.stdin.end();
      });
    });
  }

  private loadHelpersModule(): Promise<ShopifyFunctionTestHelpersModule> {
    this.helpersModulePromise ??= this.dynamicImport(
      this.getHelpersModuleFileUrl().href,
    );

    return this.helpersModulePromise;
  }

  private async prepareRunnerSlot(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  private async runFunctionExclusively<T>(
    task: () => Promise<T>,
  ): Promise<T> {
    const previousRun = this.shopifyRunQueue;
    let releaseCurrentRun!: () => void;

    this.shopifyRunQueue = new Promise<void>((resolve) => {
      releaseCurrentRun = resolve;
    });

    await previousRun;

    try {
      return await task();
    } finally {
      releaseCurrentRun();
    }
  }

  private getHelpersModuleFileUrl(): URL {
    const currentDirectory = __dirname;
    const relativeSegments = [
      [
        'node_modules',
        '@shopify',
        'shopify-function-test-helpers',
        'dist',
        'wasm-testing-helpers.js',
      ],
      [
        '..',
        'node_modules',
        '@shopify',
        'shopify-function-test-helpers',
        'dist',
        'wasm-testing-helpers.js',
      ],
      [
        '..',
        '..',
        'node_modules',
        '@shopify',
        'shopify-function-test-helpers',
        'dist',
        'wasm-testing-helpers.js',
      ],
      [
        '..',
        '..',
        '..',
        'node_modules',
        '@shopify',
        'shopify-function-test-helpers',
        'dist',
        'wasm-testing-helpers.js',
      ],
    ];

    for (const segments of relativeSegments) {
      const candidatePath = path.resolve(currentDirectory, ...segments);

      if (existsSync(candidatePath)) {
        return pathToFileURL(candidatePath);
      }
    }

    throw new Error(
      'Unable to locate @shopify/shopify-function-test-helpers in node_modules.',
    );
  }
}
