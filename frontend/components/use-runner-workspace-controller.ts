"use client";

import { formatTemplateInput } from "@/lib/function-templates";
import { type SavedFixture } from "@/lib/saved-fixtures";
import { formatJsonString } from "./runner-workspace.helpers";
import { useRunOutputState } from "./runner/hooks/use-run-output-state";
import { useRunnerExecution } from "./runner/hooks/use-runner-execution";
import { useRunnerFormState } from "./runner/hooks/use-runner-form-state";
import { useSavedFixturesStore } from "./runner/hooks/use-saved-fixtures-store";

export function useRunnerWorkspaceController() {
  const {
    activeRunnerMode,
    activeTemplate,
    availableTemplates,
    applySavedFixture,
    currentExportName,
    currentFixtureName,
    currentFunctionDir,
    currentFunctionType,
    currentInputJson,
    currentTarget,
    currentWasmFile,
    jsonValidationError,
    selectedTemplateId,
    setCurrentExportName,
    setCurrentFixtureName,
    setCurrentFunctionDir,
    setCurrentInputJson,
    setCurrentTarget,
    setCurrentWasmFile,
    setSelectedTemplateId,
    updateFunctionType,
    updateRunnerMode,
  } = useRunnerFormState();

  const {
    deleteSavedFixture: removeSavedFixture,
    exportVisibleFixtures,
    fixturesTransferFeedback,
    importSavedFixturesFile,
    saveSavedFixture,
    visibleSavedFixtures,
  } = useSavedFixturesStore(activeRunnerMode);
  const {
    isRunInFlight,
    runFunction,
    runRequestError,
    runResponse,
    setRunRequestError,
  } = useRunnerExecution({
    currentExportName,
    currentFunctionDir,
    currentFunctionType,
    currentInputJson,
    currentTarget,
    currentWasmFile,
    jsonValidationError,
    runnerMode: activeRunnerMode,
  });
  const {
    copyRunOutput,
    isOutputModalOpen,
    outputCopyFeedback,
    setIsOutputModalOpen,
  } = useRunOutputState(runResponse);

  function loadSelectedTemplate() {
    if (!activeTemplate) {
      return;
    }

    setCurrentInputJson(formatTemplateInput(activeTemplate.input));
    setRunRequestError("");
  }

  function formatCurrentInputJson() {
    if (jsonValidationError) {
      return;
    }

    try {
      setCurrentInputJson(formatJsonString(currentInputJson));
    } catch {
      return;
    }
  }

  function saveCurrentFixture() {
    const trimmedFixtureName = currentFixtureName.trim();

    if (!trimmedFixtureName) {
      setRunRequestError("Fixture name is required.");
      return;
    }

    const savedFixture: SavedFixture = {
      id: crypto.randomUUID(),
      name: trimmedFixtureName,
      createdAt: new Date().toISOString(),
      exportName: currentExportName,
      functionDir: currentFunctionDir,
      functionType: currentFunctionType,
      inputJson: currentInputJson,
      runnerMode: activeRunnerMode,
      target: currentTarget,
    };

    saveSavedFixture(savedFixture);
    setCurrentFixtureName("");
    setRunRequestError("");
  }

  function loadSavedFixture(savedFixture: SavedFixture) {
    applySavedFixture(savedFixture);
    setRunRequestError("");
  }

  function deleteSavedFixture(savedFixtureId: string) {
    removeSavedFixture(savedFixtureId);
  }

  async function importFixtureFile(importFile: File | null) {
    if (!importFile) {
      return;
    }

    try {
      await importSavedFixturesFile(importFile);
      setRunRequestError("");
    } catch {
      setRunRequestError("Fixture import failed.");
    }
  }

  return {
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
  };
}
