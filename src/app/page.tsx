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
      <main className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Event Created!</h1>
        <p className="mb-2">
          <strong>{result.name}</strong>
        </p>
        <p className="mb-4 text-sm text-gray-600">
          Save your admin link — it won&apos;t be shown again:
        </p>
        <div className="bg-gray-100 p-3 rounded mb-4 break-all font-mono text-sm">
          {result.adminUrl}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/event/${result.id}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Event
          </button>
          <button
            onClick={() => router.push(result.adminUrl)}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
          >
            Go to Admin
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Badminton Doubles Tournament</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Event Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Friday Badminton"
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Event"}
        </button>
      </form>
    </main>
  );
}