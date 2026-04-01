import {
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const SUPPORTED_FUNCTION_TYPES = [
  'product-discount',
  'delivery-customization',
  'cart-transform',
  'custom',
] as const;

export type SupportedFunctionType = (typeof SUPPORTED_FUNCTION_TYPES)[number];

export class RunRequestDto {
  @IsString()
  @MinLength(1)
  inputJson = '';

  @IsOptional()
  @IsString()
  functionType = '';

  @ValidateIf(
    (value: RunRequestDto) =>
      value.functionDir !== undefined || value.target !== undefined,
  )
  @IsString()
  @MinLength(1)
  functionDir?: string;

  @ValidateIf(
    (value: RunRequestDto) =>
      value.functionDir !== undefined || value.target !== undefined,
  )
  @IsString()
  @MinLength(1)
  target?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  exportName?: string;
}
