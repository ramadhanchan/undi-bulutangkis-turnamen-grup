"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Badge,
  ChampionBanner,
  EmptyState,
  ErrorMessage,
  PhaseBadge,
  Section,
} from "@/components/ui";

interface Participant {
  id: string;
  name: string;
}

interface TeamPlayer {
  id: string;
  name: string;
}

interface Team {
  id: string;
  player1: TeamPlayer;
  player2: TeamPlayer;
  groupNumber: number | null;
}

interface MatchSet {
  t1: number | null;
  t2: number | null;
}

interface Match {
  id: string;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
  phase: string;
  groupNumber: number | null;
  round: number;
  sets: MatchSet[];
  winnerTeamId: string | null;
  isWalkover: boolean;
  playedAt: string | null;
}

interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  pointsScored: number;
  pointsConceded: number;
  pointDiff: number;
  setsWon: number;
  setsLost: number;
  qualified: boolean;
}

interface GroupStanding {
  group: number;
  standings: Standing[];
}

interface EventData {
  id: string;
  name: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  teams: Team[];
  matches: Match[];
  standings: GroupStanding[];
  bracket: unknown;
  champion: string | null;
}

function MatchRow({ match }: { match: Match }) {
  const played = match.sets.some((s) => s.t1 !== null);
  const score = match.sets
    .filter((s) => s.t1 !== null)
    .map((s) => `${s.t1}-${s.t2}`)
    .join(", ");

  return (
    <li className="card !p-component">
      <div className="flex flex-wrap items-center gap-component-sm">
        <span
          className={
            match.winnerTeamId === match.team1.id
              ? "font-semibold text-success"
              : "font-medium"
          }
        >
          {match.team1.name}
        </span>
        <span className="text-muted-foreground">vs</span>
        <span
          className={
            match.winnerTeamId === match.team2.id
              ? "font-semibold text-success"
              : "font-medium"
          }
        >
          {match.team2.name}
        </span>
        {played && (
          <span className="text-body-sm text-muted-foreground">({score})</span>
        )}
        {match.isWalkover && <Badge tone="warning">W.O.</Badge>}
      </div>
    </li>
  );
}

export default function EventPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regName, setRegName] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

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
        setError(null);
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const es = new EventSource(`/api/events/${id}/stream`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "phase_transition") {
          setEvent((prev) => (prev ? { ...prev, state: msg.state } : prev));
        }
        if (msg.type === "event_deleted") {
          setError("This event has been deleted");
        }
        if (msg.type !== "connected") {
          // Refetch on broadcast
          fetch(`/api/events/${id}`)
            .then((r) => r.json())
            .then((data) => setEvent(data))
            .catch(() => {});
        }
      } catch {
        // ignore parse errors
      }
    };
    return () => es.close();
  }, [id]);

  if (loading)
    return <main className="p-page-y text-muted-foreground">Loading...</main>;
  if (error)
    return <main className="p-page-y text-danger-subtle-foreground">{error}</main>;
  if (!event) return <main className="p-page-y">Event not found</main>;

  const knockoutMatches = event.matches.filter((m) => m.phase === "knockout");
  const rounds = Array.from(new Set(knockoutMatches.map((m) => m.round))).sort(
    (a, b) => a - b
  );
  const finalRound = rounds.length > 0 ? rounds[rounds.length - 1] : 0;
  const championMatch = event.champion
    ? event.matches.find((m) => m.winnerTeamId === event.champion)
    : undefined;
  const championName = championMatch
    ? championMatch.team1.id === event.champion
      ? championMatch.team1.name
      : championMatch.team2.name
    : null;

  return (
    <main className="mx-auto max-w-4xl px-page-x py-page-y">
      <header className="mb-section">
        <h1 className="text-display font-bold">{event.name}</h1>
        <div className="mt-component-sm flex items-center gap-component-sm">
          <span className="text-body-sm text-muted-foreground">Phase</span>
          <PhaseBadge phase={event.state} />
        </div>
      </header>

      {/* Participants */}
      <Section title="Participants" count={event.participants.length}>
        {event.state === "registration" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setRegLoading(true);
              setRegError(null);
              try {
                const res = await fetch(`/api/events/${id}/participants`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: regName }),
                });
                const data = await res.json();
                if (!res.ok) {
                  setRegError(data.error || "Registration failed");
                  return;
                }
                setRegName("");
              } catch {
                setRegError("Network error");
              } finally {
                setRegLoading(false);
              }
            }}
            className="mb-component flex gap-component-sm"
          >
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Your name"
              className="input flex-1"
              required
            />
            <button type="submit" disabled={regLoading} className="btn btn-primary">
              {regLoading ? "..." : "Register"}
            </button>
          </form>
        )}
        {regError && (
          <div className="mb-component">
            <ErrorMessage>{regError}</ErrorMessage>
          </div>
        )}
        {event.participants.length === 0 ? (
          <EmptyState>No participants registered yet.</EmptyState>
        ) : (
          <ul className="list-inside list-disc text-body-sm">
            {event.participants.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        )}
      </Section>

      {/* Teams */}
      <Section title="Teams" count={event.teams.length}>
        {event.teams.length === 0 ? (
          <EmptyState>No teams formed yet.</EmptyState>
        ) : (
          <ul className="space-y-component-sm text-body-sm">
            {event.teams.map((t) => (
              <li key={t.id}>
                {t.player1.name} / {t.player2.name}
                {t.groupNumber !== null && (
                  <span className="ml-component-sm text-muted-foreground">
                    (Group {t.groupNumber})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Matches */}
      <Section title="Matches" count={event.matches.length}>
        {event.matches.length === 0 ? (
          <EmptyState>No matches scheduled yet.</EmptyState>
        ) : (
          <ul className="space-y-component-sm">
            {event.matches.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </ul>
        )}
      </Section>

      {/* Standings */}
      <Section title="Standings">
        {event.standings.length === 0 ? (
          <EmptyState>No standings yet.</EmptyState>
        ) : (
          event.standings.map((g) => (
            <div key={g.group} className="mb-component-lg">
              <h3 className="mb-component-sm text-body-sm font-medium">
                Group {g.group}
              </h3>
              <table className="table">
                <thead>
                  <tr>
                    <th className="num">#</th>
                    <th>Team</th>
                    <th className="num">P</th>
                    <th className="num">W</th>
                    <th className="num">Pts</th>
                    <th className="num">PD</th>
                    <th className="num">SW</th>
                  </tr>
                </thead>
                <tbody>
                  {g.standings.map((s, idx) => (
                    <tr key={s.teamId} data-qualified={s.qualified}>
                      <td className="num">{idx + 1}</td>
                      <td>
                        {s.teamName}
                        {s.qualified && (
                          <span className="ml-component-sm text-caption text-success-subtle-foreground">
                            Qualified
                          </span>
                        )}
                      </td>
                      <td className="num">{s.played}</td>
                      <td className="num">{s.won}</td>
                      <td className="num">{s.points}</td>
                      <td className="num">{s.pointDiff}</td>
                      <td className="num">{s.setsWon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </Section>

      {/* Bracket */}
      <Section title="Knockout Bracket">
        {championName && (
          <div className="mb-component">
            <ChampionBanner name={championName} />
          </div>
        )}
        {knockoutMatches.length === 0 ? (
          <EmptyState>No bracket yet.</EmptyState>
        ) : (
          <div className="space-y-component-lg">
            {rounds.map((round) => (
              <div key={round}>
                <h3 className="mb-component-sm text-body-sm font-medium">
                  {round === finalRound ? "Final" : `Round ${round}`}
                </h3>
                <ul className="space-y-component-sm">
                  {knockoutMatches
                    .filter((m) => m.round === round)
                    .map((m) => (
                      <MatchRow key={m.id} match={m} />
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}
