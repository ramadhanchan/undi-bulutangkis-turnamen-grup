import { getDb } from "./db";

export interface SetScore {
  t1: number;
  t2: number;
}

export interface MatchScore {
  sets: SetScore[];
  isWalkover: boolean;
}

const POINTS_TO_WIN = 21;
const WIN_BY = 2;
const CAP = 30;

export function isValidSetScore(t1: number, t2: number): boolean {
  if (t1 < 0 || t2 < 0) return false;
  if (t1 === 0 && t2 === 0) return false;

  const max = Math.max(t1, t2);
  const min = Math.min(t1, t2);
  const diff = max - min;

  if (max < POINTS_TO_WIN) return false;
  if (max > CAP) return false;

  if (max === CAP) {
    if (max === min) return false;
    return diff >= 1 && diff <= 2;
  }

  return diff >= WIN_BY;
}

export function getSetWinner(t1: number, t2: number): 1 | 2 | null {
  if (!isValidSetScore(t1, t2)) return null;
  return t1 > t2 ? 1 : 2;
}

export function getMatchWinner(sets: SetScore[]): 1 | 2 | null {
  let team1Sets = 0;
  let team2Sets = 0;
  for (const set of sets) {
    if (set.t1 === null || set.t2 === null) continue;
    if (!isValidSetScore(set.t1, set.t2)) continue;
    const winner = getSetWinner(set.t1, set.t2);
    if (winner === 1) team1Sets++;
    else if (winner === 2) team2Sets++;
  }
  if (team1Sets >= 2) return 1;
  if (team2Sets >= 2) return 2;
  return null;
}

export function isValidMatchScore(sets: SetScore[]): boolean {
  const playedSets = sets.filter((s) => s.t1 !== null && s.t2 !== null);
  if (playedSets.length < 2 || playedSets.length > 3) return false;

  for (const set of playedSets) {
    if (!isValidSetScore(set.t1, set.t2)) return false;
  }

  const winner = getMatchWinner(playedSets);
  if (!winner) return false;

  if (playedSets.length === 3) {
    let t1 = 0, t2 = 0;
    for (const set of playedSets) {
      const w = getSetWinner(set.t1, set.t2);
      if (w === 1) t1++;
      else t2++;
    }
    if (t1 !== 2 && t2 !== 2) return false;
    if (t1 === 2 && t2 !== 1) return false;
    if (t2 === 2 && t1 !== 1) return false;
  }

  if (playedSets.length === 2) {
    let t1 = 0, t2 = 0;
    for (const set of playedSets) {
      const w = getSetWinner(set.t1, set.t2);
      if (w === 1) t1++;
      else t2++;
    }
    if (t1 !== 2 && t2 !== 2) return false;
  }

  return true;
}

export function getWalkoverScore(): SetScore[] {
  return [
    { t1: 21, t2: 0 },
    { t1: 21, t2: 0 },
  ];
}

export function recordMatchScore(
  matchId: string,
  sets: SetScore[],
  isWalkover: boolean = false,
  walkoverWinnerId?: string
): { winnerTeamId: string | null } {
  const db = getDb();

  const match = db
    .query("SELECT team1_id, team2_id FROM matches WHERE id = ?")
    .get(matchId) as { team1_id: string | null; team2_id: string | null } | null;

  if (!match) throw new Error("Match not found");

  if (isWalkover) {
    if (walkoverWinnerId && walkoverWinnerId === match.team2_id) {
      sets = [
        { t1: 0, t2: 21 },
        { t1: 0, t2: 21 },
      ];
    } else {
      sets = getWalkoverScore();
    }
  }

  if (!isValidMatchScore(sets)) {
    throw new Error("Invalid score");
  }

  const winner = getMatchWinner(sets);
  const winnerTeamId = winner === 1 ? (match.team1_id || null) : winner === 2 ? (match.team2_id || null) : null;

  const s1 = sets[0] || { t1: null, t2: null };
  const s2 = sets[1] || { t1: null, t2: null };
  const s3 = sets[2] || { t1: null, t2: null };

  db.run(
    `UPDATE matches SET
      set1_t1 = ?, set1_t2 = ?,
      set2_t1 = ?, set2_t2 = ?,
      set3_t1 = ?, set3_t2 = ?,
      winner_team_id = ?,
      is_walkover = ?,
      played_at = datetime('now')
    WHERE id = ?`,
    [
      s1.t1, s1.t2,
      s2.t1, s2.t2,
      s3.t1, s3.t2,
      winnerTeamId,
      isWalkover ? 1 : 0,
      matchId,
    ]
  );

  return { winnerTeamId };
}