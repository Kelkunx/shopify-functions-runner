"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-105 items-center justify-center bg-stone-950 text-sm text-stone-400">
      Loading editor...
    </div>
  ),
});

interface JsonEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
}

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  return (
    <MonacoEditor
      defaultLanguage="json"
      height="100%"
      theme="vs-dark"
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      options={{
        automaticLayout: true,
        fontFamily: "var(--font-ibm-plex-mono)",
        fontLigatures: false,
        fontSize: 13,
        formatOnPaste: true,
        minimap: { enabled: false },
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        tabSize: 2,
      }}
    />
  );
}
