"use client";

import { RunnerControlsPanel } from "./runner/controls-panel";
import { EditorPanel } from "./runner/editor-panel";
import { ExpandedOutputModal } from "./runner/expanded-output-modal";
import { RunResultsPanel } from "./runner/results-panel";
import { WorkspaceHeader } from "./runner/workspace-header";
import { useRunnerWorkspaceController } from "./use-runner-workspace-controller";

export function RunnerWorkspace() {
  const {
    activeRunnerMode,
    availableTemplates,
    copyRunOutput,
    currentExportName,
    currentFixtureName,
    currentFunctionDir,
    currentFunctionType,
    currentInputJson,
    currentTarget,
    currentWasmFile,
    deleteSavedFixture,
    exportVisibleFixtures,
    fixturesTransferFeedback,
    formatCurrentInputJson,
    importFixtureFile,
    isOutputModalOpen,
    isRunInFlight,
    jsonValidationError,
    loadSavedFixture,
    loadSelectedTemplate,
    outputCopyFeedback,
    runFunction,
    runRequestError,
    runResponse,
    saveCurrentFixture,
    selectedTemplateId,
    setCurrentExportName,
    setCurrentFixtureName,
    setCurrentFunctionDir,
    setCurrentInputJson,
    setCurrentTarget,
    setCurrentWasmFile,
    setIsOutputModalOpen,
    setSelectedTemplateId,
    updateFunctionType,
    updateRunnerMode,
    visibleSavedFixtures,
  } = useRunnerWorkspaceController();

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <WorkspaceHeader
          isRunInFlight={isRunInFlight}
          jsonValidationError={jsonValidationError}
          onFormatJson={formatCurrentInputJson}
          onRun={runFunction}
          onRunnerModeChange={updateRunnerMode}
          runnerMode={activeRunnerMode}
        />

        <main className="flex min-h-0 flex-1 flex-col px-5 py-5 lg:px-8 lg:py-6">
          <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[272px_minmax(0,1fr)_360px]">
            <RunnerControlsPanel
              currentExportName={currentExportName}
              currentFixtureName={currentFixtureName}
              currentFunctionDir={currentFunctionDir}
              currentFunctionType={currentFunctionType}
              onDeleteSavedFixture={deleteSavedFixture}
              onExportNameChange={setCurrentExportName}
              onExportFixtures={exportVisibleFixtures}
              onFixtureNameChange={setCurrentFixtureName}
              onFixtureSave={saveCurrentFixture}
              onFunctionDirChange={setCurrentFunctionDir}
              onImportFixtures={importFixtureFile}
              onFunctionTypeChange={updateFunctionType}
              onLoadFixture={loadSavedFixture}
              onLoadSelectedTemplate={loadSelectedTemplate}
              onSelectedTemplateChange={setSelectedTemplateId}
              onTargetChange={setCurrentTarget}
              onWasmFileChange={setCurrentWasmFile}
              runnerMode={activeRunnerMode}
              savedFixtures={visibleSavedFixtures}
              selectedTemplateId={selectedTemplateId}
              target={currentTarget}
              templates={availableTemplates}
              transferFeedback={fixturesTransferFeedback}
              wasmFile={currentWasmFile}
            />

            <EditorPanel
              inputJson={currentInputJson}
              jsonValidationError={jsonValidationError}
              onInputChange={setCurrentInputJson}
              runnerMode={activeRunnerMode}
            />

            <RunResultsPanel
              copyFeedback={outputCopyFeedback}
              onCopyOutput={copyRunOutput}
              onExpandOutput={() => setIsOutputModalOpen(true)}
              runRequestError={runRequestError}
              runResponse={runResponse}
            />
          </div>
        </main>
      </div>

      {isOutputModalOpen && runResponse ? (
        <ExpandedOutputModal
          onClose={() => setIsOutputModalOpen(false)}
          onCopyOutput={copyRunOutput}
          output={runResponse.output}
        />
      ) : null}
    </>
  );
}
