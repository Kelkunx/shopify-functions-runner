"use client";

import { useMemo, useState } from "react";
import {
  loadSavedFixtures,
  persistSavedFixtures,
  type RunnerMode,
  type SavedFixture,
} from "@/lib/saved-fixtures";

export function useSavedFixturesStore(activeRunnerMode: RunnerMode) {
  const [allSavedFixtures, setAllSavedFixtures] = useState<SavedFixture[]>(
    () => loadSavedFixtures(),
  );

  const visibleSavedFixtures = useMemo(
    () =>
      allSavedFixtures.filter(
        (savedFixture) => savedFixture.runnerMode === activeRunnerMode,
      ),
    [activeRunnerMode, allSavedFixtures],
  );

  function saveSavedFixture(savedFixture: SavedFixture) {
    setAllSavedFixtures((currentSavedFixtures) => {
      const nextSavedFixtures = [savedFixture, ...currentSavedFixtures];

      persistSavedFixtures(nextSavedFixtures);

      return nextSavedFixtures;
    });
  }

  function deleteSavedFixture(savedFixtureId: string) {
    setAllSavedFixtures((currentSavedFixtures) => {
      const nextSavedFixtures = currentSavedFixtures.filter(
        (savedFixture) => savedFixture.id !== savedFixtureId,
      );

      persistSavedFixtures(nextSavedFixtures);

      return nextSavedFixtures;
    });
  }

  return {
    deleteSavedFixture,
    saveSavedFixture,
    visibleSavedFixtures,
  };
}
