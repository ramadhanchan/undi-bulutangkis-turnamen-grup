"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  ChampionBanner,
  ErrorMessage,
  PhaseBadge,
} from "@/components/ui";
import { ParticipantsStep, TeamsStep } from "@/components/event-steps";
import { BracketStep, BracketTree } from "@/components/bracket-step";
import { GroupsStep } from "@/components/group-step";
import { absoluteUrl, copyToClipboard } from "@/lib/clipboard";
import { requestJson } from "@/lib/client";
import { formatTeamName } from "@/lib/format";
import {
  deriveFlow,
  flowInputFromSnapshot,
  STEP_ORDER,
  type FlowStep,
} from "@/lib/event-flow";
import type { EventSnapshot } from "@/lib/event-snapshot";
import { updateSavedEventToken } from "@/lib/saved-events";

const STEP_META: Record<FlowStep, { label: string; description: string }> = {
  participants: {
    label: "Peserta",
    description: "Kumpulkan nama pemain dan pastikan jumlahnya valid.",
  },
  teams: {
    label: "Undi Tim",
    description: "Acak pasangan ganda, lalu kunci sebelum grup diundi.",
  },
  groups: {
    label: "Bagi Grup",
    description: "Undi grup 3–4 tim, lalu mainkan round-robin.",
  },
  bracket: {
    label: "Bagan",
    description: "Knockout single elimination sampai Final.",
  },
};

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4.5 10.5l3.5 3.5 7.5-7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="5" y="9" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 9V7a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Stepper({
  steps,
  activeStep,
  viewStep,
  onSelect,
}: {
  steps: { step: FlowStep; status: "done" | "active" | "locked" }[];
  activeStep: FlowStep;
  viewStep: FlowStep;
  onSelect: (step: FlowStep) => void;
}) {
  const activeIndex = STEP_ORDER.indexOf(activeStep);

  return (
    <ol className="grid grid-cols-4 gap-1 pb-1 md:flex md:items-start md:gap-1">
      {STEP_ORDER.map((step, index) => {
        const status =
          steps.find((entry) => entry.step === step)?.status ?? "locked";
        const selected = step === viewStep;
        const locked = status === "locked";

        return (
          <li key={step} className="flex min-w-0 items-start gap-component-sm md:flex-1">
            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect(step)}
              className={`flex min-w-0 flex-col items-start gap-1 text-left ${
                locked ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-caption font-semibold transition-colors ${
                  status === "active"
                    ? "border-primary bg-primary text-primary-foreground"
                    : status === "done"
                      ? "border-success bg-success-subtle text-success-subtle-foreground"
                      : "border-border bg-surface-muted text-muted-foreground"
                } ${selected ? "ring-2 ring-primary ring-offset-2" : ""}`}
              >
                {status === "done" ? (
                  <CheckIcon />
                ) : locked ? (
                  <LockIcon />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={`text-caption leading-tight ${
                  selected || status === "active"
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {STEP_META[step].label}
              </span>
            </button>
            {index < STEP_ORDER.length - 1 && (
              <span
                className={`mt-component-lg hidden h-px flex-1 md:block ${
                  index < activeIndex ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

async function fetchSnapshot(
  eventId: string
): Promise<EventSnapshot | null> {
  const result = await requestJson<EventSnapshot>(`/api/events/${eventId}`);
  return result.ok ? result.data : null;
}

export function EventFlow({
  eventId,
  token,
  canEdit = false,
}: {
  eventId: string;
  token?: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestedStep, setRequestedStep] = useState<FlowStep | null>(null);
  const [busy, setBusy] = useState(false);
  const [presentation, setPresentation] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("layar") === "1"
  );
  const [copiedLink, setCopiedLink] = useState<
    "public" | "admin" | "new-admin" | null
  >(null);
  const [newAdminUrl, setNewAdminUrl] = useState<string | null>(null);
  const activeRef = useRef<FlowStep | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applySnapshot = useCallback((data: EventSnapshot) => {
    const nextFlow = deriveFlow(flowInputFromSnapshot(data));
    if (activeRef.current !== nextFlow.activeStep) {
      activeRef.current = nextFlow.activeStep;
      setRequestedStep(null);
    }
    setSnapshot(data);
    setError(null);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSnapshot(eventId);
      if (data) {
        applySnapshot(data);
      } else {
        setError("Event tidak ditemukan.");
        setLoading(false);
      }
    } catch {
      setError("Gagal memuat event.");
      setLoading(false);
    }
  }, [applySnapshot, eventId]);

  useEffect(() => {
    let cancelled = false;

    async function initial() {
      try {
        const data = await fetchSnapshot(eventId);
        if (cancelled) return;
        if (data) {
          applySnapshot(data);
        } else {
          setError("Event tidak ditemukan.");
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Gagal memuat event.");
          setLoading(false);
        }
      }
    }

    void initial();

    const source = new EventSource(`/api/events/${eventId}/stream`);
    source.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data) as { type?: string };
        if (data.type === "connected") return;
        if (data.type === "event_deleted") {
          setError("Event ini sudah dihapus.");
          setSnapshot(null);
          setLoading(false);
          return;
        }
        void refresh();
      } catch {
        void refresh();
      }
    };
    return () => {
      cancelled = true;
      source.close();
    };
  }, [applySnapshot, eventId, refresh]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const flow = snapshot ? deriveFlow(flowInputFromSnapshot(snapshot)) : null;

  function showCopied(kind: "public" | "admin" | "new-admin") {
    setCopiedLink(kind);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedLink(null), 2500);
  }

  async function copyLink(kind: "public" | "admin" | "new-admin") {
    const path =
      kind === "public"
        ? `/event/${eventId}`
        : kind === "admin" && token
          ? `/event/${eventId}/admin/${token}`
          : kind === "new-admin"
            ? newAdminUrl
            : null;
    if (!path) return;

    const copied = await copyToClipboard(absoluteUrl(path));
    if (!copied) {
      setError("Gagal menyalin link. Salin dari address bar.");
      return;
    }
    setError(null);
    showCopied(kind);
  }

  function setScreenMode(enabled: boolean) {
    setPresentation(enabled);
    const url = new URL(window.location.href);
    if (enabled) {
      url.searchParams.set("layar", "1");
    } else {
      url.searchParams.delete("layar");
    }
    window.history.replaceState(window.history.state, "", url.toString());
  }

  async function generateTeams() {
    if (!token || !snapshot) return;
    const teamCount = snapshot.participants.length / 2;
    if (
      !window.confirm(
        `${snapshot.participants.length} peserta akan diundi menjadi ${teamCount} tim. Lanjutkan?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await requestJson<{ error?: string }>(
      `/api/events/${eventId}/pairings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );
    if (!result.ok) {
      setError(result.data?.error ?? "Gagal mengundi tim.");
      setBusy(false);
      return;
    }

    await refresh();
    setBusy(false);
  }

  async function lockTeams() {
    if (!token || !snapshot) return;
    if (
      !window.confirm(
        `${snapshot.teams.length} tim akan dikunci. Setelah ini undi ulang dan tukar pemain tidak bisa dilakukan. Lanjutkan?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await requestJson<{ error?: string }>(
      `/api/events/${eventId}/lock-teams`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );
    if (!result.ok) {
      setError(result.data?.error ?? "Gagal mengunci tim.");
      setBusy(false);
      return;
    }
    await refresh();
    setBusy(false);
  }

  async function startKnockout() {
    if (!token || !snapshot) return;
    if (
      !window.confirm(
        "Mulai knockout? Bagan akan dibuat dari klasemen grup."
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await requestJson<{ error?: string }>(
      `/api/events/${eventId}/transition`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, targetState: "knockout" }),
      }
    );
    if (!result.ok) {
      setError(result.data?.error ?? "Gagal memulai knockout.");
      setBusy(false);
      return;
    }
    await refresh();
    setBusy(false);
  }

  async function regenerateToken() {
    if (!token) return;
    if (
      !window.confirm(
        "Perbarui Admin Link? Link lama tidak akan berlaku lagi."
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await requestJson<{
      adminToken?: string;
      adminUrl?: string;
      error?: string;
    }>(`/api/events/${eventId}/regenerate-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = result.data;
    if (!result.ok || !data?.adminToken || !data.adminUrl) {
      setError(data?.error ?? "Gagal memperbarui Admin Link.");
      setBusy(false);
      return;
    }

    updateSavedEventToken(eventId, data.adminToken);
    setNewAdminUrl(data.adminUrl);
    setCopiedLink(null);
    setBusy(false);
  }

  async function removeEvent() {
    if (!token) return;
    if (!window.confirm("Hapus event ini? Tindakan ini tidak bisa dibatalkan.")) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await requestJson<{ error?: string }>(
      `/api/events/${eventId}?token=${encodeURIComponent(token)}`,
      { method: "DELETE" }
    );
    if (!result.ok) {
      setError(result.data?.error ?? "Gagal menghapus event.");
      setBusy(false);
      return;
    }
    router.push("/");
    setBusy(false);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-page-x py-page-y">
        <p className="text-body-sm text-muted-foreground">Memuat event...</p>
      </main>
    );
  }

  if (!snapshot || !flow) {
    return (
      <main className="mx-auto max-w-3xl px-page-x py-page-y">
        <p className="text-body-sm text-danger-subtle-foreground">
          {error ?? "Event tidak ditemukan."}
        </p>
      </main>
    );
  }

  const currentSnapshot = snapshot;
  const currentFlow = flow;
  const championTeam = snapshot.champion
    ? snapshot.teams.find((team) => team.id === snapshot.champion)
    : null;
  const bracketRounds =
    snapshot.bracket.length > 0 ? snapshot.bracket : snapshot.previewBracket;
  const viewStep = requestedStep ?? currentFlow.activeStep;
  const stepIndex = STEP_ORDER.indexOf(viewStep);
  const stepMeta = STEP_META[viewStep];
  const stepStatus =
    currentFlow.steps.find((entry) => entry.step === viewStep)?.status ??
    "locked";
  const isActiveView = viewStep === currentFlow.activeStep;

  function primaryAction() {
    if (!isActiveView) {
      return (
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setRequestedStep(currentFlow.activeStep)}
        >
          Kembali ke {STEP_META[currentFlow.activeStep].label} →
        </button>
      );
    }

    if (viewStep === "participants" && canEdit) {
      return (
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy || !currentFlow.actions.includes("generate-teams")}
          onClick={generateTeams}
        >
          {busy ? "Mengundi..." : "Lanjut ke Undi Tim →"}
        </button>
      );
    }

    if (viewStep === "teams" && canEdit) {
      if (currentSnapshot.teams.length === 0) {
        return (
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy || !currentFlow.actions.includes("generate-teams")}
            onClick={generateTeams}
          >
            {busy ? "Mengundi..." : "Undi Tim →"}
          </button>
        );
      }

      return (
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy}
          onClick={lockTeams}
        >
          {busy ? "Mengunci..." : "Kunci Tim →"}
        </button>
      );
    }

    if (viewStep === "groups" && canEdit) {
      if (currentSnapshot.state === "pairing") {
        return null;
      }

      const canStart = currentFlow.actions.includes("start-knockout");
      return (
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy || !canStart}
          title={canStart ? undefined : "Selesaikan semua match grup"}
          onClick={startKnockout}
        >
          {busy ? "Memulai..." : "Mulai Knockout →"}
        </button>
      );
    }

    if (viewStep === "bracket") {
      return (
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setScreenMode(true)}
        >
          Mode layar →
        </button>
      );
    }

    return null;
  }

  return (
    <>
      <div className="min-h-screen">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-component px-page-x py-page-y">
            <div>
              <p className="text-caption uppercase tracking-wide text-muted-foreground">
                {canEdit ? "Mode organizer" : "Tampilan publik"}
              </p>
              <h1 className="text-display font-bold">{snapshot.name}</h1>
            </div>
            <div className="flex items-center gap-component-sm">
              <PhaseBadge phase={snapshot.state} />
              {canEdit && <Badge tone="primary">Admin</Badge>}
            </div>
          </div>
          <div className="mx-auto max-w-5xl px-page-x">
            <div className="flex flex-wrap items-center gap-component-sm pb-component">
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => void copyLink("public")}
              >
                {copiedLink === "public" ? "Tersalin!" : "Salin link publik"}
              </button>
              {canEdit && token && (
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => void copyLink("admin")}
                >
                  {copiedLink === "admin" ? "Tersalin!" : "Salin Admin Link"}
                </button>
              )}
              <span role="status" aria-live="polite" className="sr-only">
                {copiedLink === "public"
                  ? "Link publik tersalin."
                  : copiedLink === "admin"
                    ? "Admin Link tersalin."
                    : ""}
              </span>
            </div>
          </div>
          <div className="mx-auto max-w-5xl px-page-x pb-component-lg">
            <Stepper
              steps={flow.steps}
              activeStep={flow.activeStep}
              viewStep={viewStep}
              onSelect={setRequestedStep}
            />
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-page-x py-section">
          <div className="mb-section-sm">
            <p className="text-caption text-muted-foreground">
              Langkah {stepIndex + 1} dari 4
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-component-sm">
              <h2 className="text-heading font-semibold">{stepMeta.label}</h2>
              {stepStatus === "done" && <Badge tone="success">Selesai</Badge>}
              {stepStatus === "locked" && <Badge tone="neutral">Terkunci</Badge>}
            </div>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {stepMeta.description}
            </p>
          </div>

          <div className="card">
            {viewStep === "participants" && (
              <ParticipantsStep
                eventId={eventId}
                token={token}
                canEdit={canEdit}
                snapshot={snapshot}
                flow={flow}
                onChanged={refresh}
              />
            )}
            {viewStep === "teams" && (
              <TeamsStep
                eventId={eventId}
                token={token}
                canEdit={canEdit}
                snapshot={snapshot}
                onChanged={refresh}
              />
            )}
            {viewStep === "groups" && (
              <GroupsStep
                eventId={eventId}
                token={token}
                canEdit={canEdit}
                snapshot={snapshot}
                onChanged={refresh}
              />
            )}
            {viewStep === "bracket" && (
              <BracketStep
                eventId={eventId}
                token={token}
                canEdit={canEdit}
                snapshot={snapshot}
                onChanged={refresh}
              />
            )}
          </div>

          {flow.messages.length > 0 && (
            <div className="alert mt-component bg-warning-subtle text-caption text-warning-subtle-foreground">
              <ul className="list-disc pl-5">
                {flow.messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="mt-component">
              <ErrorMessage>{error}</ErrorMessage>
            </div>
          )}

          <div className="mt-component-lg flex flex-wrap items-center justify-between gap-component">
            <button
              className="btn btn-ghost"
              type="button"
              disabled={stepIndex === 0}
              onClick={() =>
                setRequestedStep(STEP_ORDER[Math.max(0, stepIndex - 1)])
              }
            >
              Kembali
            </button>
            {primaryAction()}
          </div>

          {canEdit && (
            <section className="mt-section-sm border-t border-border pt-component-lg">
              <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                Kontrol event
              </p>
              <div className="mt-component-sm flex flex-wrap gap-component-sm">
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  disabled={busy}
                  onClick={regenerateToken}
                >
                  Perbarui Admin Link
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  type="button"
                  disabled={busy}
                  onClick={removeEvent}
                >
                  Hapus Event
                </button>
              </div>

              {newAdminUrl && (
                <div className="alert mt-component bg-success-subtle text-success-subtle-foreground">
                  <p className="text-body-sm font-medium">
                    Admin Link diperbarui. Link lama tidak berlaku.
                  </p>
                  <p className="mt-component-sm break-all font-mono text-caption">
                    {absoluteUrl(newAdminUrl)}
                  </p>
                  <div className="mt-component-sm flex flex-wrap gap-component-sm">
                    <button
                      className="btn btn-primary btn-sm"
                      type="button"
                      onClick={() => void copyLink("new-admin")}
                    >
                      {copiedLink === "new-admin"
                        ? "Tersalin!"
                        : "Salin Admin Link Baru"}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => router.replace(newAdminUrl)}
                    >
                      Buka Admin Link Baru
                    </button>
                  </div>
                  <span role="status" aria-live="polite" className="sr-only">
                    {copiedLink === "new-admin"
                      ? "Admin Link baru tersalin."
                      : ""}
                  </span>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {presentation && (
        <div className="fixed inset-0 z-40 overflow-auto bg-background p-page-x md:p-section">
          <div className="mx-auto max-w-5xl">
            <div className="mb-section-sm flex flex-wrap items-center justify-between gap-component">
              <div>
                <p className="text-caption uppercase tracking-wide text-muted-foreground">
                  Mode layar
                </p>
                <h1 className="text-display font-bold">{snapshot.name}</h1>
              </div>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setScreenMode(false)}
              >
                Keluar mode layar
              </button>
            </div>
            {championTeam && (
              <div className="mb-component">
                <ChampionBanner name={formatTeamName(championTeam)} />
              </div>
            )}
            <div className="card">
              <BracketTree
                rounds={bracketRounds}
                canEdit={false}
                selectedId={null}
                onSelect={() => {}}
                presentation
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
