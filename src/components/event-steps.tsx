"use client";

import { useState, type FormEvent } from "react";
import type { EventStepProps } from "@/components/event-step-types";
import { Badge, EmptyState, ErrorMessage } from "@/components/ui";
import { requestJson } from "@/lib/client";
import type { FlowState } from "@/lib/event-flow";
import { formatTeamName } from "@/lib/format";
import type {
  BulkRegistrationError,
  BulkRegistrationResult,
} from "@/lib/participants";

type BulkResponse = Partial<BulkRegistrationResult> & { error?: string };

function errorMessage(data: unknown): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return "Permintaan gagal.";
}

const send = requestJson;

interface ParticipantsStepProps extends EventStepProps {
  flow: FlowState;
}

export function ParticipantsStep({
  eventId,
  token,
  canEdit,
  snapshot,
  flow,
  onChanged,
}: ParticipantsStepProps) {
  const [bulk, setBulk] = useState("");
  const [newName, setNewName] = useState("");
  const [bulkErrors, setBulkErrors] = useState<BulkRegistrationError[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const editable =
    canEdit && snapshot.state === "registration" && Boolean(token);

  async function addSingle(event: FormEvent) {
    event.preventDefault();
    if (!editable || !token || newName.trim().length === 0) return;

    setBusy(true);
    setError(null);
    const result = await send(`/api/events/${eventId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name: newName }),
    });
    if (!result.ok) setError(errorMessage(result.data));
    else setNewName("");
    setBusy(false);
    onChanged();
  }

  async function addBulk(event: FormEvent) {
    event.preventDefault();
    if (!editable || !token) return;

    const names = bulk
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0) {
      setBulkErrors([]);
      setError("Tempel minimal satu nama.");
      return;
    }

    setBusy(true);
    setError(null);
    setBulkErrors([]);
    const result = await send(`/api/events/${eventId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, names }),
    });

    const data = result.data as BulkResponse | null;
    const hasLineErrors = Boolean(
      data && Array.isArray(data.errors) && data.errors.length > 0
    );
    if (data && Array.isArray(data.errors)) setBulkErrors(data.errors);
    if (!result.ok && !hasLineErrors) setError(errorMessage(result.data));
    else setError(null);
    if (result.ok) setBulk("");
    setBusy(false);
    onChanged();
  }

  async function rename(participantId: string) {
    if (!editable || !token) return;

    setBusy(true);
    setError(null);
    const result = await send(`/api/events/${eventId}/participants`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, participantId, name: editName }),
    });
    if (!result.ok) setError(errorMessage(result.data));
    else {
      setEditingId(null);
      setEditName("");
    }
    setBusy(false);
    onChanged();
  }

  async function remove(participantId: string, name: string) {
    if (!editable || !token) return;
    if (!window.confirm(`Hapus peserta ${name}?`)) return;

    setBusy(true);
    setError(null);
    const result = await send(
      `/api/events/${eventId}/participants?token=${encodeURIComponent(
        token
      )}&participantId=${encodeURIComponent(participantId)}`,
      { method: "DELETE" }
    );
    if (!result.ok) setError(errorMessage(result.data));
    setBusy(false);
    onChanged();
  }

  return (
    <div className="space-y-component-lg">
      {flow.roster.valid ? (
        <div className="alert bg-success-subtle text-success-subtle-foreground">
          <p className="text-body-sm font-medium">
            Roster valid
          </p>
          <p className="mt-1 text-caption text-success-subtle-foreground opacity-80">
            {snapshot.participants.length} peserta →{" "}
            {snapshot.participants.length / 2} tim. Langkah berikutnya: undi
            pasangan.
          </p>
        </div>
      ) : (
        <div className="alert bg-warning-subtle text-warning-subtle-foreground">
          <p className="text-body-sm font-medium">
            Roster perlu diperbaiki
          </p>
          <ul className="mt-1 list-disc pl-5 text-caption text-warning-subtle-foreground">
            {flow.roster.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {editable && (
        <div className="grid gap-component-lg md:grid-cols-2">
          <form
            onSubmit={addSingle}
            className="rounded-card border border-border bg-surface-muted p-component"
          >
            <label
              className="text-body-sm font-medium"
              htmlFor="new-participant"
            >
              Tambah peserta
            </label>
            <div className="mt-component-sm flex gap-component-sm">
              <input
                id="new-participant"
                className="input"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Nama peserta"
                maxLength={50}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || newName.trim().length === 0}
              >
                Tambah
              </button>
            </div>
          </form>

          <form
            onSubmit={addBulk}
            className="rounded-card border border-border bg-surface-muted p-component"
          >
            <label
              className="text-body-sm font-medium"
              htmlFor="bulk-participants"
            >
              Tempel daftar
            </label>
            <textarea
              id="bulk-participants"
              className="input mt-component-sm min-h-24 resize-y py-component-sm"
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              placeholder={"Satu nama per baris\nAsep\nBudi\nCandra"}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm mt-component-sm w-full"
              disabled={busy}
            >
              Tambah semua
            </button>
          </form>
        </div>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {bulkErrors.length > 0 && (
        <ul
          role="alert"
          className="space-y-component-sm text-caption text-danger-subtle-foreground"
        >
          {bulkErrors.map((bulkError, index) => (
            <li key={`${bulkError.name}-${index}`}>
              {bulkError.name}: {bulkError.message}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-card border border-border">
        <div className="flex items-center justify-between border-b border-border px-component py-component-sm">
          <p className="text-body-sm font-medium">Peserta terdaftar</p>
          <Badge tone={snapshot.participants.length > 0 ? "primary" : "neutral"}>
            {snapshot.participants.length}
          </Badge>
        </div>

        {snapshot.participants.length === 0 ? (
          <div className="p-component">
            <EmptyState>Belum ada peserta.</EmptyState>
          </div>
        ) : (
          <ul className="max-h-80 overflow-auto">
            {snapshot.participants.map((participant, index) => (
              <li
                key={participant.id}
                className="flex items-center gap-component-sm border-b border-border px-component py-component-sm last:border-0"
              >
                <span className="w-5 shrink-0 text-caption text-muted-foreground">
                  {index + 1}
                </span>

                {editingId === participant.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-component-sm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void rename(participant.id);
                    }}
                  >
                    <input
                      className="input h-8 flex-1"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      maxLength={50}
                      aria-label={`Nama baru untuk ${participant.name}`}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={busy || editName.trim().length === 0}
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditName("");
                      }}
                    >
                      Batal
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-body-sm">
                      {participant.name}
                    </span>
                    {editable && (
                      <>
                        <button
                          type="button"
                          className="text-caption text-primary underline-offset-2 hover:underline"
                          onClick={() => {
                            setEditingId(participant.id);
                            setEditName(participant.name);
                            setError(null);
                          }}
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          className="text-caption text-danger-subtle-foreground underline-offset-2 hover:underline"
                          onClick={() =>
                            remove(participant.id, participant.name)
                          }
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function TeamsStep({
  eventId,
  token,
  canEdit,
  snapshot,
  onChanged,
}: EventStepProps) {
  const [teamAId, setTeamAId] = useState("");
  const [playerAId, setPlayerAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable =
    canEdit &&
    Boolean(token) &&
    !snapshot.teamsLocked &&
    snapshot.state === "pairing";
  const teamA = snapshot.teams.find((team) => team.id === teamAId);
  const teamB = snapshot.teams.find((team) => team.id === teamBId);
  const playerA =
    teamA?.player1.id === playerAId
      ? teamA.player1
      : teamA?.player2.id === playerAId
        ? teamA.player2
        : null;
  const playerB =
    teamB?.player1.id === playerBId
      ? teamB.player1
      : teamB?.player2.id === playerBId
        ? teamB.player2
        : null;
  const canSwap = Boolean(
    editable &&
      token &&
      teamA &&
      teamB &&
      teamAId !== teamBId &&
      playerA &&
      playerB
  );

  if (snapshot.teams.length === 0) {
    return (
      <EmptyState>
        Belum ada tim. Selesaikan langkah Peserta lalu lanjut ke Undi Tim.
      </EmptyState>
    );
  }

  async function reshuffle() {
    if (!editable || !token) return;
    if (
      !window.confirm(
        `${snapshot.teams.length} tim akan diundi ulang. Pasangan saat ini akan diganti. Lanjutkan?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await send(`/api/events/${eventId}/pairings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!result.ok) setError(errorMessage(result.data));
    setBusy(false);
    onChanged();
  }

  async function swap(event: FormEvent) {
    event.preventDefault();
    if (!canSwap || !token || !teamA || !teamB || !playerA || !playerB) {
      return;
    }
    if (!window.confirm(`Tukar ${playerA.name} dengan ${playerB.name}?`)) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await send(`/api/events/${eventId}/pairings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        team1Id: teamA.id,
        player1Id: playerA.id,
        team2Id: teamB.id,
        player2Id: playerB.id,
      }),
    });
    if (!result.ok) setError(errorMessage(result.data));
    else {
      setTeamAId("");
      setPlayerAId("");
      setTeamBId("");
      setPlayerBId("");
    }
    setBusy(false);
    onChanged();
  }

  return (
    <div className="space-y-component-lg">
      <div className="flex flex-wrap items-center justify-between gap-component-sm">
        <div>
          <p className="text-body-sm font-medium">
            {snapshot.teams.length} tim terbentuk
          </p>
          <p className="text-caption text-muted-foreground">
            {snapshot.teamsLocked
              ? "Undian tim sudah dikunci."
              : "Pilih dua pemain dari tim berbeda untuk ditukar, atau undi ulang semua pasangan."}
          </p>
        </div>
        {editable && (
          <button
            className="btn btn-outline btn-sm"
            type="button"
            disabled={busy}
            onClick={reshuffle}
          >
            {busy ? "Mengundi..." : "Undi ulang"}
          </button>
        )}
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <div className="grid gap-component-sm sm:grid-cols-2">
        {snapshot.teams.map((team) => (
          <div key={team.id} className="card !p-component">
            <div className="flex items-center justify-between gap-component-sm">
              <Badge tone={snapshot.teamsLocked ? "success" : "neutral"}>
                {snapshot.teamsLocked ? "Terkunci" : "Tim"}
              </Badge>
              {team.groupNumber !== null && (
                <span className="text-caption text-muted-foreground">
                  Grup {team.groupNumber}
                </span>
              )}
            </div>
            <p className="mt-component-sm text-body-sm font-medium">
              {formatTeamName(team)}
            </p>
          </div>
        ))}
      </div>

      {editable && (
        <form onSubmit={swap} className="card !p-component">
          <p className="text-body-sm font-medium">Tukar pemain</p>
          <p className="mt-component-sm text-caption text-muted-foreground">
            Pilih satu pemain dari masing-masing tim.
          </p>
          <div className="mt-component-sm grid gap-component-sm sm:grid-cols-2">
            <div className="space-y-component-sm">
              <label
                className="text-caption text-muted-foreground"
                htmlFor="swap-team-a"
              >
                Tim A
              </label>
              <select
                id="swap-team-a"
                className="input"
                value={teamAId}
                onChange={(event) => {
                  const id = event.target.value;
                  setTeamAId(id);
                  const team = snapshot.teams.find((entry) => entry.id === id);
                  setPlayerAId(team?.player1.id ?? "");
                  if (teamBId === id) {
                    setTeamBId("");
                    setPlayerBId("");
                  }
                }}
                disabled={busy}
              >
                <option value="">Pilih tim</option>
                {snapshot.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.player1.name} / {team.player2.name}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={playerAId}
                onChange={(event) => setPlayerAId(event.target.value)}
                disabled={busy || !teamA}
                aria-label="Pemain dari Tim A"
              >
                <option value="">Pilih pemain</option>
                {teamA && (
                  <>
                    <option value={teamA.player1.id}>
                      {teamA.player1.name}
                    </option>
                    <option value={teamA.player2.id}>
                      {teamA.player2.name}
                    </option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-component-sm">
              <label
                className="text-caption text-muted-foreground"
                htmlFor="swap-team-b"
              >
                Tim B
              </label>
              <select
                id="swap-team-b"
                className="input"
                value={teamBId}
                onChange={(event) => {
                  const id = event.target.value;
                  setTeamBId(id);
                  const team = snapshot.teams.find((entry) => entry.id === id);
                  setPlayerBId(team?.player1.id ?? "");
                }}
                disabled={busy}
              >
                <option value="">Pilih tim</option>
                {snapshot.teams
                  .filter((team) => team.id !== teamAId)
                  .map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.player1.name} / {team.player2.name}
                    </option>
                  ))}
              </select>
              <select
                className="input"
                value={playerBId}
                onChange={(event) => setPlayerBId(event.target.value)}
                disabled={busy || !teamB}
                aria-label="Pemain dari Tim B"
              >
                <option value="">Pilih pemain</option>
                {teamB && (
                  <>
                    <option value={teamB.player1.id}>
                      {teamB.player1.name}
                    </option>
                    <option value={teamB.player2.id}>
                      {teamB.player2.name}
                    </option>
                  </>
                )}
              </select>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm mt-component-sm"
            type="submit"
            disabled={busy || !canSwap}
          >
            {busy ? "Menukar..." : "Tukar pemain"}
          </button>
        </form>
      )}

      <div
        className={`alert text-caption ${
          snapshot.teamsLocked
            ? "border-success/30 bg-success-subtle text-success-subtle-foreground"
            : "border-warning/30 bg-warning-subtle text-warning-subtle-foreground"
        }`}
      >
        {snapshot.teamsLocked
          ? "Undian tim sudah dikunci. Undi ulang dan tukar pemain tidak bisa dilakukan."
          : "Setelah Kunci Tim, undi ulang dan tukar pemain tidak bisa dilakukan."}
      </div>
    </div>
  );
}

