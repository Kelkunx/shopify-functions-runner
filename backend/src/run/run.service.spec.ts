import { RunService } from './run.service';
import { ShopifyFunctionRunnerService } from './shopify-function-runner.service';

describe('RunService', () => {
  let getFunctionInfoMock: jest.Mock;
  let runFunctionMock: jest.Mock;
  let shopifyRunner: jest.Mocked<ShopifyFunctionRunnerService>;
  let service: RunService;

  beforeEach(() => {
    getFunctionInfoMock = jest.fn();
    runFunctionMock = jest.fn();

    shopifyRunner = {
      getFunctionInfo: getFunctionInfoMock,
      runFunction: runFunctionMock,
    } as unknown as jest.Mocked<ShopifyFunctionRunnerService>;

    service = new RunService(shopifyRunner);
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
      'Unsupported function type "unknown-type". Supported types: product-discount, delivery-customization, cart-transform.',
      'Input JSON is invalid.',
    ]);
  });

  it('allows running without an uploaded wasm while the runner is mocked', async () => {
    const response = await service.runFunction({
      wasmFile: undefined,
      functionType: 'cart-transform',
      inputJson: JSON.stringify({
        cart: {
          lines: [],
        },
      }),
    });

    expect(response.success).toBe(true);
    expect(response.errors).toEqual([]);
    expect(response.output).toMatchObject({
      mockRunner: true,
      functionType: 'cart-transform',
      wasmFileName: 'mock-runner.wasm',
      usedUploadedWasm: false,
    });
  });

  it('uses the real Shopify runner when functionDir and target are provided', async () => {
    getFunctionInfoMock.mockResolvedValue({
      functionRunnerPath: '/tmp/function-runner',
      schemaPath: '/tmp/schema.graphql',
      targeting: {
        'purchase.product-discount.run': {
          inputQueryPath: '/tmp/input.graphql',
        },
      },
      wasmPath: '/tmp/function.wasm',
    });

    runFunctionMock.mockResolvedValue({
      error: null,
      result: {
        output: {
          discounts: [],
        },
      },
    });

    const response = await service.runFunction({
      functionDir: __dirname,
      functionType: 'anything-goes-here',
      inputJson: JSON.stringify({ cart: { lines: [] } }),
      target: 'purchase.product-discount.run',
    });

    expect(response.success).toBe(true);
    expect(response.errors).toEqual([]);
    expect(response.output).toEqual({
      discounts: [],
    });
    expect(getFunctionInfoMock).toHaveBeenCalledWith(__dirname);
    expect(runFunctionMock).toHaveBeenCalledWith(
      {
        export: 'run',
        expectedOutput: {},
        input: { cart: { lines: [] } },
        target: 'purchase.product-discount.run',
      },
      '/tmp/function-runner',
      '/tmp/function.wasm',
      '/tmp/input.graphql',
      '/tmp/schema.graphql',
    );
  });
});
