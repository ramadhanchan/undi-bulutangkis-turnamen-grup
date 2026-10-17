"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
    <div className="border rounded p-3 bg-gray-50">
      <div className="font-medium text-sm mb-2">
        {match.team1.name} vs {match.team2.name}
        {match.winnerTeamId && (
          <span className="text-green-600 ml-2">
            (Winner: {match.winnerTeamId === match.team1.id ? match.team1.name : match.team2.name})
          </span>
        )}
      </div>
      {!alreadyPlayed && (
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block mb-1">{match.team1.name}</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={s1t1}
                  onChange={(e) => setS1t1(e.target.value)}
                  placeholder="S1"
                  className="border rounded px-2 py-1 w-12"
                  min="0"
                />
                <input
                  type="number"
                  value={s2t1}
                  onChange={(e) => setS2t1(e.target.value)}
                  placeholder="S2"
                  className="border rounded px-2 py-1 w-12"
                  min="0"
                />
                <input
                  type="number"
                  value={s3t1}
                  onChange={(e) => setS3t1(e.target.value)}
                  placeholder="S3"
                  className="border rounded px-2 py-1 w-12"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1">{match.team2.name}</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={s1t2}
                  onChange={(e) => setS1t2(e.target.value)}
                  placeholder="S1"
                  className="border rounded px-2 py-1 w-12"
                  min="0"
                />
                <input
                  type="number"
                  value={s2t2}
                  onChange={(e) => setS2t2(e.target.value)}
                  placeholder="S2"
                  className="border rounded px-2 py-1 w-12"
                  min="0"
                />
                <input
                  type="number"
                  value={s3t2}
                  onChange={(e) => setS3t2(e.target.value)}
                  placeholder="S3"
                  className="border rounded px-2 py-1 w-12"
                  min="0"
                />
              </div>
            </div>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Score"}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={saving}
              className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50"
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

  if (loading) return <main className="p-8">Loading...</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!event) return <main className="p-8">Event not found</main>;

  const currentIdx = PHASES.indexOf(event.state as (typeof PHASES)[number]);
  const nextPhase = currentIdx < PHASES.length - 1 ? PHASES[currentIdx + 1] : null;
  const canPair = event.state === "pairing" || event.state === "registration";

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
      <p className="text-sm text-gray-500 mb-4">
        Phase: <span className="font-semibold">{event.state}</span>
      </p>
      <p className="text-xs text-gray-400 mb-6 font-mono">Admin token: {token}</p>

      {/* Pairing controls */}
      {canPair && (
        <div className="mb-6 space-y-3">
          <button
            onClick={handleGeneratePairings}
            disabled={pairingLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {pairingLoading ? "Generating..." : teams.length > 0 ? "Re-shuffle" : "Generate Pairings"}
          </button>
          {teams.length > 0 && (
            <div className="border rounded p-3 bg-gray-50">
              <h3 className="font-semibold mb-2">Current Teams</h3>
              <ul className="space-y-1 text-sm">
                {teams.map((t) => (
                  <li key={t.id}>
                    {t.player1.name} / {t.player2.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Score input for group stage matches */}
      {event.state === "group_stage" && matches.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Group Stage Matches</h2>
          <div className="space-y-4">
            {matches
              .filter((m) => m.phase === "group")
              .map((m) => (
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
        </div>
      )}

      {/* Score input for knockout matches */}
      {event.state === "knockout" && matches.filter((m) => m.phase === "knockout").length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Knockout Matches</h2>
          <div className="space-y-4">
            {matches
              .filter((m) => m.phase === "knockout")
              .map((m) => (
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
        </div>
      )}
      <div className="space-y-3">
        {nextPhase && (
          <button
            onClick={() => handleTransition(nextPhase)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Transition to {nextPhase}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Event"}
        </button>
      </div>
    </main>
  );
}