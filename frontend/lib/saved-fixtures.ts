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

const storageKey = "shopify-functions-local-runner-fixtures";

export function loadSavedFixtures(): SavedFixture[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as SavedFixture[];

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue;
  } catch {
    return [];
  }
}

export function persistSavedFixtures(fixtures: SavedFixture[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(fixtures));
}
