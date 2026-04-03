import type { FunctionType } from "./function-templates";

export type RunnerMode = "mock" | "shopify";

export interface SavedFixture {
  id: string;
  name: string;
  createdAt: string;
  exportName: string;
  functionDir: string;
  functionType: FunctionType;
  inputJson: string;
  runnerMode: RunnerMode;
  target: string;
}

interface SavedFixturesExportPayload {
  exportedAt: string;
  fixtures: SavedFixture[];
  version: 1;
}

const currentStorageKey = "shopify-functions-workbench-fixtures";
const legacyStorageKeys = ["shopify-functions-local-runner-fixtures"];

export function loadSavedFixtures(): SavedFixture[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawCurrentValue = window.localStorage.getItem(currentStorageKey);
  const fixturesFromCurrentStorage = parseSavedFixtures(rawCurrentValue);

  if (fixturesFromCurrentStorage) {
    return fixturesFromCurrentStorage;
  }

  for (const legacyStorageKey of legacyStorageKeys) {
    const rawLegacyValue = window.localStorage.getItem(legacyStorageKey);
    const fixturesFromLegacyStorage = parseSavedFixtures(rawLegacyValue);

    if (!fixturesFromLegacyStorage) {
      continue;
    }

    persistSavedFixtures(fixturesFromLegacyStorage);
    window.localStorage.removeItem(legacyStorageKey);

    return fixturesFromLegacyStorage;
  }

  return [];
}

export function persistSavedFixtures(fixtures: SavedFixture[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(currentStorageKey, JSON.stringify(fixtures));
}

export function parseImportedSavedFixtures(rawValue: string): SavedFixture[] {
  try {
    const parsedValue = JSON.parse(rawValue) as SavedFixture[] | SavedFixturesExportPayload;

    if (Array.isArray(parsedValue)) {
      return normalizeSavedFixtures(parsedValue);
    }

    if (
      parsedValue &&
      typeof parsedValue === "object" &&
      Array.isArray(parsedValue.fixtures)
    ) {
      return normalizeSavedFixtures(parsedValue.fixtures);
    }

    return [];
  } catch {
    return [];
  }
}

export function serializeSavedFixturesExport(fixtures: SavedFixture[]) {
  const exportPayload: SavedFixturesExportPayload = {
    exportedAt: new Date().toISOString(),
    fixtures,
    version: 1,
  };

  return JSON.stringify(exportPayload, null, 2);
}

function parseSavedFixtures(rawValue: string | null): SavedFixture[] | null {
  if (!rawValue) {
    return null;
  }

  const parsedFixtures = parseImportedSavedFixtures(rawValue);

  return parsedFixtures.length > 0 ? parsedFixtures : null;
}

function normalizeSavedFixtures(rawFixtures: SavedFixture[]) {
  return rawFixtures.filter(isSavedFixture);
}

function isSavedFixture(value: unknown): value is SavedFixture {
  if (!value || typeof value !== "object") {
    return false;
  }

  const fixture = value as Partial<SavedFixture>;

  return (
    typeof fixture.id === "string" &&
    typeof fixture.name === "string" &&
    typeof fixture.createdAt === "string" &&
    typeof fixture.exportName === "string" &&
    typeof fixture.functionDir === "string" &&
    typeof fixture.functionType === "string" &&
    typeof fixture.inputJson === "string" &&
    (fixture.runnerMode === "mock" || fixture.runnerMode === "shopify") &&
    typeof fixture.target === "string"
  );
}
