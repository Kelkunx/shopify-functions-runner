import { promises as fs } from 'node:fs';
import { RunService } from './run.service';
import { ShopifyFunctionRunnerService } from './shopify-function-runner.service';

describe('RunService', () => {
  let getFunctionInfoMock: jest.Mock;
  let runFunctionMock: jest.Mock;
  let shopifyRunner: jest.Mocked<ShopifyFunctionRunnerService>;
  let service: RunService;

  beforeEach(() => {
    jest.restoreAllMocks();
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
    expect(response.errors).toEqual(['Input JSON is invalid.']);
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

  it('falls back to custom mock mode for unknown function types', async () => {
    const response = await service.runFunction({
      functionType: 'my-own-function-type',
      inputJson: JSON.stringify({
        anything: true,
      }),
    });

    expect(response.success).toBe(true);
    expect(response.errors).toEqual([]);
    expect(response.output).toMatchObject({
      mockRunner: true,
      functionType: 'custom',
      requestedFunctionType: 'my-own-function-type',
      inputSummary: {
        topLevelKeys: 1,
      },
      echo: {
        anything: true,
      },
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

  it('cleans up temporary wasm directories after real runner execution', async () => {
    jest.spyOn(fs, 'mkdtemp').mockResolvedValue('/tmp/uploaded-function-dir');
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    const removeDirectorySpy = jest
      .spyOn(fs, 'rm')
      .mockResolvedValue(undefined);

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

    await service.runFunction({
      functionDir: __dirname,
      inputJson: JSON.stringify({ cart: { lines: [] } }),
      target: 'purchase.product-discount.run',
      wasmFile: {
        buffer: Buffer.from('wasm'),
        originalname: 'uploaded.wasm',
      },
    });

    expect(runFunctionMock).toHaveBeenCalledWith(
      expect.any(Object),
      '/tmp/function-runner',
      '/tmp/uploaded-function-dir/uploaded.wasm',
      '/tmp/input.graphql',
      '/tmp/schema.graphql',
    );
    expect(removeDirectorySpy).toHaveBeenCalledWith(
      '/tmp/uploaded-function-dir',
      {
        force: true,
        recursive: true,
      },
    );
  });
});
