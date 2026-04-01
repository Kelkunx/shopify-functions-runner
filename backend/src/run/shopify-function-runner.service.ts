import { Injectable } from '@nestjs/common';

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
  targeting: Record<string, { inputQueryPath?: string }>;
}

@Injectable()
export class ShopifyFunctionRunnerService {
  async getFunctionInfo(functionDir: string): Promise<ShopifyFunctionInfo> {
    const helpers = await import('@shopify/shopify-function-test-helpers');

    return helpers.getFunctionInfo(functionDir) as Promise<ShopifyFunctionInfo>;
  }

  async runFunction(
    fixture: FixtureData,
    functionRunnerPath: string,
    wasmPath: string,
    queryPath: string,
    schemaPath: string,
  ): Promise<RunFunctionResult> {
    const helpers = await import('@shopify/shopify-function-test-helpers');

    return helpers.runFunction(
      fixture,
      functionRunnerPath,
      wasmPath,
      queryPath,
      schemaPath,
    ) as Promise<RunFunctionResult>;
  }
}
