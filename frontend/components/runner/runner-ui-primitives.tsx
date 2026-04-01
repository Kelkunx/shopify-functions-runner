import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { runnerUiClassNames } from "./runner-ui-class-names";

export function SidebarPanel({ children }: { children: ReactNode }) {
  return <aside className={runnerUiClassNames.sectionPanelWrapper}>{children}</aside>;
}

export function SurfacePanel({ children }: { children: ReactNode }) {
  return <section className={runnerUiClassNames.sectionPanel}>{children}</section>;
}

export function PanelHeader({
  actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={runnerUiClassNames.sectionPanelHeader}>
      {children}
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SidebarSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className={runnerUiClassNames.sectionWrapper}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  children,
  helper,
  label,
}: {
  children: ReactNode;
  helper?: string;
  label: string;
}) {
  return (
    <label className="block">
      <div className={runnerUiClassNames.fieldLabel}>{label}</div>
      {children}
      {helper ? <div className={runnerUiClassNames.fieldHelper}>{helper}</div> : null}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[runnerUiClassNames.textInput, className].filter(Boolean).join(" ")}
    />
  );
}

export function SelectInput({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[runnerUiClassNames.selectInput, className].filter(Boolean).join(" ")}
    />
  );
}

export function SecondaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[runnerUiClassNames.secondaryButton, className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function PrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[runnerUiClassNames.primaryButton, className].filter(Boolean).join(" ")}
    />
  );
}

export function SmallActionButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[runnerUiClassNames.resultsActionButton, className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className={runnerUiClassNames.emptyState}>{children}</div>;
}

export function DangerBox({ children }: { children: ReactNode }) {
  return <div className={runnerUiClassNames.dangerBox}>{children}</div>;
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`${runnerUiClassNames.toggleButton} ${
        active
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-border bg-surface text-foreground hover:border-border-strong hover:bg-stone-100"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function StateBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "danger" | "neutral";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-danger"
      : "border-border bg-surface text-muted";

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

export function CodeBlock({
  children,
  expanded = false,
}: {
  children: ReactNode;
  expanded?: boolean;
}) {
  const codeBlockClassName = expanded
    ? "h-full overflow-auto rounded-md border border-border bg-stone-950 px-4 py-4 font-mono text-[13px] leading-6 text-stone-100"
    : runnerUiClassNames.codeBlock;

  return <pre className={codeBlockClassName}>{children}</pre>;
}

export function FixtureActionButton({
  children,
  className,
  tone = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "danger" | "default";
}) {
  const toneClassName =
    tone === "danger"
      ? "text-danger hover:border-red-300 hover:bg-red-50"
      : "hover:border-border-strong hover:bg-stone-100";

  return (
    <button
      {...props}
      className={[
        runnerUiClassNames.cardButton,
        toneClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
