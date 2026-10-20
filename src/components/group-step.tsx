"use client";

import { useState } from "react";
import { BracketTree } from "@/components/bracket-step";
import type { EventStepProps } from "@/components/event-step-types";
import { Badge, EmptyState, ErrorMessage } from "@/components/ui";
import {
  MatchScoreCard,
  matchScoreKey,
} from "@/components/match-score-card";
import { requestJson } from "@/lib/client";
import type { EventSnapshot } from "@/lib/event-snapshot";
import { formatTeamName } from "@/lib/format";
import type { GroupSummary } from "@/lib/schedule";

function GroupDrawPanel({
  eventId,
  token,
  canEdit,
  snapshot,
  onChanged,
}: EventStepProps) {
  const [preview, setPreview] = useState<{
    groups: string[][];
    summary: GroupSummary;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function teamName(teamId: string): string {
    const team = snapshot.teams.find((entry) => entry.id === teamId);
    return team ? formatTeamName(team) : teamId;
  }

  async function draw() {
    if (!token) return;

    setBusy(true);
    setError(null);
    const result = await requestJson<{
      groups?: string[][];
      summary?: GroupSummary;
      error?: string;
    }>(`/api/events/${eventId}/groups/draw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!result.ok || !result.data?.groups || !result.data.summary) {
      setError(result.data?.error ?? "Gagal mengundi grup.");
      setBusy(false);
      return;
    }
    setPreview({
      groups: result.data.groups,
      summary: result.data.summary,
    });
    setBusy(false);
  }

  async function confirm() {
    if (!token || !preview) return;
    const { teamCount, groupCount, groupSizes, matchCount } = preview.summary;
    if (
      !window.confirm(
        `${teamCount} tim → ${groupCount} grup (${groupSizes.join(
          " + "
        )}), ${matchCount} match grup. Mulai grup?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await requestJson<{ error?: string }>(
      `/api/events/${eventId}/groups/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, groups: preview.groups }),
      }
    );
    if (!result.ok) {
      setError(result.data?.error ?? "Gagal memulai grup.");
      setBusy(false);
      return;
    }
    onChanged();
    setBusy(false);
  }

  if (!canEdit) {
    return <EmptyState>Undi grup belum dilakukan.</EmptyState>;
  }

  return (
    <div className="space-y-component-lg">
      <div className="flex flex-wrap items-center justify-between gap-component-sm">
        <div>
          <p className="text-body-sm font-medium">Undi grup</p>
          <p className="text-caption text-muted-foreground">
            Tim dibagi ke grup 3–4, diutamakan 4 tim per grup.
          </p>
        </div>
        {!preview && (
          <button
            className="btn btn-primary btn-sm"
            type="button"
            disabled={busy}
            onClick={draw}
          >
            {busy ? "Mengundi..." : "Undi Grup"}
          </button>
        )}
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {preview && (
        <div className="space-y-component">
          <div className="rounded-card border border-border bg-surface-muted p-component">
            <p className="text-body-sm font-medium">
              {preview.summary.teamCount} tim → {preview.summary.groupCount}{" "}
              grup ({preview.summary.groupSizes.join(" + ")})
            </p>
            <p className="text-caption text-muted-foreground">
              {preview.summary.matchCount} match grup round-robin.
            </p>
          </div>

          <div className="grid gap-component-sm sm:grid-cols-2">
            {preview.groups.map((group, index) => (
              <div key={index} className="card !p-component">
                <p className="text-body-sm font-medium">Grup {index + 1}</p>
                <ul className="mt-component-sm space-y-component-sm text-body-sm">
                  {group.map((teamId) => (
                    <li key={teamId}>{teamName(teamId)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-component-sm">
            <button
              className="btn btn-outline"
              type="button"
              disabled={busy}
              onClick={draw}
            >
              {busy ? "Mengundi..." : "Undi Ulang"}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy}
              onClick={confirm}
            >
              {busy ? "Memulai..." : "Mulai Grup"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type StandingRows = EventSnapshot["standings"][number]["standings"];

function StandingsTable({ standings }: { standings: StandingRows }) {
  return (
    <div>
      <p className="mb-component-sm text-caption font-medium uppercase tracking-wide text-muted-foreground">
        Klasemen
      </p>
      <div className="overflow-x-auto">
        <table className="table">
        <thead>
          <tr>
            <th className="num">#</th>
            <th>Tim</th>
            <th className="num">P</th>
            <th className="num">W</th>
            <th className="num">Pts</th>
            <th className="num">PD</th>
            <th className="num">SW</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, index) => (
            <tr key={standing.teamId} data-qualified={standing.qualified}>
              <td className="num">{index + 1}</td>
              <td>
                <span className={standing.qualified ? "font-medium" : ""}>
                  {standing.teamName}
                </span>
                {standing.qualified && (
                  <span className="ml-2 text-caption text-success-subtle-foreground">
                    Lolos
                  </span>
                )}
              </td>
              <td className="num">{standing.played}</td>
              <td className="num">{standing.won}</td>
              <td className="num font-medium">{standing.points}</td>
              <td className="num">{standing.pointDiff}</td>
              <td className="num">{standing.setsWon}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

export function GroupsStep({
  eventId,
  token,
  canEdit,
  snapshot,
  onChanged,
}: EventStepProps) {
  if (snapshot.state === "pairing") {
    return (
      <GroupDrawPanel
        eventId={eventId}
        token={token}
        canEdit={canEdit}
        snapshot={snapshot}
        onChanged={onChanged}
      />
    );
  }

  const groupMatches = snapshot.matches.filter(
    (match) => match.phase === "group"
  );
  const groupNumbers = [
    ...new Set(
      groupMatches
        .map((match) => match.groupNumber)
        .filter((group): group is number => group !== null)
    ),
  ].sort((left, right) => left - right);

  if (groupNumbers.length === 0) {
    return <EmptyState>Belum ada grup.</EmptyState>;
  }

  const unfinished = groupMatches.filter(
    (match) => match.winnerTeamId === null
  );
  const canEditScores = canEdit && snapshot.state === "group_stage";

  return (
    <div className="space-y-component-lg">
      {unfinished.length > 0 && (
        <div className="alert bg-warning-subtle text-caption text-warning-subtle-foreground">
          <p className="font-medium">Match grup belum selesai</p>
          <ul className="mt-component-sm list-disc pl-5">
            {unfinished.map((match) => (
              <li key={match.id}>
                {match.team1?.name ?? "TBD"} vs {match.team2?.name ?? "TBD"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {groupNumbers.map((groupNumber) => {
        const standings =
          snapshot.standings.find((group) => group.group === groupNumber)
            ?.standings ?? [];
        const matches = groupMatches.filter(
          (match) => match.groupNumber === groupNumber
        );

        return (
          <section key={groupNumber} className="card">
            <div className="mb-component-sm flex items-center justify-between gap-component-sm">
              <h3 className="text-heading-sm font-semibold">
                Grup {groupNumber}
              </h3>
              <Badge tone="neutral">{standings.length} tim</Badge>
            </div>

            <StandingsTable standings={standings} />

            <div className="mt-component space-y-component-sm">
              <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                Match
              </p>
              {matches.map((match) => (
                <MatchScoreCard
                  key={matchScoreKey(match)}
                  eventId={eventId}
                  token={token}
                  canEdit={canEditScores}
                  match={match}
                  onChanged={onChanged}
                />
              ))}
            </div>
          </section>
        );
      })}

      {snapshot.previewBracket.length > 0 && (
        <section className="space-y-component-sm">
          <div className="flex flex-wrap items-center justify-between gap-component-sm">
            <h3 className="text-heading-sm font-semibold">Preview Bagan</h3>
            <Badge tone="neutral">Dari klasemen saat ini</Badge>
          </div>
          <p className="text-caption text-muted-foreground">
            Slot TBD akan diisi saat knockout dimulai. Preview ini tidak
            disimpan.
          </p>
          <BracketTree
            rounds={snapshot.previewBracket}
            canEdit={false}
            selectedId={null}
            onSelect={() => {}}
          />
        </section>
      )}
    </div>
  );
}
