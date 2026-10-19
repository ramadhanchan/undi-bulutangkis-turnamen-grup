"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmptyState, ErrorMessage, PhaseBadge, Section } from "@/components/ui";

interface EventData {
  id: string;
  name: string;
  state: string;
}

interface Team {
  id: string;
  player1: { id: string; name: string };
  player2: { id: string; name: string };
}

interface Match {
  id: string;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
  phase: string;
  groupNumber: number | null;
  round: number;
  sets: { t1: number | null; t2: number | null }[];
  winnerTeamId: string | null;
  isWalkover: boolean;
}

const PHASES = ["registration", "pairing", "group_stage", "knockout", "finished"] as const;

function MatchScoreForm({
  match,
  token,
  eventId,
  onSaved,
}: {
  match: Match;
  token: string;
  eventId: string;
  onSaved: () => void;
}) {
  const [s1t1, setS1t1] = useState(match.sets[0]?.t1?.toString() || "");
  const [s1t2, setS1t2] = useState(match.sets[0]?.t2?.toString() || "");
  const [s2t1, setS2t1] = useState(match.sets[1]?.t1?.toString() || "");
  const [s2t2, setS2t2] = useState(match.sets[1]?.t2?.toString() || "");
  const [s3t1, setS3t1] = useState(match.sets[2]?.t1?.toString() || "");
  const [s3t2, setS3t2] = useState(match.sets[2]?.t2?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent, isWalkover: boolean) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const sets = isWalkover
        ? undefined
        : [
            { t1: Number(s1t1) || 0, t2: Number(s1t2) || 0 },
            { t1: Number(s2t1) || 0, t2: Number(s2t2) || 0 },
            { t1: Number(s3t1) || 0, t2: Number(s3t2) || 0 },
          ].filter((s) => s.t1 > 0 || s.t2 > 0);

      const res = await fetch(`/api/events/${eventId}/matches/${match.id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          sets: isWalkover ? [] : sets,
          isWalkover,
          walkoverWinnerId: isWalkover ? match.team2.id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const alreadyPlayed = match.winnerTeamId !== null;

  return (
    <div className="card !p-component">
      <div className="mb-component-sm text-body-sm font-medium">
        {match.team1.name} vs {match.team2.name}
        {match.winnerTeamId && (
          <span className="ml-component-sm text-success">
            (Winner:{" "}
            {match.winnerTeamId === match.team1.id
              ? match.team1.name
              : match.team2.name}
          </span>
        )}
      </div>
      {!alreadyPlayed && (
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-component-sm">
          <div className="grid grid-cols-2 gap-component-sm text-caption">
            <div>
              <label className="mb-component-sm block">{match.team1.name}</label>
              <div className="flex gap-component-sm">
                <input
                  type="number"
                  value={s1t1}
                  onChange={(e) => setS1t1(e.target.value)}
                  placeholder="S1"
                  className="input h-8! w-12! px-2!"
                  min="0"
                />
                <input
                  type="number"
                  value={s2t1}
                  onChange={(e) => setS2t1(e.target.value)}
                  placeholder="S2"
                  className="input h-8! w-12! px-2!"
                  min="0"
                />
                <input
                  type="number"
                  value={s3t1}
                  onChange={(e) => setS3t1(e.target.value)}
                  placeholder="S3"
                  className="input h-8! w-12! px-2!"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="mb-component-sm block">{match.team2.name}</label>
              <div className="flex gap-component-sm">
                <input
                  type="number"
                  value={s1t2}
                  onChange={(e) => setS1t2(e.target.value)}
                  placeholder="S1"
                  className="input h-8! w-12! px-2!"
                  min="0"
                />
                <input
                  type="number"
                  value={s2t2}
                  onChange={(e) => setS2t2(e.target.value)}
                  placeholder="S2"
                  className="input h-8! w-12! px-2!"
                  min="0"
                />
                <input
                  type="number"
                  value={s3t2}
                  onChange={(e) => setS3t2(e.target.value)}
                  placeholder="S3"
                  className="input h-8! w-12! px-2!"
                  min="0"
                />
              </div>
            </div>
          </div>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <div className="flex gap-component-sm">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-sm"
            >
              {saving ? "Saving..." : "Save Score"}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={saving}
              className="btn btn-warning btn-sm"
            >
              Walkover
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function AdminPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const token = params.token as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (cancelled) return;
        if (!res.ok) {
          setError("Event not found");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setEvent(data);
        if (data.matches) setMatches(data.matches);
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    async function loadTeams() {
      try {
        const res = await fetch(`/api/events/${id}/pairings`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setTeams(data);
        }
      } catch {
        // ignore
      }
    }
    load();
    loadTeams();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleTransition(targetState: string) {
    try {
      const res = await fetch(`/api/events/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, targetState }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Transition failed");
        return;
      }
      setEvent((prev) => (prev ? { ...prev, state: data.state } : prev));
      // Refetch matches after transition
      const evRes = await fetch(`/api/events/${id}`);
      if (evRes.ok) {
        const evData = await evRes.json();
        if (evData.matches) setMatches(evData.matches);
      }
    } catch {
      alert("Network error");
    }
  }

  async function handleGeneratePairings() {
    setPairingLoading(true);
    try {
      const res = await fetch(`/api/events/${id}/pairings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Pairing failed");
        return;
      }
      setTeams(data);
    } catch {
      alert("Network error");
    } finally {
      setPairingLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this event permanently?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${id}?token=${token}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Delete failed");
        return;
      }
      router.push("/");
    } catch {
      alert("Network error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading)
    return <main className="p-page-y text-muted-foreground">Loading...</main>;
  if (error)
    return <main className="p-page-y text-danger-subtle-foreground">{error}</main>;
  if (!event) return <main className="p-page-y">Event not found</main>;

  const currentIdx = PHASES.indexOf(event.state as (typeof PHASES)[number]);
  const nextPhase = currentIdx < PHASES.length - 1 ? PHASES[currentIdx + 1] : null;
  const canPair = event.state === "pairing" || event.state === "registration";
  const groupMatches = matches.filter((m) => m.phase === "group");
  const knockoutMatches = matches.filter((m) => m.phase === "knockout");

  return (
    <main className="mx-auto max-w-3xl px-page-x py-page-y">
      <header className="mb-section">
        <h1 className="text-display font-bold">{event.name}</h1>
        <div className="mt-component-sm flex items-center gap-component-sm">
          <span className="text-body-sm text-muted-foreground">Phase</span>
          <PhaseBadge phase={event.state} />
        </div>
        <p className="mt-component-sm font-mono text-caption text-muted-foreground">
          Admin token: {token}
        </p>
      </header>

      {/* Pairing controls */}
      {canPair && (
        <Section title="Pairing">
          <button
            onClick={handleGeneratePairings}
            disabled={pairingLoading}
            className="btn btn-primary"
          >
            {pairingLoading
              ? "Generating..."
              : teams.length > 0
                ? "Re-shuffle"
                : "Generate Pairings"}
          </button>
          {teams.length > 0 && (
            <div className="card mt-component">
              <h3 className="mb-component-sm font-semibold">Current Teams</h3>
              <ul className="space-y-component-sm text-body-sm">
                {teams.map((t) => (
                  <li key={t.id}>
                    {t.player1.name} / {t.player2.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* Score input for group stage matches */}
      {event.state === "group_stage" && groupMatches.length > 0 && (
        <Section title="Group Stage Matches" count={groupMatches.length}>
          <div className="space-y-component-lg">
            {groupMatches.map((m) => (
              <MatchScoreForm
                key={m.id}
                match={m}
                token={token}
                eventId={id}
                onSaved={() => {
                  fetch(`/api/events/${id}`)
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.matches) setMatches(data.matches);
                    })
                    .catch(() => {});
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Score input for knockout matches */}
      {event.state === "knockout" && knockoutMatches.length > 0 && (
        <Section title="Knockout Matches" count={knockoutMatches.length}>
          <div className="space-y-component-lg">
            {knockoutMatches.map((m) => (
              <MatchScoreForm
                key={m.id}
                match={m}
                token={token}
                eventId={id}
                onSaved={() => {
                  fetch(`/api/events/${id}`)
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.matches) setMatches(data.matches);
                    })
                    .catch(() => {});
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {event.state === "registration" && (
        <Section title="Participants">
          <EmptyState>
            Waiting for participants to register before generating pairings.
          </EmptyState>
        </Section>
      )}

      <div className="space-y-component">
        {nextPhase && (
          <button
            onClick={() => handleTransition(nextPhase)}
            className="btn btn-success"
          >
            Transition to {nextPhase}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-danger"
        >
          {deleting ? "Deleting..." : "Delete Event"}
        </button>
      </div>
    </main>
  );
}
