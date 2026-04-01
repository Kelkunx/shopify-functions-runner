# Frontend

Next.js interface for Shopify Functions Workbench.

## Purpose

The frontend provides the workbench UI to:

- choose a Shopify function type
- load a JSON input template
- edit JSON with Monaco Editor
- optionally upload a `.wasm` file
- optionally provide a Shopify function directory and target for real execution
- save and reload local fixtures in the browser
- call the local backend runner
- inspect output, errors, and execution time

## Main Files

- `app/page.tsx`: page entry point
- `components/runner-workspace.tsx`: main three-panel UI
- `components/json-editor.tsx`: Monaco wrapper
- `lib/function-templates.ts`: supported function types and sample payloads
- `lib/saved-fixtures.ts`: browser-local fixture persistence helpers

## Scripts

From `frontend/`:

```bash
npm run dev
npm run dev:light
npm run dev:turbo
npm run build
npm run lint
```

## Notes

- `dev` runs Next.js in webpack mode because it behaved more predictably than Turbopack in this environment
- `dev:light` disables source maps and server fast refresh to reduce local resource usage
- the frontend defaults to `http://localhost:3001` for the backend API unless `NEXT_PUBLIC_API_BASE_URL` is set
- if `functionDir` and `target` are provided in the UI, the backend switches from mock mode to the real Shopify runner path
- if no recognized function type is provided, mock mode falls back to `custom`
