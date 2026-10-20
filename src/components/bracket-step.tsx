"use client";

import { useState } from "react";
import type { EventStepProps } from "@/components/event-step-types";
import { Badge, ChampionBanner } from "@/components/ui";
import { nextSlotPosition } from "@/lib/bracket-layout";
import {
  MatchScoreCard,
  matchScoreKey,
} from "@/components/match-score-card";
import { formatTeamName } from "@/lib/format";
import type {
  BracketRoundView,
  BracketSlotView,
} from "@/lib/event-snapshot";

function roundTitle(roundIndex: number, totalRounds: number): string {
  const remainingTeams = 2 ** (totalRounds - roundIndex);
  if (remainingTeams === 2) return "Final";
  if (remainingTeams === 4) return "Semifinal";
  if (remainingTeams === 8) return "Perempat Final";
  return `Ronde ${roundIndex + 1}`;
}

function nextRoundSlot(
  rounds: BracketRoundView[],
  slot: BracketSlotView
): BracketSlotView | undefined {
  const roundIndex = rounds.findIndex((round) => round.round === slot.round);
  const nextRound = rounds[roundIndex + 1];
  if (!nextRound) return undefined;

  const nextPosition = nextSlotPosition(slot.position ?? 0);
  return nextRound.slots.find((entry) => entry.position === nextPosition);
}

function BracketNode({
  slot,
  rounds,
  canEdit,
  selected,
  onSelect,
  presentation,
}: {
  slot: BracketSlotView;
  rounds: BracketRoundView[];
  canEdit: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  presentation: boolean;
}) {
  const team1 = slot.team1;
  const team2 = slot.team2;
  const winner1 =
    slot.winnerTeamId !== null && slot.winnerTeamId === team1?.id;
  const winner2 =
    slot.winnerTeamId !== null && slot.winnerTeamId === team2?.id;
  const isBye = slot.isBye;
  const tbd1 = !team1 && !isBye;
  const tbd2 = !team2 && !isBye;
  const played = slot.winnerTeamId !== null;
  const next = nextRoundSlot(rounds, slot);
  const correctionAllowed = !played || !next || next.winnerTeamId === null;
  const canScore =
    canEdit &&
    Boolean(team1 && team2) &&
    !isBye &&
    correctionAllowed;

  const team1Score = slot.sets
    .map((set) => set.t1)
    .filter((value): value is number => value !== null)
    .join(" ");
  const team2Score = slot.sets
    .map((set) => set.t2)
    .filter((value): value is number => value !== null)
    .join(" ");

  const textSize = presentation ? "text-body" : "text-body-sm";

  return (
    <div
      className={`rounded-control border bg-surface shadow-card transition-colors ${
        presentation ? "p-component" : "p-component-sm"
      } ${selected ? "border-primary ring-2 ring-primary" : "border-border"}`}
    >
      <div className="flex items-center justify-between gap-component-sm">
        <span
          className={`min-w-0 truncate ${textSize} ${
            winner1
              ? "font-semibold text-success-subtle-foreground"
              : tbd1
                ? "italic text-muted-foreground"
                : ""
          }`}
        >
          {tbd1 ? "TBD" : team1?.name}
        </span>
        <span className="shrink-0 font-mono text-caption text-muted-foreground">
          {team1Score || (isBye ? "—" : "")}
        </span>
      </div>

      <div className="my-1 h-px bg-border" />

      <div className="flex items-center justify-between gap-component-sm">
        <span
          className={`min-w-0 truncate ${textSize} ${
            winner2
              ? "font-semibold text-success-subtle-foreground"
              : tbd2
                ? "italic text-muted-foreground"
                : ""
          }`}
        >
          {tbd2 ? "TBD" : isBye ? "BYE" : team2?.name}
        </span>
        <span className="shrink-0 font-mono text-caption text-muted-foreground">
          {team2Score || (isBye ? "—" : "")}
        </span>
      </div>

      {isBye && (
        <p className="mt-1 text-caption text-muted-foreground">
          Bye · lolos otomatis
        </p>
      )}

      {(slot.isWalkover || canScore) && (
        <div className="mt-component-sm flex items-center justify-between gap-component-sm">
          {slot.isWalkover ? <Badge tone="warning">W.O.</Badge> : <span />}
          {canScore && (
            <button
              type="button"
              className="text-caption text-primary underline-offset-2 hover:underline"
              onClick={() => onSelect(slot.id)}
            >
              {played ? "Koreksi" : "Input skor"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function BracketTree({
  rounds,
  canEdit,
  selectedId,
  onSelect,
  presentation = false,
}: {
  rounds: BracketRoundView[];
  canEdit: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  presentation?: boolean;
}) {
  if (rounds.length === 0) {
    return (
      <p className="text-body-sm text-muted-foreground">Belum ada bagan.</p>
    );
  }

  return (
    <div className="flex flex-col gap-section-sm md:flex-row md:items-stretch md:gap-section-sm md:overflow-x-auto md:pb-component">
      {rounds.map((round, index) => (
        <div
          key={round.round}
          className={`flex-1 md:min-w-56 ${
            index > 0 ? "md:border-l md:border-border md:pl-section-sm" : ""
          }`}
        >
          <div className="mb-component-sm flex items-center gap-component-sm">
            <span className="badge">{roundTitle(index, rounds.length)}</span>
            <span className="text-caption text-muted-foreground">
              {round.slots.length} slot
            </span>
          </div>

          <div
            className={`flex flex-col gap-component ${
              presentation
                ? "md:min-h-96 md:justify-around"
                : "md:h-full md:justify-around"
            }`}
          >
            {round.slots.map((slot) => (
              <BracketNode
                key={slot.id}
                slot={slot}
                rounds={rounds}
                canEdit={canEdit}
                selected={slot.id === selectedId}
                onSelect={onSelect}
                presentation={presentation}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BracketStep({
  eventId,
  token,
  canEdit,
  snapshot,
  onChanged,
}: EventStepProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isPreview =
    snapshot.bracket.length === 0 && snapshot.previewBracket.length > 0;
  const rounds =
    snapshot.bracket.length > 0 ? snapshot.bracket : snapshot.previewBracket;
  const editable =
    canEdit &&
    !isPreview &&
    (snapshot.state === "knockout" || snapshot.state === "finished");

  const slots = rounds.flatMap((round) => round.slots);
  const matchCount = slots.filter((slot) => !slot.isBye).length;
  const selected = slots.find((slot) => slot.id === selectedId);
  const next = selected ? nextRoundSlot(rounds, selected) : undefined;

  const selectedCanScore = Boolean(
    selected &&
      editable &&
      selected.team1 &&
      selected.team2 &&
      !selected.isBye &&
      (selected.winnerTeamId === null ||
        !next ||
        next.winnerTeamId === null)
  );

  const championTeam = snapshot.champion
    ? snapshot.teams.find((team) => team.id === snapshot.champion)
    : null;

  return (
    <div className="space-y-component-lg">
      {championTeam && <ChampionBanner name={formatTeamName(championTeam)} />}

      <div className="flex flex-wrap items-center justify-between gap-component-sm">
        <div>
          <p className="text-body-sm font-medium">Bagan knockout</p>
          <p className="text-caption text-muted-foreground">
            {rounds.length} ronde · {matchCount} match
          </p>
        </div>
        <Badge tone="warning">
          {isPreview
            ? "Preview"
            : snapshot.state === "finished"
              ? "Selesai"
              : "Knockout"}
        </Badge>
      </div>

      {isPreview && (
        <div className="alert bg-info-subtle text-info-subtle-foreground">
          <p className="text-body-sm">
            Preview dari klasemen saat ini. Bagan resmi dibuat saat knockout
            dimulai.
          </p>
        </div>
      )}

      <BracketTree
        rounds={rounds}
        canEdit={editable}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {selected && selectedCanScore && (
        <div>
          <p className="mb-component-sm text-caption font-medium uppercase tracking-wide text-muted-foreground">
            Input skor
          </p>
          <MatchScoreCard
            key={matchScoreKey(selected)}
            eventId={eventId}
            token={token}
            canEdit
            match={selected}
            onChanged={onChanged}
          />
        </div>
      )}
    </div>
  );
}
