export interface SetLike {
  t1: number | null;
  t2: number | null;
}

export function formatScore(sets: SetLike[]): string {
  const played = sets.filter((set) => set.t1 !== null || set.t2 !== null);
  return played.length === 0
    ? "—"
    : played
        .map((set) => `${set.t1 ?? "–"}–${set.t2 ?? "–"}`)
        .join(" · ");
}

export function formatTeamName(team: {
  player1: { name: string };
  player2: { name: string };
}): string {
  return `${team.player1.name} / ${team.player2.name}`;
}
