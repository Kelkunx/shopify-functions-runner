import { functionTypes, type FunctionType } from "@/lib/function-templates";
import type { RunnerMode, SavedFixture } from "@/lib/saved-fixtures";
import { formatTimestamp } from "../runner-workspace.helpers";
import {
  EmptyState,
  Field,
  FixtureActionButton,
  SecondaryButton,
  SelectInput,
  SidebarPanel,
  SidebarSection,
  TextInput,
} from "./runner-ui-primitives";
import { runnerUiClassNames } from "./runner-ui-class-names";

export function RunnerControlsPanel({
  currentExportName,
  currentFixtureName,
  currentFunctionDir,
  currentFunctionType,
  onDeleteSavedFixture,
  onExportNameChange,
  onFixtureNameChange,
  onFixtureSave,
  onFunctionDirChange,
  onFunctionTypeChange,
  onLoadFixture,
  onLoadSelectedTemplate,
  onSelectedTemplateChange,
  onTargetChange,
  onWasmFileChange,
  runnerMode,
  savedFixtures,
  selectedTemplateId,
  target,
  templates,
  wasmFile,
}: {
  currentExportName: string;
  currentFixtureName: string;
  currentFunctionDir: string;
  currentFunctionType: FunctionType;
  onDeleteSavedFixture: (savedFixtureId: string) => void;
  onExportNameChange: (value: string) => void;
  onFixtureNameChange: (value: string) => void;
  onFixtureSave: () => void;
  onFunctionDirChange: (value: string) => void;
  onFunctionTypeChange: (value: FunctionType) => void;
  onLoadFixture: (savedFixture: SavedFixture) => void;
  onLoadSelectedTemplate: () => void;
  onSelectedTemplateChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onWasmFileChange: (file: File | null) => void;
  runnerMode: RunnerMode;
  savedFixtures: SavedFixture[];
  selectedTemplateId: string;
  target: string;
  templates: { id: string; label: string }[];
  wasmFile: File | null;
}) {
  return (
    <SidebarPanel>
      <SidebarSection title="Runner">
        <Field label="Function type">
          <SelectInput
            onChange={(event) => onFunctionTypeChange(event.target.value as FunctionType)}
            value={currentFunctionType}
          >
            {functionTypes.map((functionTypeOption) => (
              <option key={functionTypeOption.value} value={functionTypeOption.value}>
                {functionTypeOption.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Input template">
          <div className="flex gap-2">
            <SelectInput
              className="min-w-0 flex-1"
              onChange={(event) => onSelectedTemplateChange(event.target.value)}
              value={selectedTemplateId}
            >
              {templates.map((templateOption) => (
                <option key={templateOption.id} value={templateOption.id}>
                  {templateOption.label}
                </option>
              ))}
            </SelectInput>
            <SecondaryButton onClick={onLoadSelectedTemplate} type="button">
              Load
            </SecondaryButton>
          </div>
        </Field>

        <Field
          helper={
            runnerMode === "mock"
              ? "Optional in mock mode. The backend can run without a real file."
              : "Optional override when you want to run a local Shopify function with a different build output."
          }
          label="Wasm file"
        >
          <input
            accept=".wasm"
            className={`${runnerUiClassNames.textInput} block py-2 file:mr-3 file:rounded-md file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white`}
            onChange={(event) => onWasmFileChange(event.target.files?.[0] ?? null)}
            type="file"
          />
          <div className="mt-2 text-sm text-muted">
            {wasmFile ? wasmFile.name : "No file selected"}
          </div>
        </Field>
      </SidebarSection>

      {runnerMode === "shopify" ? (
        <SidebarSection title="Shopify runner">
          <Field
            helper="Local function directory. When present with a target, the backend switches from mock mode to the Shopify runner."
            label="functionDir"
          >
            <TextInput
              onChange={(event) => onFunctionDirChange(event.target.value)}
              placeholder="/path/to/extensions/discount"
              type="text"
              value={currentFunctionDir}
            />
          </Field>

          <Field
            helper="Exact Shopify target, for example `cart.lines.discounts.generate.run`."
            label="target"
          >
            <TextInput
              onChange={(event) => onTargetChange(event.target.value)}
              placeholder="cart.lines.discounts.generate.run"
              type="text"
              value={target}
            />
          </Field>

          <Field helper="Defaults to `run`." label="exportName">
            <TextInput
              onChange={(event) => onExportNameChange(event.target.value)}
              placeholder="run"
              type="text"
              value={currentExportName}
            />
          </Field>
        </SidebarSection>
      ) : null}

      <SavedFixturesSection
        currentFixtureName={currentFixtureName}
        onDeleteSavedFixture={onDeleteSavedFixture}
        onFixtureNameChange={onFixtureNameChange}
        onFixtureSave={onFixtureSave}
        onLoadFixture={onLoadFixture}
        savedFixtures={savedFixtures}
      />
    </SidebarPanel>
  );
}

function SavedFixturesSection({
  currentFixtureName,
  onDeleteSavedFixture,
  onFixtureNameChange,
  onFixtureSave,
  onLoadFixture,
  savedFixtures,
}: {
  currentFixtureName: string;
  onDeleteSavedFixture: (savedFixtureId: string) => void;
  onFixtureNameChange: (value: string) => void;
  onFixtureSave: () => void;
  onLoadFixture: (savedFixture: SavedFixture) => void;
  savedFixtures: SavedFixture[];
}) {
  return (
    <SidebarSection title="Saved fixtures">
      <Field
        helper="Saved locally in the browser for the current mode."
        label="Fixture name"
      >
        <div className="flex gap-2">
          <TextInput
            className="min-w-0 flex-1"
            onChange={(event) => onFixtureNameChange(event.target.value)}
            placeholder="black-friday-check"
            type="text"
            value={currentFixtureName}
          />
          <SecondaryButton onClick={onFixtureSave} type="button">
            Save
          </SecondaryButton>
        </div>
      </Field>

      <div className="space-y-2">
        {savedFixtures.length === 0 ? (
          <EmptyState>No saved fixtures for this mode.</EmptyState>
        ) : (
          savedFixtures.map((savedFixture) => (
            <SavedFixtureCard
              key={savedFixture.id}
              onDelete={() => onDeleteSavedFixture(savedFixture.id)}
              onLoad={() => onLoadFixture(savedFixture)}
              savedFixture={savedFixture}
            />
          ))
        )}
      </div>
    </SidebarSection>
  );
}

function SavedFixtureCard({
  onDelete,
  onLoad,
  savedFixture,
}: {
  onDelete: () => void;
  onLoad: () => void;
  savedFixture: SavedFixture;
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">
            {savedFixture.name}
          </div>
          <div className="mt-1 text-xs text-muted">
            {savedFixture.functionType} • {formatTimestamp(savedFixture.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <FixtureActionButton onClick={onLoad} type="button">
            Load
          </FixtureActionButton>
          <FixtureActionButton onClick={onDelete} tone="danger" type="button">
            Delete
          </FixtureActionButton>
        </div>
      </div>
      {savedFixture.runnerMode === "shopify" && savedFixture.target ? (
        <div className="mt-2 truncate text-xs text-muted">{savedFixture.target}</div>
      ) : null}
    </div>
  );
}
