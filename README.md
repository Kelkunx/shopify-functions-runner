# Shopify Functions Workbench

Open-source developer tool for testing Shopify Functions `.wasm` files locally without deploying to Shopify.

The project is organized as a simple monorepo:

- `frontend/`: Next.js UI with Monaco Editor and Tailwind CSS
- `backend/`: NestJS API exposing a local `/run` endpoint

## Goal

The workbench is designed to shorten the Shopify Functions feedback loop:

- upload a `.wasm` file
- paste or edit JSON input locally
- execute through a local backend
- inspect output JSON, execution time, and errors

## Current MVP Status

Implemented:

- monorepo with separate frontend and backend apps
- `POST /run` backend endpoint
- multipart upload support for a `.wasm` file
- JSON input handling
- real Shopify execution path using Shopify CLI metadata and `function-runner`
- function type selection for:
  - `product-discount`
  - `delivery-customization`
  - `cart-transform`
  - `custom`
- frontend single-page runner UI
- Monaco JSON editor
- explicit mock vs Shopify runner modes
- saved local fixtures in the browser
- fixture import/export as JSON for the current runner mode
- result, error, and execution time panels

Current limitation:

- the simple path still falls back to a mock runner when Shopify metadata is not provided
- real Shopify execution requires a local function directory and target metadata
- because the runner is mocked, testing without a real `.wasm` file is supported

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS, Monaco Editor
- Backend: NestJS, TypeScript
- Runtime target: local WASI-compatible execution

## Project Structure

```text
Shopify-Functions-Workbench/
├── backend/
│   ├── src/
│   └── test/
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
└── README.md
```

## API Contract

### `POST /run`

Request uses `multipart/form-data`:

- `wasm`: uploaded `.wasm` file
- `inputJson`: JSON payload as string
- `functionType`: string
- `functionType` is assistive and can fall back to `custom` in mock mode
- `functionDir` (optional): local Shopify function directory
- `target` (optional): Shopify target key
- `exportName` (optional): function export name, defaults to `run`

Response:

```json
{
  "success": true,
  "output": {},
  "executionTimeMs": 0.42,
  "errors": [],
  "timings": {
    "parseMs": 0.02,
    "executionMs": 0.4,
    "totalMs": 0.42
  }
}
```

## Local Setup

Requirements:

- Node.js 20+
- npm
- Shopify CLI if you want to use the real Shopify runner path

Install everything from the monorepo root:

```bash
npm install
```

## Run Locally

Start frontend and backend together:

```bash
npm run dev
```

This starts:

- frontend on `http://localhost:3000`
- backend on `http://localhost:3001`

For a lighter development mode with lower memory pressure:

```bash
npm run dev:light
```

You can also run each app separately:

```bash
npm run dev:frontend
npm run dev:backend
npm run dev:frontend:light
npm run dev:backend:light
```

Open `http://localhost:3000` in the browser.

The frontend calls the backend using:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

If not set, it defaults to `http://localhost:3001`.

## Runner Modes

### Mock mode

Used when only JSON, templates, and an optional `.wasm` file are provided.

- fast local feedback
- no Shopify CLI metadata required
- useful for UI and payload iteration
- unknown or omitted function types fall back to `custom`

### Real Shopify mode

Used when `functionDir` and `target` are provided.

- backend resolves `functionRunnerPath`, `schemaPath`, `wasmPath`, and targeting via Shopify CLI
- backend invokes Shopify's official `function-runner`
- an uploaded `.wasm` file overrides the built Wasm for that single run

## Fixtures

- the UI can save named fixtures to browser local storage
- a fixture stores the current runner mode, function type, JSON input, and Shopify runner fields
- fixtures can be exported as JSON and re-imported on another machine or browser
- legacy fixture storage from the old project name is migrated automatically in the browser
- fixtures are intended for fast local iteration, not source-controlled test cases

## Development Commands

From the repository root:

```bash
npm run dev
npm run dev:light
npm run dev:frontend
npm run dev:backend
npm run dev:frontend:light
npm run dev:backend:light
npm run build
npm run lint
npm run test
```

More granular commands:

```bash
npm run build:frontend
npm run build:backend
npm run benchmark:shopify -- --help
npm run lint:frontend
npm run lint:backend
npm run test:backend
npm run test:e2e
```

## Verification

Equivalent app-level commands still work inside `frontend/` and `backend/`, but the root scripts are intended to be the default entry point.

Backend:

```bash
cd backend
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

## Next Steps

- make the real Shopify runner the primary path and reduce reliance on mock mode
- add Shopify Function templates per target, not just per simplified function type
- improve backend validation for malformed Shopify payloads
- add frontend tests for fixture workflows and runner state transitions

## Performance Notes

- `npm run dev` uses webpack on the frontend instead of Turbopack to avoid the process explosion seen in this environment
- `npm run dev:light` disables frontend dev source maps and server fast refresh to reduce CPU and memory usage further
- the backend dev server uses Nest watch mode with the `swc` builder, which is lighter than the default TypeScript watch path
- real Shopify runs now return detailed local phase timings such as parse, execution, `functionInfo`, and `functionRunner`
- those timings are useful for comparing local runs, but they are not Shopify production timings and should not be treated as acceptance thresholds
- you can benchmark the backend without the browser using:

```bash
npm run benchmark:shopify -- \
  --function-dir /abs/path/to/function \
  --target cart.lines.discounts.generate.run \
  --input-file /abs/path/to/input.json \
  --export-name run \
  --warmup 1 \
  --iterations 5
```
