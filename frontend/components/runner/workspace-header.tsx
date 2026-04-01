import type { RunnerMode } from "@/lib/saved-fixtures";
import {
  ModeButton,
  PrimaryButton,
  SecondaryButton,
} from "./runner-ui-primitives";

export function WorkspaceHeader({
  isRunInFlight,
  jsonValidationError,
  onFormatJson,
  onRun,
  onRunnerModeChange,
  runnerMode,
}: {
  isRunInFlight: boolean;
  jsonValidationError: string;
  onFormatJson: () => void;
  onRun: () => void;
  onRunnerModeChange: (mode: RunnerMode) => void;
  runnerMode: RunnerMode;
}) {
  return (
    <header className="border-b border-border bg-surface-strong">
      <div className="flex min-h-14 items-center justify-between gap-4 px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold">Shopify Functions Workbench</h1>
            <p className="text-sm text-muted">
              Open-source workbench for local Shopify Function runs, fixtures, and
              debugging.
            </p>
          </div>
          <div className="hidden h-6 w-px bg-border lg:block" />
          <div className="hidden items-center gap-2 lg:flex">
            <ModeButton
              active={runnerMode === "mock"}
              label="Mock"
              onClick={() => onRunnerModeChange("mock")}
            />
            <ModeButton
              active={runnerMode === "shopify"}
              label="Shopify"
              onClick={() => onRunnerModeChange("shopify")}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SecondaryButton
            disabled={Boolean(jsonValidationError)}
            onClick={onFormatJson}
            type="button"
          >
            Format JSON
          </SecondaryButton>
          <PrimaryButton disabled={isRunInFlight} onClick={onRun} type="button">
            {isRunInFlight ? "Running..." : "Run"}
          </PrimaryButton>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-2 text-sm lg:hidden">
        <ModeButton
          active={runnerMode === "mock"}
          label="Mock"
          onClick={() => onRunnerModeChange("mock")}
        />
        <ModeButton
          active={runnerMode === "shopify"}
          label="Shopify"
          onClick={() => onRunnerModeChange("shopify")}
        />
      </div>
    </header>
  );
}
