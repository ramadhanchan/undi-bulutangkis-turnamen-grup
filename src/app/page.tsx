"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string;
    name: string;
    adminUrl: string;
  } | null>(null);
  const router = useRouter();

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
    </main>
  );
}
