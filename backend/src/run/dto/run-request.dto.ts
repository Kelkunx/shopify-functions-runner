export const SUPPORTED_FUNCTION_TYPES = [
  'product-discount',
  'delivery-customization',
  'cart-transform',
  'custom',
] as const;

export type SupportedFunctionType = (typeof SUPPORTED_FUNCTION_TYPES)[number];

export class RunRequestDto {
  inputJson = '';
  functionType = '';
  functionDir?: string;
  target?: string;
  exportName?: string;
}
