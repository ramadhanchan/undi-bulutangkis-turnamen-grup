"use client";

import { useState, type FormEvent } from "react";
import { Badge, ErrorMessage } from "@/components/ui";
import { requestJson } from "@/lib/client";
import { formatScore } from "@/lib/format";

export interface ScoreableMatch {
  id: string;
  team1: { id: string; name: string } | null;
  team2: { id: string; name: string } | null;
  sets: { t1: number | null; t2: number | null }[];
  winnerTeamId: string | null;
  isWalkover: boolean;
}

export function matchScoreKey(match: ScoreableMatch): string {
  const score = match.sets
    .map((set) => `${set.t1 ?? ""}:${set.t2 ?? ""}`)
    .join(",");
  return `${match.id}-${match.winnerTeamId ?? "open"}-${score}`;
}

interface MatchScoreCardProps {
  eventId: string;
  token?: string;
  canEdit: boolean;
  match: ScoreableMatch;
  onChanged: () => void;
}

export function MatchScoreCard({
  eventId,
  token,
  canEdit,
  match,
  onChanged,
}: MatchScoreCardProps) {
  const [values, setValues] = useState(() =>
    match.sets.map((set) => ({
      t1: set.t1?.toString() ?? "",
      t2: set.t2?.toString() ?? "",
    }))
  );
  const [editing, setEditing] = useState(false);
  const [walkoverWinnerId, setWalkoverWinnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const team1 = match.team1;
  const team2 = match.team2;
  if (!team1 || !team2) {
    return (
      <div className="card !p-component text-body-sm text-muted-foreground">
        TBD vs TBD
      </div>
    );
  }

  const played = match.winnerTeamId !== null;
  const showForm = canEdit && (editing || !played);

  function updateSet(index: number, side: "t1" | "t2", value: string) {
    setValues((previous) =>
      previous.map((set, setIndex) =>
        setIndex === index ? { ...set, [side]: value } : set
      )
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    const sets: { t1: number; t2: number }[] = [];
    for (const set of values) {
      const t1 = set.t1.trim();
      const t2 = set.t2.trim();
      if (!t1 && !t2) continue;
      if (!t1 || !t2) {
        setError("Isi kedua skor set atau kosongkan keduanya.");
        return;
      }
      const number1 = Number(t1);
      const number2 = Number(t2);
      if (
        !Number.isInteger(number1) ||
        !Number.isInteger(number2) ||
        number1 < 0 ||
        number2 < 0
      ) {
        setError("Skor harus berupa angka bulat positif.");
        return;
      }
      sets.push({ t1: number1, t2: number2 });
    }
    if (sets.length < 2) {
      setError("Minimal 2 set harus diisi.");
      return;
    }

    setBusy(true);
    setError(null);
    const result = await requestJson<{ error?: string }>(
      `/api/events/${eventId}/matches/${match.id}/score`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sets }),
      }
    );
    if (!result.ok) {
      setError(result.data?.error ?? "Gagal menyimpan skor.");
      setBusy(false);
      return;
    }
    setEditing(false);
    onChanged();
    setBusy(false);
  }

  async function walkover() {
    if (!token || !walkoverWinnerId || !team1 || !team2) return;
    const winner = walkoverWinnerId === team1.id ? team1 : team2;
    if (!window.confirm(`Catat walkover untuk ${winner.name}?`)) return;

    setBusy(true);
    setError(null);
    const result = await requestJson<{ error?: string }>(
      `/api/events/${eventId}/matches/${match.id}/score`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          sets: [],
          isWalkover: true,
          walkoverWinnerId,
        }),
      }
    );
    if (!result.ok) {
      setError(result.data?.error ?? "Gagal mencatat walkover.");
      setBusy(false);
      return;
    }
    setWalkoverWinnerId("");
    setEditing(false);
    onChanged();
    setBusy(false);
  }

  return (
    <div className="card !p-component">
      <div className="flex flex-wrap items-center justify-between gap-component-sm">
        <div className="min-w-0 text-body-sm">
          <span
            className={
              match.winnerTeamId === team1.id
                ? "font-semibold text-success-subtle-foreground"
                : ""
            }
          >
            {team1.name}
          </span>
          <span className="mx-1 text-caption text-muted-foreground">vs</span>
          <span
            className={
              match.winnerTeamId === team2.id
                ? "font-semibold text-success-subtle-foreground"
                : ""
            }
          >
            {team2.name}
          </span>
        </div>
        <div className="flex items-center gap-component-sm">
          <span className="shrink-0 font-mono text-caption text-muted-foreground">
            {formatScore(match.sets)}
          </span>
          {match.isWalkover && <Badge tone="warning">W.O.</Badge>}
          {canEdit && played && !editing && (
            <button
              type="button"
              className="text-caption text-primary underline-offset-2 hover:underline"
              onClick={() => setEditing(true)}
            >
              Koreksi skor
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="mt-component-sm space-y-component-sm">
          <div className="grid gap-component-sm sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            <div>
              <p className="mb-1 truncate text-caption text-muted-foreground">
                {team1.name}
              </p>
              <div className="flex gap-1">
                {[0, 1, 2].map((index) => (
                  <input
                    key={`t1-${index}`}
                    className="input h-8 w-10 px-1 text-center sm:w-12 sm:px-2"
                    value={values[index]?.t1 ?? ""}
                    onChange={(event) =>
                      updateSet(index, "t1", event.target.value)
                    }
                    placeholder={`S${index + 1}`}
                    inputMode="numeric"
                    aria-label={`Set ${index + 1} ${team1.name}`}
                  />
                ))}
              </div>
            </div>
            <span className="hidden pt-6 text-caption text-muted-foreground sm:block">
              vs
            </span>
            <div>
              <p className="mb-1 truncate text-caption text-muted-foreground">
                {team2.name}
              </p>
              <div className="flex gap-1">
                {[0, 1, 2].map((index) => (
                  <input
                    key={`t2-${index}`}
                    className="input h-8 w-10 px-1 text-center sm:w-12 sm:px-2"
                    value={values[index]?.t2 ?? ""}
                    onChange={(event) =>
                      updateSet(index, "t2", event.target.value)
                    }
                    placeholder={`S${index + 1}`}
                    inputMode="numeric"
                    aria-label={`Set ${index + 1} ${team2.name}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-component-sm">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={busy}
            >
              {busy
                ? "Menyimpan..."
                : played
                  ? "Simpan koreksi"
                  : "Simpan skor"}
            </button>
            {editing && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
              >
                Batal
              </button>
            )}
            <select
              className="input h-8 w-auto px-2 text-caption"
              value={walkoverWinnerId}
              onChange={(event) => setWalkoverWinnerId(event.target.value)}
              disabled={busy}
              aria-label="Pilih pemenang walkover"
            >
              <option value="">Walkover — pilih pemenang</option>
              <option value={team1.id}>{team1.name}</option>
              <option value={team2.id}>{team2.name}</option>
            </select>
            <button
              type="button"
              className="btn btn-warning btn-sm"
              disabled={busy || !walkoverWinnerId}
              onClick={walkover}
            >
              Walkover
            </button>
          </div>

          {error && <ErrorMessage>{error}</ErrorMessage>}
        </form>
      )}
    </div>
  );
}
