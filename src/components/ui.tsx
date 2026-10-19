import type { ReactNode } from "react";

/**
 * UI primitives built on the design tokens in src/design/tokens.json.
 * Every visual value here resolves to a CSS variable — never a raw hex.
 */

export type Phase =
  | "registration"
  | "pairing"
  | "group_stage"
  | "knockout"
  | "finished";

const PHASE_LABELS: Record<Phase, string> = {
  registration: "Registration",
  pairing: "Pairing",
  group_stage: "Group Stage",
  knockout: "Knockout",
  finished: "Finished",
};

/**
 * Static class map — Tailwind scans source text, so these must be written
 * out in full rather than built from a template string.
 */
const PHASE_CLASSES: Record<Phase, string> = {
  registration: "bg-phase-registration-subtle text-phase-registration",
  pairing: "bg-phase-pairing-subtle text-phase-pairing",
  group_stage: "bg-phase-group-stage-subtle text-phase-group-stage",
  knockout: "bg-phase-knockout-subtle text-phase-knockout",
  finished: "bg-phase-finished-subtle text-phase-finished",
};

export function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase as Phase] ?? phase;
}

export function PhaseBadge({ phase }: { phase: string }) {
  const classes = PHASE_CLASSES[phase as Phase] ?? PHASE_CLASSES.finished;
  return (
    <span className={`badge ${classes} border-transparent`}>{phaseLabel(phase)}</span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-muted text-muted-foreground border-border",
    success: "bg-success-subtle text-success-subtle-foreground border-transparent",
    warning: "bg-warning-subtle text-warning-subtle-foreground border-transparent",
    danger: "bg-danger-subtle text-danger-subtle-foreground border-transparent",
    info: "bg-info-subtle text-info-subtle-foreground border-transparent",
    primary: "bg-primary-subtle text-primary-subtle-foreground border-transparent",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function ChampionBanner({ name }: { name: string }) {
  return (
    <div className="alert bg-champion-subtle border-champion/30 text-center">
      <span className="text-body-sm font-semibold text-champion-foreground">
        Champion: {name}
      </span>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-body-sm text-muted-foreground">{children}</p>;
}

export function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-section-sm">
      <h2 className="mb-component font-semibold text-heading">
        {title}
        {count !== undefined && (
          <span className="ml-1 text-muted-foreground">({count})</span>
        )}
      </h2>
      {children}
    </section>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-xs text-danger-subtle-foreground">
      {children}
    </p>
  );
}
