import { Injectable } from '@nestjs/common';
import {
  SUPPORTED_FUNCTION_TYPES,
  type SupportedFunctionType,
} from './dto/run-request.dto';
import { type ParsedRunRequest } from './types/parsed-run-request.type';
import { type RunFunctionParams } from './types/run-function-params.type';

interface ParsedRunRequestResult {
  errors: string[];
  parsedRequest: ParsedRunRequest | null;
}

@Injectable()
export class RunRequestParserService {
  parse({
    exportName,
    functionDir,
    functionType,
    inputJson,
    target,
    wasmFile,
  }: RunFunctionParams): ParsedRunRequestResult {
    const errors: string[] = [];
    const trimmedFunctionDir = functionDir?.trim();
    const trimmedTarget = target?.trim();
    const trimmedExportName = exportName?.trim();
    const requestedFunctionType = functionType?.trim();
    const hasRealRunnerConfig = Boolean(trimmedFunctionDir && trimmedTarget);

    if (wasmFile?.originalname && !wasmFile.originalname.endsWith('.wasm')) {
      errors.push('The uploaded file must have a .wasm extension.');
    }

    if (
      (trimmedFunctionDir && !trimmedTarget) ||
      (!trimmedFunctionDir && trimmedTarget)
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

    if (errors.length > 0 || !parsedInput) {
      return {
        errors,
        parsedRequest: null,
      };
    }

    return {
      errors: [],
      parsedRequest: {
        hasRealRunnerConfig,
        normalizedFunctionType: this.normalizeFunctionType(requestedFunctionType),
        parsedInput,
        requestedFunctionType,
        trimmedExportName,
        trimmedFunctionDir,
        trimmedTarget,
        wasmFile,
      },
    };
  }

  private normalizeFunctionType(
    functionType?: string,
  ): SupportedFunctionType {
    if (
      functionType &&
      SUPPORTED_FUNCTION_TYPES.includes(functionType as SupportedFunctionType)
    ) {
      return functionType as SupportedFunctionType;
    }

    return 'custom';
  }
}
