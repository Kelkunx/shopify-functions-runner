import { RunService } from './run.service';

describe('RunService', () => {
  let service: RunService;

  beforeEach(() => {
    service = new RunService();
  });

  it('returns a mock success response for a supported function', async () => {
    const response = await service.runFunction({
      wasmFile: {
        originalname: 'discount.wasm',
        size: 16,
        buffer: Buffer.from('wasm'),
      },
      functionType: 'product-discount',
      inputJson: JSON.stringify({
        cart: {
          lines: [{ id: 'gid://shopify/CartLine/1' }],
        },
      }),
    });

    expect(response.success).toBe(true);
    expect(response.errors).toEqual([]);
    expect(response.output).toMatchObject({
      mockRunner: true,
      functionType: 'product-discount',
      discountApplicationStrategy: 'FIRST',
      inputSummary: {
        cartLines: 1,
      },
    });
  });

  it('returns validation errors for invalid requests', async () => {
    const response = await service.runFunction({
      wasmFile: undefined,
      functionType: 'unknown-type',
      inputJson: '{bad json}',
    });

    expect(response.success).toBe(false);
    expect(response.output).toEqual({});
    expect(response.errors).toEqual([
      'A .wasm file is required.',
      'Unsupported function type "unknown-type". Supported types: product-discount, delivery-customization, cart-transform.',
      'Input JSON is invalid.',
    ]);
  });
});
