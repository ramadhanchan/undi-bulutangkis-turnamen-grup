"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

interface EventData {
  id: string;
  name: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  teams: Team[];
  matches: Match[];
  standings: unknown[];
  bracket: unknown;
}

export default function EventPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <main className="p-8">Loading...</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!event) return <main className="p-8">Event not found</main>;

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Phase: <span className="font-semibold">{event.state}</span>
      </p>

      {/* Participants */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">
          Participants ({event.participants.length})
        </h2>
        {event.participants.length === 0 ? (
          <p className="text-gray-400 text-sm">No participants registered yet.</p>
        ) : (
          <ul className="list-disc list-inside text-sm">
            {event.participants.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Teams */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">
          Teams ({event.teams.length})
        </h2>
        {event.teams.length === 0 ? (
          <p className="text-gray-400 text-sm">No teams formed yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {event.teams.map((t) => (
              <li key={t.id}>
                {t.player1.name} / {t.player2.name}
                {t.groupNumber !== null && (
                  <span className="text-gray-400 ml-2">(Group {t.groupNumber})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Matches */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">
          Matches ({event.matches.length})
        </h2>
        {event.matches.length === 0 ? (
          <p className="text-gray-400 text-sm">No matches scheduled yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {event.matches.map((m) => (
              <li key={m.id} className="border rounded p-2">
                <span className="font-medium">{m.team1.name}</span>
                {" vs "}
                <span className="font-medium">{m.team2.name}</span>
                {m.isWalkover && <span className="text-orange-500 ml-2">(W.O.)</span>}
                {m.winnerTeamId && (
                  <span className="text-green-600 ml-2">
                    Winner: {m.winnerTeamId === m.team1.id ? m.team1.name : m.team2.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Standings */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Standings</h2>
        {event.standings.length === 0 ? (
          <p className="text-gray-400 text-sm">No standings yet.</p>
        ) : (
          <p className="text-sm">Standings data available.</p>
        )}
      </section>

      {/* Bracket */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Bracket</h2>
        {!event.bracket ? (
          <p className="text-gray-400 text-sm">No bracket yet.</p>
        ) : (
          <p className="text-sm">Bracket data available.</p>
        )}
      </section>
    </main>
  );
}