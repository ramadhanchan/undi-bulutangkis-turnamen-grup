"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, PhaseBadge } from "@/components/ui";
import {
  listSavedEvents,
  removeSavedEvent,
  saveEvent,
  type SavedEvent,
} from "@/lib/saved-events";

interface SavedEventView extends SavedEvent {
  state?: string;
  deleted?: boolean;
}

export default function Home() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string;
    name: string;
    adminToken: string;
    adminUrl: string;
  } | null>(null);
  const [savedEvents, setSavedEvents] = useState<SavedEventView[]>([]);
  const router = useRouter();

  useEffect(() => {
    const saved = listSavedEvents();
    if (saved.length === 0) return;
    let cancelled = false;

    Promise.all(
      saved.map(async (event): Promise<SavedEventView> => {
        try {
          const res = await fetch(`/api/events/${event.id}`);
          if (!res.ok) return { ...event, deleted: true };
          const data = await res.json();
          return { ...event, state: data.state as string };
        } catch {
          return event;
        }
      })
    ).then((events) => {
      if (!cancelled) setSavedEvents(events);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleForget(id: string) {
    removeSavedEvent(id);
    setSavedEvents((prev) => prev.filter((event) => event.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create event");
        return;
      }
      saveEvent({
        id: data.id,
        name: data.name,
        adminToken: data.adminToken,
      });
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-xl px-page-x py-page-y">
        <h1 className="mb-component text-display font-bold">Event Created</h1>
        <p className="mb-component">
          <strong>{result.name}</strong>
        </p>
        <p className="mb-component text-body-sm text-muted-foreground">
          Save your admin link — it won&apos;t be shown again.
        </p>
        <div className="mb-component-lg break-all rounded-control bg-surface-muted p-component font-mono text-caption">
          {result.adminUrl}
        </div>
        <div className="flex gap-component">
          <button
            onClick={() => router.push(`/event/${result.id}`)}
            className="btn btn-primary"
          >
            View Event
          </button>
          <button
            onClick={() => router.push(result.adminUrl)}
            className="btn btn-secondary"
          >
            Go to Admin
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-page-x py-page-y">
      <h1 className="mb-section-sm text-display font-bold">
        Badminton Doubles Tournament
      </h1>
      <form onSubmit={handleSubmit} className="space-y-component">
        <div>
          <label className="mb-component-sm block text-label font-medium" htmlFor="name">
            Event Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. Friday Badminton"
            required
          />
        </div>
        {error && (
          <p role="alert" className="text-body-sm text-danger-subtle-foreground">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Creating..." : "Create Event"}
        </button>
      </form>

      {savedEvents.length > 0 && (
        <section className="mt-section">
          <h2 className="mb-component text-heading font-semibold">My Events</h2>
          <ul className="space-y-component-sm">
            {savedEvents.map((event) => (
              <li
                key={event.id}
                className="card flex flex-wrap items-center justify-between gap-component-sm"
              >
                <div>
                  <p className="text-body-sm font-medium">{event.name}</p>
                  <div className="mt-component-sm flex items-center gap-component-sm">
                    {event.deleted ? (
                      <Badge tone="danger">Event deleted</Badge>
                    ) : (
                      event.state && <PhaseBadge phase={event.state} />
                    )}
                  </div>
                </div>
                <div className="flex gap-component-sm">
                  <button
                    type="button"
                    onClick={() => router.push(`/event/${event.id}`)}
                    className="btn btn-outline btn-sm"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/event/${event.id}/admin/${event.adminToken}`)
                    }
                    disabled={event.deleted}
                    className="btn btn-secondary btn-sm"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleForget(event.id)}
                    className="btn btn-ghost btn-sm"
                  >
                    Forget
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
