"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, EmptyState, ErrorMessage, PhaseBadge } from "@/components/ui";
import { absoluteUrl, copyToClipboard } from "@/lib/clipboard";
import {
  listSavedEvents,
  removeSavedEvent,
  saveEvent,
  type SavedEvent,
} from "@/lib/saved-events";

interface SavedEventView extends SavedEvent {
  state?: string;
  deleted?: boolean;
  unavailable?: boolean;
}

interface CreatedEvent extends SavedEvent {
  adminUrl: string;
}

function adminPath(event: Pick<SavedEvent, "id" | "adminToken">): string {
  return `/event/${event.id}/admin/${event.adminToken}`;
}

function absoluteAdminUrl(
  event: Pick<SavedEvent, "id" | "adminToken">
): string {
  return absoluteUrl(adminPath(event));
}

export default function Home() {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [resultNotice, setResultNotice] = useState<string | null>(null);
  const [savedEvents, setSavedEvents] = useState<SavedEventView[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [forgetId, setForgetId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadSavedEvents() {
      const saved = listSavedEvents();
      if (saved.length === 0) {
        if (!cancelled) setSavedLoading(false);
        return;
      }

      const events = await Promise.all(
        saved.map(async (event): Promise<SavedEventView> => {
          try {
            const response = await fetch(`/api/events/${event.id}`);
            if (response.status === 404) {
              return { ...event, deleted: true };
            }
            if (!response.ok) {
              return { ...event, unavailable: true };
            }
            const data = (await response.json()) as { state?: string };
            return { ...event, state: data.state };
          } catch {
            return { ...event, unavailable: true };
          }
        })
      );
      if (cancelled) return;

      setSavedEvents((current) => {
        const merged = [...current];
        for (const event of events) {
          if (!merged.some((entry) => entry.id === event.id)) {
            merged.push(event);
          }
        }
        return merged;
      });
      setSavedLoading(false);
    }

    void loadSavedEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  function showCopied(id: string) {
    setCopiedId(id);
    setCopyError(null);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedId(null), 2500);
  }

  async function copyAdminLink(
    event: Pick<SavedEvent, "id" | "adminToken">
  ) {
    const copied = await copyToClipboard(absoluteAdminUrl(event));
    if (!copied) {
      setCopyError(
        "Gagal menyalin Admin Link. Buka Kelola, lalu salin URL dari address bar."
      );
      return;
    }
    showCopied(event.id);
  }

  async function handleCreate(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError("Nama event wajib diisi.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    setResultNotice(null);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            id?: string;
            name?: string;
            state?: string;
            adminToken?: string;
            adminUrl?: string;
            error?: string;
          }
        | null;
      if (
        !response.ok ||
        !data?.id ||
        !data.name ||
        !data.adminToken ||
        !data.adminUrl
      ) {
        setCreateError(data?.error ?? "Gagal membuat event.");
        return;
      }

      const saved: SavedEvent = {
        id: data.id,
        name: data.name,
        adminToken: data.adminToken,
      };
      try {
        saveEvent(saved);
      } catch {
        setResultNotice(
          "Event dibuat, tetapi Admin Link gagal disimpan di browser ini. Salin link di bawah sekarang."
        );
      }

      setSavedEvents((previous) => [
        { ...saved, state: data.state },
        ...previous.filter((entry) => entry.id !== saved.id),
      ]);
      setName("");
      setCopiedId(null);
      setCopyError(null);
      setCreated({
        ...saved,
        adminUrl: absoluteAdminUrl(saved),
      });
    } catch {
      setCreateError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  function confirmForget(id: string) {
    removeSavedEvent(id);
    setSavedEvents((previous) => previous.filter((event) => event.id !== id));
    setForgetId(null);
    if (copiedId === id) setCopiedId(null);
  }

  if (created) {
    const copied = copiedId === created.id;
    return (
      <main className="mx-auto max-w-2xl px-page-x py-page-y">
        <p className="text-caption uppercase tracking-wide text-muted-foreground">
          Event dibuat
        </p>
        <h1 className="mt-component-sm text-display font-bold">
          {created.name}
        </h1>
        <p className="mt-component-sm text-body-sm text-muted-foreground">
          Admin Link sudah disimpan di browser ini. Link ini adalah satu-satunya
          akses ke mode Kelola, jadi simpan salinannya.
        </p>

        <section className="card mt-component-lg">
          <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
            Admin Link
          </p>
          <p className="mt-component-sm break-all font-mono text-caption">
            {created.adminUrl}
          </p>
          <div className="mt-component flex flex-wrap gap-component-sm">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void copyAdminLink(created)}
            >
              {copied ? "Tersalin!" : "Salin Admin Link"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => router.push(adminPath(created))}
            >
              Kelola Event
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => router.push(`/event/${created.id}`)}
            >
              Buka Event
            </button>
          </div>
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? "Admin Link tersalin." : ""}
          </span>

          {resultNotice && (
            <div className="alert mt-component bg-warning-subtle text-warning-subtle-foreground">
              <p className="text-body-sm">{resultNotice}</p>
            </div>
          )}
          {copyError && (
            <div className="mt-component">
              <ErrorMessage>{copyError}</ErrorMessage>
            </div>
          )}
        </section>

        <button
          type="button"
          className="mt-component-lg text-caption text-primary underline-offset-2 hover:underline"
          onClick={() => {
            setCreated(null);
            setCopyError(null);
            setResultNotice(null);
          }}
        >
          Buat event lain
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-page-x py-page-y">
      <header className="mb-section-sm">
        <p className="text-caption uppercase tracking-wide text-muted-foreground">
          Badminton doubles
        </p>
        <h1 className="mt-component-sm text-display font-bold">
          Turnamen badminton ganda
        </h1>
        <p className="mt-component-sm text-body-sm text-muted-foreground">
          Buat event, undi tim, bagi grup, dan jalankan bagan sampai Final.
        </p>
      </header>

      <section className="card">
        <h2 className="text-heading-sm font-semibold">Buat event baru</h2>
        <p className="mt-component-sm text-body-sm text-muted-foreground">
          Admin Link dibuat otomatis dan disimpan di browser ini.
        </p>
        <form
          onSubmit={handleCreate}
          className="mt-component space-y-component-sm"
        >
          <div>
            <label
              className="mb-component-sm block text-label font-medium"
              htmlFor="event-name"
            >
              Nama event
            </label>
            <input
              id="event-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (createError) setCreateError(null);
              }}
              className="input"
              placeholder="cth. Badminton Jumat"
              required
            />
          </div>
          {createError && <ErrorMessage>{createError}</ErrorMessage>}
          <button type="submit" disabled={creating} className="btn btn-primary">
            {creating ? "Membuat..." : "Buat Event"}
          </button>
        </form>
      </section>

      <section className="mt-section">
        <div className="mb-component flex flex-wrap items-center justify-between gap-component-sm">
          <h2 className="text-heading font-semibold">Event Saya</h2>
          {savedEvents.length > 0 && (
            <Badge tone="neutral">{savedEvents.length} event</Badge>
          )}
        </div>

        {copyError && (
          <div className="mb-component">
            <ErrorMessage>{copyError}</ErrorMessage>
          </div>
        )}

        {savedLoading ? (
          <p className="text-body-sm text-muted-foreground">
            Memuat event tersimpan...
          </p>
        ) : savedEvents.length === 0 ? (
          <div className="card">
            <EmptyState>
              Belum ada event tersimpan. Buat event pertamamu di atas.
            </EmptyState>
          </div>
        ) : (
          <ul className="space-y-component-sm">
            {savedEvents.map((event) => {
              const copied = copiedId === event.id;
              return (
                <li key={event.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-component-sm">
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium">{event.name}</p>
                      <div className="mt-component-sm flex flex-wrap items-center gap-component-sm">
                        {event.deleted ? (
                          <Badge tone="danger">Tidak tersedia</Badge>
                        ) : event.unavailable ? (
                          <Badge tone="warning">Status tidak tersedia</Badge>
                        ) : event.state ? (
                          <PhaseBadge phase={event.state} />
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-component-sm">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={event.deleted}
                        onClick={() => router.push(`/event/${event.id}`)}
                      >
                        Buka
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={event.deleted}
                        onClick={() => router.push(adminPath(event))}
                      >
                        Kelola
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={event.deleted}
                        onClick={() => void copyAdminLink(event)}
                      >
                        {copied ? "Tersalin!" : "Salin Admin Link"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          setForgetId((current) =>
                            current === event.id ? null : event.id
                          )
                        }
                      >
                        Lupakan
                      </button>
                    </div>
                  </div>

                  <span role="status" aria-live="polite" className="sr-only">
                    {copied ? `Admin Link ${event.name} tersalin.` : ""}
                  </span>

                  {forgetId === event.id && (
                    <div className="alert mt-component bg-danger-subtle text-danger-subtle-foreground">
                      <p className="text-body-sm">
                        Lupakan event ini? Admin Link ini adalah satu-satunya
                        akses Kelola yang tersimpan di browser untuk event ini.
                        Setelah dilupakan, link tersebut hilang dan kamu harus
                        punya salinannya untuk mengelola event.
                      </p>
                      <div className="mt-component-sm flex flex-wrap gap-component-sm">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => confirmForget(event.id)}
                        >
                          Ya, lupakan
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setForgetId(null)}
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
