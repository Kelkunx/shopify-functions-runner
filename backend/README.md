# Backend

NestJS API for the Shopify Functions Local Runner.

## Purpose

The backend exposes a local `POST /run` endpoint used by the frontend to:

- receive a `.wasm` file
- receive JSON input
- receive the selected Shopify function type
- optionally receive a local Shopify function directory and target
- execute the function locally
- return output, timing, and errors

The backend now supports two paths:

- mock mode for quick local DX without Shopify metadata
- real Shopify mode using Shopify CLI metadata plus the official `function-runner`

In mock mode, `functionType` is assistive only and can fall back to `custom`.

## Main Files

- `src/main.ts`: Nest bootstrap and CORS setup
- `src/app.module.ts`: root application module
- `src/run/run.module.ts`: run feature module
- `src/run/run.controller.ts`: `POST /run` endpoint
- `src/run/run.service.ts`: request validation, timing, mock execution, and real Shopify execution
- `src/run/shopify-function-runner.service.ts`: adapter around `@shopify/shopify-function-test-helpers`

## Scripts

From `backend/`:

```bash
npm run start:dev
npm run start:dev:light
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Notes

- `start:dev` uses Nest watch mode with the `swc` builder
- `start:dev:light` keeps the same path with slightly quieter output for lighter local use
- mock mode still supports requests without a real `.wasm` file to simplify local UI testing
- real Shopify mode requires Shopify CLI plus a valid local function directory and target
