"use client";

import { useEffect, useState } from "react";
import {
  formatTemplateInput,
  functionTypes,
  getTemplatesForType,
  type FunctionType,
} from "@/lib/function-templates";
import {
  loadSavedFixtures,
  persistSavedFixtures,
  type RunnerMode,
  type SavedFixture,
} from "@/lib/saved-fixtures";
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
  const [runnerMode, setRunnerMode] = useState<RunnerMode>("mock");
  const [functionType, setFunctionType] =
    useState<FunctionType>(initialFunctionType);
  const [inputJson, setInputJson] = useState(
    formatTemplateInput(initialTemplate.input),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplate.id);
  const [wasmFile, setWasmFile] = useState<File | null>(null);
  const [functionDir, setFunctionDir] = useState("");
  const [target, setTarget] = useState("");
  const [exportName, setExportName] = useState("run");
  const [fixtureName, setFixtureName] = useState("");
  const [savedFixtures, setSavedFixtures] = useState<SavedFixture[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [response, setResponse] = useState<RunResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    setSavedFixtures(loadSavedFixtures());
  }, []);

  const templates = getTemplatesForType(functionType);
  const selectedFunctionLabel =
    functionTypes.find((option) => option.value === functionType)?.label ??
    functionType;
  const currentRunnerLabel =
    runnerMode === "shopify" ? "Real Shopify runner" : selectedFunctionLabel;

  async function handleRun() {
    setIsRunning(true);
    setRequestError(null);

    const formData = new FormData();

    if (wasmFile) {
      formData.append("wasm", wasmFile);
    }

    formData.append("inputJson", inputJson);
    formData.append("functionType", functionType);

    if (runnerMode === "shopify") {
      formData.append("functionDir", functionDir.trim());
      formData.append("target", target.trim());
      formData.append("exportName", exportName.trim() || "run");
    }

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

  function handleRunnerModeChange(nextMode: RunnerMode) {
    setRunnerMode(nextMode);
    setResponse(null);
    setRequestError(null);
  }

  function saveFixture() {
    const trimmedName = fixtureName.trim();

    if (!trimmedName) {
      setRequestError("Name the fixture before saving it.");
      return;
    }

    const nextFixture: SavedFixture = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
      exportName,
      functionDir,
      functionType,
      inputJson,
      runnerMode,
      target,
    };

    const nextFixtures = [nextFixture, ...savedFixtures].slice(0, 12);

    setSavedFixtures(nextFixtures);
    persistSavedFixtures(nextFixtures);
    setFixtureName("");
    setRequestError(null);
  }

  function loadFixture(fixture: SavedFixture) {
    setRunnerMode(fixture.runnerMode);
    setFunctionType(fixture.functionType);
    setInputJson(fixture.inputJson);
    setSelectedTemplateId("");
    setFunctionDir(fixture.functionDir);
    setTarget(fixture.target);
    setExportName(fixture.exportName);
    setResponse(null);
    setRequestError(null);
  }

  function deleteFixture(fixtureId: string) {
    const nextFixtures = savedFixtures.filter((fixture) => fixture.id !== fixtureId);

    setSavedFixtures(nextFixtures);
    persistSavedFixtures(nextFixtures);
  }

  const outputJson = response ? JSON.stringify(response.output, null, 2) : "{}";

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-5 py-5 lg:px-8 lg:py-8">
      <div className="grid flex-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <aside className="flex flex-col gap-4 rounded-[10px] border border-border bg-surface px-4 py-4">
          <div className="space-y-1 border-b border-border pb-4">
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
              Shopify Functions Local Runner
            </h1>
            <p className="text-sm leading-6 text-muted">
              Test payloads quickly in mock mode, or switch to the real Shopify
              runner when you have a local function directory.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Runner mode</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["mock", "Mock"],
                ["shopify", "Shopify"],
              ] as const).map(([value, label]) => {
                const isActive = runnerMode === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRunnerModeChange(value)}
                    className={`rounded-[8px] border px-3 py-2 text-sm transition ${
                      isActive
                        ? "border-primary-strong bg-amber-50 text-foreground"
                        : "border-border bg-surface-strong text-muted hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
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
            <p className="text-xs leading-5 text-muted">
              Optional. In Shopify mode, an uploaded file overrides the built Wasm
              for the current run.
            </p>
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

          {runnerMode === "shopify" ? (
            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <div className="text-sm font-medium text-foreground">
                  Shopify runner details
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  The backend resolves metadata with Shopify CLI and runs the
                  official function-runner binary.
                </p>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Function directory
                </span>
                <input
                  type="text"
                  value={functionDir}
                  onChange={(event) => setFunctionDir(event.target.value)}
                  placeholder="/path/to/shopify-app/extensions/my-function"
                  className="w-full rounded-[8px] border border-border bg-surface-strong px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-border-strong"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Target</span>
                <input
                  type="text"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder="purchase.product-discount.run"
                  className="w-full rounded-[8px] border border-border bg-surface-strong px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-border-strong"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Export</span>
                <input
                  type="text"
                  value={exportName}
                  onChange={(event) => setExportName(event.target.value)}
                  placeholder="run"
                  className="w-full rounded-[8px] border border-border bg-surface-strong px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-border-strong"
                />
              </label>
            </div>
          ) : null}

          <div className="space-y-3 border-t border-border pt-4">
            <div className="text-sm font-medium text-foreground">Saved fixtures</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={fixtureName}
                onChange={(event) => setFixtureName(event.target.value)}
                placeholder="Fixture name"
                className="min-w-0 flex-1 rounded-[8px] border border-border bg-surface-strong px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-border-strong"
              />
              <button
                type="button"
                onClick={saveFixture}
                className="rounded-[8px] border border-border bg-surface-strong px-3 py-2 text-sm text-foreground transition hover:border-border-strong"
              >
                Save
              </button>
            </div>

            <div className="flex max-h-[220px] flex-col gap-2 overflow-auto pr-1">
              {savedFixtures.length > 0 ? (
                savedFixtures.map((fixture) => (
                  <div
                    key={fixture.id}
                    className="rounded-[8px] border border-border bg-surface-strong px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {fixture.name}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {fixture.runnerMode === "shopify"
                            ? "Shopify runner"
                            : fixture.functionType}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteFixture(fixture.id)}
                        className="text-xs text-muted transition hover:text-foreground"
                      >
                        Delete
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadFixture(fixture)}
                      className="mt-3 rounded-[8px] border border-border px-3 py-2 text-sm text-foreground transition hover:border-border-strong"
                    >
                      Load
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-[8px] border border-border bg-surface-strong px-3 py-2 text-sm text-muted">
                  No saved fixtures yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto rounded-[8px] border border-border bg-surface-strong px-3 py-3 text-sm text-muted">
            <div className="font-medium text-foreground">{currentRunnerLabel}</div>
            <div className="mt-1 break-all">
              {runnerMode === "shopify"
                ? functionDir || "Waiting for function directory"
                : wasmFile
                  ? wasmFile.name
                  : "Mock runner only"}
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
                <dt className="text-muted">Mode</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {runnerMode === "shopify" ? "Shopify" : "Mock"}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
