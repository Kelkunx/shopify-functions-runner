"use client";

import { useState } from "react";
import type { RunResponse } from "../../runner-workspace.types";
import { formatOutputJson } from "../../runner-workspace.helpers";

export function useRunOutputState(runResponse: RunResponse | null) {
  const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
  const [outputCopyFeedback, setOutputCopyFeedback] = useState("");

  async function copyRunOutput() {
    if (!runResponse) {
      return;
    }

    try {
      await navigator.clipboard.writeText(formatOutputJson(runResponse.output));
      setOutputCopyFeedback("Copied");
      window.setTimeout(() => setOutputCopyFeedback(""), 1400);
    } catch {
      setOutputCopyFeedback("Copy failed");
      window.setTimeout(() => setOutputCopyFeedback(""), 1800);
    }
  }

  return {
    copyRunOutput,
    isOutputModalOpen,
    outputCopyFeedback,
    setIsOutputModalOpen,
  };
}
