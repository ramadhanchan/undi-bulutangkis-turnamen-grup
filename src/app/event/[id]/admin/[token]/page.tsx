"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface EventData {
  id: string;
  name: string;
  state: string;
}

const PHASES = ["registration", "pairing", "group_stage", "knockout", "finished"] as const;

export default function AdminPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const token = params.token as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) {
          setError("Event not found");
          return;
        }
        const data = await res.json();
        setEvent(data);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
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
    } catch {
      alert("Network error");
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

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
      <p className="text-sm text-gray-500 mb-4">
        Phase: <span className="font-semibold">{event.state}</span>
      </p>
      <p className="text-xs text-gray-400 mb-6 font-mono">Admin token: {token}</p>

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