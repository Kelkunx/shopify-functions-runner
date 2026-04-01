# Shopify Functions Local Runner

Local developer tool for testing Shopify Functions `.wasm` files without deploying to Shopify.

The project is organized as a simple monorepo:

- `frontend/`: Next.js UI with Monaco Editor and Tailwind CSS
- `backend/`: NestJS API exposing a local `/run` endpoint

## Goal

The runner is designed to shorten the Shopify Functions feedback loop:

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
- function type selection for:
  - `product-discount`
  - `delivery-customization`
  - `cart-transform`
- frontend single-page runner UI
- Monaco JSON editor
- result, error, and execution time panels

Current limitation:

- the backend execution layer is still mocked
- the API contract is stable, but real WASI execution is the next step

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS, Monaco Editor
- Backend: NestJS, TypeScript
- Runtime target: local WASI-compatible execution

## Project Structure

```text
shopify-functions-runner/
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

Response:

```json
{
  "success": true,
  "output": {},
  "executionTimeMs": 0.42,
  "errors": []
}
```

## Local Setup

Requirements:

- Node.js 20+
- npm

Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Run Locally

Start the backend on `http://localhost:3001`:

```bash
cd backend
npm run start:dev
```

Start the frontend on `http://localhost:3000`:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in the browser.

The frontend calls the backend using:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

If not set, it defaults to `http://localhost:3001`.

## Verification

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

- replace the mock runner with real WASI execution
- add Shopify Function input templates per function type
- improve backend validation for malformed Shopify payloads
- support loading and saving local test fixtures

