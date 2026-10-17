"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface EventData {
  id: string;
  name: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export default function EventPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
      <p className="text-sm text-gray-500 mb-4">
        Phase: <span className="font-semibold">{event.state}</span>
      </p>
      <div className="border rounded p-4 bg-gray-50">
        <p className="text-gray-600 text-sm">
          Participants, teams, matches, standings, and bracket will appear here
          as the tournament progresses.
        </p>
      </div>
    </main>
  );
}