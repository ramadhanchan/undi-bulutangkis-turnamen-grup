import { getDb } from "./db";
import { getTeams } from "./pairing";
import { getMatches } from "./schedule";
import { getSetWinner, isValidSetScore } from "./scoring";

export interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  points: number; // win=2, loss=0
  pointsScored: number;
  pointsConceded: number;
  pointDiff: number;
  setsWon: number;
  setsLost: number;
  qualified: boolean;
}

export function calculateGroupStandings(
  eventId: string,
  groupNumber: number
): Standing[] {
  const db = getDb();
  const teams = getTeams(eventId).filter((t) => t.groupNumber === groupNumber);
  const matches = getMatches(eventId, "group").filter(
    (m) => m.groupNumber === groupNumber
  );

  const participantMap = new Map<string, string>();
  const pRows = db
    .query("SELECT id, name FROM participants WHERE event_id = ?")
    .all(eventId) as { id: string; name: string }[];
  for (const p of pRows) participantMap.set(p.id, p.name);

  const teamNameMap = new Map<string, string>();
  for (const team of teams) {
    const p1 = participantMap.get(team.player1Id) || "Unknown";
    const p2 = participantMap.get(team.player2Id) || "Unknown";
    teamNameMap.set(team.id, `${p1} / ${p2}`);
  }

  // Initialize standings
  const standingsMap = new Map<string, Standing>();
  for (const team of teams) {
    standingsMap.set(team.id, {
      teamId: team.id,
      teamName: teamNameMap.get(team.id) || "Unknown",
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      pointsScored: 0,
      pointsConceded: 0,
      pointDiff: 0,
      setsWon: 0,
      setsLost: 0,
      qualified: false,
    });
  }

  // Process completed matches
  for (const match of matches) {
    if (!match.winnerTeamId && !match.isWalkover) continue;
    if (match.set1T1 === null || match.set1T2 === null) continue; // no score

    const t1 = standingsMap.get(match.team1Id);
    const t2 = standingsMap.get(match.team2Id);
    if (!t1 || !t2) continue;

    t1.played++;
    t2.played++;

    // Count points and sets
    const sets = [
      { t1: match.set1T1!, t2: match.set1T2! },
      { t1: match.set2T1, t2: match.set2T2 },
      { t1: match.set3T1, t2: match.set3T2 },
    ];

    for (const set of sets) {
      if (set.t1 === null || set.t2 === null) continue;
      t1.pointsScored += set.t1;
      t1.pointsConceded += set.t2;
      t2.pointsScored += set.t2;
      t2.pointsConceded += set.t1;

      if (isValidSetScore(set.t1, set.t2)) {
        const winner = getSetWinner(set.t1, set.t2);
        if (winner === 1) {
          t1.setsWon++;
          t2.setsLost++;
        } else if (winner === 2) {
          t2.setsWon++;
          t1.setsLost++;
        }
      }
    }

    // Determine match winner
    const actualWinner = match.winnerTeamId;

    if (actualWinner === match.team1Id) {
      t1.won++;
      t1.points += 2;
      t2.lost++;
    } else if (actualWinner === match.team2Id) {
      t2.won++;
      t2.points += 2;
      t1.lost++;
    }
  }

  // Calculate point diff
  for (const s of standingsMap.values()) {
    s.pointDiff = s.pointsScored - s.pointsConceded;
  }

  // Sort with tiebreaker
  const sorted = Array.from(standingsMap.values()).sort((a, b) => {
    // 1. Points (descending)
    if (b.points !== a.points) return b.points - a.points;

    // 2. Head-to-head: check if a and b played each other
    const h2hMatch = matches.find(
      (m) =>
        (m.team1Id === a.teamId && m.team2Id === b.teamId) ||
        (m.team1Id === b.teamId && m.team2Id === a.teamId)
    );
    if (h2hMatch && h2hMatch.winnerTeamId) {
      if (h2hMatch.winnerTeamId === a.teamId) return -1;
      if (h2hMatch.winnerTeamId === b.teamId) return 1;
    }

    // 3. Point difference (descending)
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;

    // 4. Sets won (descending)
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;

    // 5. Random (stable sort fallback — use teamId as tiebreaker for determinism)
    return a.teamId.localeCompare(b.teamId);
  });

  // Mark top 2 as qualified
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].qualified = i < 2;
  }

  return sorted;
}

export function getAllGroupStandings(eventId: string): Map<number, Standing[]> {
  const teams = getTeams(eventId);
  const groupNumbers = [...new Set(teams.map((t) => t.groupNumber).filter((g) => g !== null))] as number[];
  const result = new Map<number, Standing[]>();
  for (const g of groupNumbers) {
    result.set(g, calculateGroupStandings(eventId, g));
  }
  return result;
}