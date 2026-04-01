"use client";

import { useState } from "react";
import {
  formatTemplateInput,
  functionTypes,
  getTemplatesForType,
  type FunctionType,
} from "@/lib/function-templates";
import { JsonEditor } from "./json-editor";

interface RunResponse {
  success: boolean;
  output: Record<string, unknown>;
  executionTimeMs: number;
  errors: string[];
}

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const initialFunctionType: FunctionType = "product-discount";
const initialTemplate = getTemplatesForType(initialFunctionType)[0]!;

export function RunnerWorkspace() {
  const [functionType, setFunctionType] =
    useState<FunctionType>(initialFunctionType);
  const [inputJson, setInputJson] = useState(
    formatTemplateInput(initialTemplate.input),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplate.id);
  const [wasmFile, setWasmFile] = useState<File | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [response, setResponse] = useState<RunResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const templates = getTemplatesForType(functionType);

  const selectedFunctionLabel =
    functionTypes.find((option) => option.value === functionType)?.label ??
    functionType;

  async function handleRun() {
    if (!wasmFile) {
      setRequestError("Select a .wasm file before running the function.");
      setResponse(null);
      return;
    }

    setIsRunning(true);
    setRequestError(null);

    const formData = new FormData();
    formData.append("wasm", wasmFile);
    formData.append("inputJson", inputJson);
    formData.append("functionType", functionType);

    try {
      const runResponse = await fetch(`${apiBaseUrl}/run`, {
        method: "POST",
        body: formData,
      });

      const payload = (await runResponse.json()) as RunResponse;
      setResponse(payload);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The runner API could not be reached.";

      setResponse(null);
      setRequestError(message);
    } finally {
      setIsRunning(false);
    }
  }

  function handleFunctionTypeChange(nextType: FunctionType) {
    const nextTemplates = getTemplatesForType(nextType);
    const nextTemplate = nextTemplates[0];

    if (!nextTemplate) {
      return;
    }

    setFunctionType(nextType);
    setSelectedTemplateId(nextTemplate.id);
    setInputJson(formatTemplateInput(nextTemplate.input));
    setResponse(null);
    setRequestError(null);
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((entry) => entry.id === templateId);

    if (!template) {
      return;
    }

    setSelectedTemplateId(template.id);
    setInputJson(formatTemplateInput(template.input));
    setResponse(null);
    setRequestError(null);
  }

  const outputJson = response ? JSON.stringify(response.output, null, 2) : "{}";

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-5 py-5 lg:px-8 lg:py-8">
      <div className="grid flex-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="flex flex-col gap-4 rounded-[10px] border border-border bg-surface px-4 py-4">
          <div className="space-y-1 border-b border-border pb-4">
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
              Shopify Functions Local Runner
            </h1>
            <p className="text-sm leading-6 text-muted">
              Upload a function binary, send GraphQL-shaped JSON input, and inspect
              the local result without deploying.
            </p>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Wasm file</span>
            <input
              type="file"
              accept=".wasm,application/wasm"
              onChange={(event) => {
                setWasmFile(event.target.files?.[0] ?? null);
                setRequestError(null);
              }}
              className="block w-full rounded-[8px] border border-border bg-surface-strong px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-[6px] file:border-0 file:bg-stone-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-50"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Function type</span>
            <select
              value={functionType}
              onChange={(event) =>
                handleFunctionTypeChange(event.target.value as FunctionType)
              }
              className="w-full rounded-[8px] border border-border bg-surface-strong px-3 py-2 text-sm text-foreground outline-none transition focus:border-border-strong"
            >
              {functionTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Templates</div>
            <div className="flex flex-col gap-2">
              {templates.map((template) => {
                const isActive = template.id === selectedTemplateId;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className={`rounded-[8px] border px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "border-primary-strong bg-amber-50 text-foreground"
                        : "border-border bg-surface-strong text-muted hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {template.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto rounded-[8px] border border-border bg-surface-strong px-3 py-3 text-sm text-muted">
            <div className="font-medium text-foreground">{selectedFunctionLabel}</div>
            <div className="mt-1 break-all">
              {wasmFile ? wasmFile.name : "No Wasm file selected"}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[720px] flex-col overflow-hidden rounded-[10px] border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Input JSON</h2>
              <p className="text-sm text-muted">
                Edit the payload before sending it to the local runner API.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="rounded-[8px] bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isRunning ? "Running..." : "Run function"}
            </button>
          </div>
          <div className="min-h-[620px] flex-1">
            <JsonEditor value={inputJson} onChange={setInputJson} />
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-[10px] border border-border bg-surface px-4 py-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Result</h2>
                <p className="text-sm text-muted">
                  Response payload from the backend runner.
                </p>
              </div>
              {response ? (
                <span
                  className={`rounded-[8px] border px-2.5 py-1 text-xs font-medium ${
                    response.success
                      ? "border-emerald-200 bg-emerald-50 text-success"
                      : "border-red-200 bg-red-50 text-danger"
                  }`}
                >
                  {response.success ? "Success" : "Failed"}
                </span>
              ) : null}
            </div>
            <pre className="mt-3 max-h-[300px] overflow-auto rounded-[8px] bg-stone-950 px-3 py-3 font-mono text-[12px] leading-6 text-stone-100">
              {outputJson}
            </pre>
          </section>

          <section className="rounded-[10px] border border-border bg-surface px-4 py-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-semibold text-foreground">Errors</h2>
              <p className="text-sm text-muted">
                Backend validation and runtime failures appear here.
              </p>
            </div>
            <div className="mt-3 space-y-2 text-sm leading-6">
              {requestError ? (
                <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-danger">
                  {requestError}
                </div>
              ) : null}

              {response?.errors.length ? (
                response.errors.map((error) => (
                  <div
                    key={error}
                    className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-danger"
                  >
                    {error}
                  </div>
                ))
              ) : !requestError ? (
                <div className="rounded-[8px] border border-border bg-surface-strong px-3 py-2 text-muted">
                  No errors.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[10px] border border-border bg-surface px-4 py-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-semibold text-foreground">Performance</h2>
              <p className="text-sm text-muted">
                Execution time reported by the backend.
              </p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[8px] border border-border bg-surface-strong px-3 py-3">
                <dt className="text-muted">Execution</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {response ? `${response.executionTimeMs} ms` : "Waiting"}
                </dd>
              </div>
              <div className="rounded-[8px] border border-border bg-surface-strong px-3 py-3">
                <dt className="text-muted">Function</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {selectedFunctionLabel}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
