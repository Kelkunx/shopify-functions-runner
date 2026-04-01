"use client";

import { useMemo, useState } from "react";
import {
  formatTemplateInput,
  getTemplatesForType,
  type FunctionType,
} from "@/lib/function-templates";
import { type SavedFixture, type RunnerMode } from "@/lib/saved-fixtures";
import {
  formatJsonString,
  getJsonValidationError,
  initialFunctionInputJson,
  initialFunctionTemplate,
  initialRunnerFunctionType,
} from "./runner-workspace.helpers";
import { useRunOutputState } from "./runner/hooks/use-run-output-state";
import { useRunnerExecution } from "./runner/hooks/use-runner-execution";
import { useSavedFixturesStore } from "./runner/hooks/use-saved-fixtures-store";

export function useRunnerWorkspaceController() {
  const [activeRunnerMode, setActiveRunnerMode] = useState<RunnerMode>("mock");
  const [currentFunctionType, setCurrentFunctionType] =
    useState<FunctionType>(initialRunnerFunctionType);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    initialFunctionTemplate.id,
  );
  const [currentInputJson, setCurrentInputJson] = useState(
    initialFunctionInputJson,
  );
  const [currentWasmFile, setCurrentWasmFile] = useState<File | null>(null);
  const [currentFunctionDir, setCurrentFunctionDir] = useState("");
  const [currentTarget, setCurrentTarget] = useState("");
  const [currentExportName, setCurrentExportName] = useState("run");
  const [currentFixtureName, setCurrentFixtureName] = useState("");

  const availableTemplates = useMemo(
    () => getTemplatesForType(currentFunctionType),
    [currentFunctionType],
  );
  const jsonValidationError = useMemo(
    () => getJsonValidationError(currentInputJson),
    [currentInputJson],
  );
  const activeTemplate = useMemo(
    () =>
      availableTemplates.find((template) => template.id === selectedTemplateId) ??
      null,
    [selectedTemplateId, availableTemplates],
  );

  const {
    deleteSavedFixture: removeSavedFixture,
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

  function updateRunnerMode(nextRunnerMode: RunnerMode) {
    setActiveRunnerMode(nextRunnerMode);
    setCurrentFixtureName("");
  }

  function updateFunctionType(nextFunctionType: FunctionType) {
    setCurrentFunctionType(nextFunctionType);
    const nextAvailableTemplates = getTemplatesForType(nextFunctionType);

    if (nextAvailableTemplates[0]) {
      setSelectedTemplateId(nextAvailableTemplates[0].id);
    }
  }

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
    setActiveRunnerMode(savedFixture.runnerMode);
    setCurrentFunctionType(savedFixture.functionType);
    setSelectedTemplateId(
      getTemplatesForType(savedFixture.functionType)[0]?.id ?? "",
    );
    setCurrentInputJson(savedFixture.inputJson);
    setCurrentFunctionDir(savedFixture.functionDir);
    setCurrentTarget(savedFixture.target);
    setCurrentExportName(savedFixture.exportName);
    setCurrentFixtureName(savedFixture.name);
    setRunRequestError("");
  }

  function deleteSavedFixture(savedFixtureId: string) {
    removeSavedFixture(savedFixtureId);
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
    formatCurrentInputJson,
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
