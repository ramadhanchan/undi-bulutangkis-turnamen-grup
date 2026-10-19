import { randomUUID } from "crypto";
import { getDb } from "./db";
import { getAllGroupStandings } from "./standings";
import type { Match } from "./types";

export interface BracketMatch {
  id: string;
  team1Id: string | null;
  team2Id: string | null;
  round: number;
  winnerTeamId: string | null;
  isBye: boolean;
}

/**
 * Get qualified teams (top 2 per group) in seed order.
 * Group winners first (ordered by group), then runners-up (ordered by group).
 */
export function getQualifiedTeams(eventId: string): string[] {
  const allStandings = getAllGroupStandings(eventId);
  const groupNumbers = [...allStandings.keys()].sort((a, b) => a - b);

  const winners: string[] = [];
  const runnersUp: string[] = [];

  for (const g of groupNumbers) {
    const standings = allStandings.get(g)!;
    if (standings.length >= 1) winners.push(standings[0].teamId);
    if (standings.length >= 2) runnersUp.push(standings[1].teamId);
  }

  // Seed order: winners first (by group), then runners-up (by group)
  return [...winners, ...runnersUp];
}

/**
 * Determine bracket size (next power of 2 >= numTeams).
 */
function nextPowerOf2(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/**
 * Generate knockout bracket matches for an event.
 * Seeds by group ranking with cross-pairing.
 * Inserts byes for top seeds when bracket size is not a power of 2.
 */
export function generateKnockoutBracket(eventId: string): void {
  const qualified = getQualifiedTeams(eventId);
  if (qualified.length < 2) throw new Error("Need at least 2 qualified teams");

  const db = getDb();

  // Clear existing knockout matches
  db.run("DELETE FROM matches WHERE event_id = ? AND phase = 'knockout'", [eventId]);

  const bracketSize = nextPowerOf2(qualified.length);
  const numByes = bracketSize - qualified.length;

  // Qualified teams are already in seed order:
  // [winners by group, runners-up by group]
  // Seed index = position in array (0-based)

  // For cross-pairing, reorder: pair group winners with runners-up from different groups
  // Standard: 1A vs 2D, 1B vs 2C, etc. (for 4 groups)
  // For general case, we pair winners[i] with runnersUp[numGroups - 1 - i]
  const numGroups = Math.ceil(qualified.length / 2);
  const winners = qualified.slice(0, numGroups);
  const runnersUp = qualified.slice(numGroups);

  // Cross-pair: winner[i] plays runnerUp[numGroups-1-i]
  const seeded: string[] = [];
  for (let i = 0; i < numGroups; i++) {
    const runnerIdx = numGroups - 1 - i;
    if (runnerIdx >= 0 && runnerIdx < runnersUp.length) {
      seeded.push(winners[i]);
      seeded.push(runnersUp[runnerIdx]);
    } else {
      seeded.push(winners[i]);
    }
  }

  // If more runners-up than winners (shouldn't happen), append rest
  // Actually, qualified = winners + runnersUp, and numGroups = ceil(qualified/2)
  // For 8 teams: 4 winners + 4 runnersUp, numGroups=4. seeded has 8.
  // For 6 teams: 3 winners + 3 runnersUp, numGroups=3. seeded has 6.
  // For 4 teams: 2 winners + 2 runnersUp, numGroups=2. seeded has 4.
  // For 2 teams: 1 winner + 1 runnerUp, numGroups=1. seeded has 2.

  // Actually wait, for 2 teams (1 group), qualified = [winner, runnerUp], numGroups = 1
  // seeded = [winner, runnerUp[0]] = [winner, runnerUp]. Good.

  // Byes: top `numByes` seeds get byes
  // Bye teams are the first `numByes` in seeded order
  const byeTeams = seeded.slice(0, numByes);
  const playTeams = seeded.slice(numByes);

  // Round 1: pair up play teams
  // playTeams count should be even (bracketSize - 2*numByes = 2*(numTeams - numByes) - ... )
  // Actually: bracketSize = nextPowerOf2(numTeams), byes = bracketSize - numTeams
  // playTeams = numTeams - byes = 2*numTeams - bracketSize
  // This should be even since bracketSize is power of 2 and 2*numTeams - bracketSize is even

  // Round 1 matches (play-in)
  const round1Winners: string[] = [...byeTeams]; // byes advance
  const playInMatches: { team1: string | null; team2: string | null; round: number; isBye: boolean }[] = [];

  for (let i = 0; i < playTeams.length; i += 2) {
    if (i + 1 < playTeams.length) {
      playInMatches.push({
        team1: playTeams[i],
        team2: playTeams[i + 1],
        round: 1,
        isBye: false,
      });
    } else {
      // Odd team out gets a bye
      round1Winners.push(playTeams[i]);
    }
  }

  // Insert round 1 matches
  const round1MatchIds: string[] = [];
  for (const m of playInMatches) {
    const matchId = randomUUID();
    round1MatchIds.push(matchId);
    db.run(
      "INSERT INTO matches (id, event_id, team1_id, team2_id, phase, round, is_walkover) VALUES (?, ?, ?, ?, 'knockout', 1, 0)",
      [matchId, eventId, m.team1!, m.team2!]
    );
  }

  // For byes, create a match with team1 = bye team, team2 = null, winner = bye team
  for (const byeTeam of byeTeams) {
    const matchId = randomUUID();
    round1MatchIds.push(matchId);
    db.run(
      "INSERT INTO matches (id, event_id, team1_id, team2_id, phase, round, winner_team_id, is_walkover) VALUES (?, ?, ?, NULL, 'knockout', 1, ?, 0)",
      [matchId, eventId, byeTeam, byeTeam]
    );
  }

  // Now generate subsequent rounds
  // Round 1 winners (from matches) + bye teams advance to round 2
  // We need to create round 2 matches pairing them

  // For simplicity, let's create all rounds at once
  // Round 1 winners are determined by matches; byes advance automatically
  // Round 2 pairs: (bye1, playInWinner1), (bye2, playInWinner2), etc.

  // But we don't know play-in winners yet. So we create round 2 matches
  // with team1 = bye team and team2 = NULL (to be filled when round 1 completes)
  // Actually, that's not ideal. Let me instead create round 2 matches
  // after round 1 results are known. But that requires a separate step.

  // For now, let me create all rounds with placeholders:
  // Round 2: pair bye teams with play-in winners
  // Since we don't know winners, create matches with team1 = bye, team2 = NULL
  // The UI will show "TBD" for team2 until the match is played.

  // Actually, a cleaner approach: create the full bracket structure upfront
  // with NULL team2 for future rounds, and fill in team2 when the previous round completes.

  // Let me use a different approach: create matches round by round,
  // where each round's matches reference the previous round's match IDs.
  // But the schema doesn't have a "previous match" reference.

  // Simplest: just create round 1 matches now. Subsequent rounds will be
  // created when round 1 matches are completed (in the score submission handler).
  // But that complicates things.

  // Let me go with: create all rounds upfront with NULL for unknown teams.
  // Round 2 matches have team1 = bye team (or NULL) and team2 = NULL.
  // When a round 1 match is completed, we update the corresponding round 2 match.

  // For the scope of this ticket, let me create round 1 + round 2 matches.
  // Round 2: pair the bye teams with round 1 winners.

  // Number of round 2 matches = bracketSize / 4? No.
  // After round 1: byes + (playInMatches count) winners = numByes + playInMatches.length
  // = numByes + (playTeams.length / 2) = (bracketSize - numTeams) + (numTeams - byes) / 2
  // = bracketSize - numTeams + (numTeams - (bracketSize - numTeams)) / 2
  // = bracketSize - numTeams + (2*numTeams - bracketSize) / 2
  // = bracketSize - numTeams + numTeams - bracketSize/2
  // = numTeams - bracketSize/2
  // Hmm, for 6 teams: 6 - 4 = 2. For 8 teams: 8 - 4 = 4. For 4 teams: 4 - 2 = 2.
  // That's bracketSize/2 for the next round. Correct.

  // So round 2 has bracketSize/4 matches? No, bracketSize/2 teams → bracketSize/4 matches.
  // For 8 teams: 8/4 = 2 matches in round 2 (semifinals). Correct.
  // For 6 teams: 6/4 = 1.5... that's wrong.

  // Let me recalculate. After round 1:
  // - byes advance: numByes teams
  // - play-in winners: playTeams.length / 2 teams
  // Total: numByes + playTeams.length/2
  // For 6 teams: 2 + 4/2 = 2 + 2 = 4 teams. Round 2 has 4/2 = 2 matches. Correct.
  // For 8 teams: 0 + 8/2 = 4 teams. Round 2 has 4/2 = 2 matches. Correct.
  // For 4 teams: 0 + 4/2 = 2 teams. Round 2 has 2/2 = 1 match (final). Correct.
  // For 2 teams: 0 + 2/2 = 1 team. But we need at least 2 for a match.
  // For 2 teams, there's no round 1 (playTeams = 2, playInMatches = 1). Wait:
  // numByes = 0 (bracketSize = 2, numTeams = 2, byes = 0)
  // playTeams = [t1, t2], playInMatches = 1 (t1 vs t2)
  // round1Winners = [] (no byes)
  // After round 1: 1 winner. That's only 1 team. We need a final but there's no opponent.
  // Actually, for 2 teams, round 1 IS the final. So we don't need round 2.

  // So the number of rounds = log2(bracketSize)
  // Round 1 is the first round. If numTeams == bracketSize (no byes), round 1 has bracketSize/2 matches.
  // If byes > 0, round 1 has (numTeams - byes)/2 matches (play-in), and byes advance.

  // For subsequent rounds, I need to create matches that will be filled in later.
  // Let me just create round 1 matches now, and create subsequent rounds
  // when round 1 matches are completed.

  // Actually, for simplicity, let me create ALL rounds upfront with NULL team2
  // for future rounds. The matches will be "TBD" until filled.

  // But I need to track which match feeds into which. Let me use a simpler approach:
  // Create all matches for all rounds, where round 2+ matches have NULL teams.
  // When a round N match is completed, find the corresponding round N+1 match
  // and fill in the winner.

  // To track this, I'll store the match IDs in arrays per round.
  // roundMatches[round] = array of match IDs
  // When match i in round r completes, the winner goes to match floor(i/2) in round r+1.

  // Let me just create round 1 for now, and handle subsequent rounds in the score submission.

  // Actually, the simplest approach for the demo: create all rounds upfront
  // with NULL teams for future rounds, and auto-fill when scores are submitted.

  // Let me store round info in a separate table or in the match's round field.
  // The round field already exists. I'll create matches for all rounds.

  // For round 2+: team1 and team2 are NULL initially.
  // When a round r match completes, I find the round r+1 match at position floor(matchIndex/2)
  // and set the appropriate team (team1 if matchIndex is even, team2 if odd).

  // But I need to track match positions. Let me add a "position" field or use the match order.

  // For simplicity, let me just create round 1 matches now. When all round 1 matches
  // (and byes) are done, I'll create round 2 matches. And so on.

  // Actually, let me just create all rounds upfront. I'll assign positions.

  // Number of rounds = log2(bracketSize)
  // (unused variable removed)

  // For each round, number of matches = bracketSize / 2^round
  // Round 1: bracketSize/2 matches
  // But if byes > 0, round 1 has (numTeams - byes) / 2 + byes matches
  // = (numTeams - byes + 2*byes) / 2 = (numTeams + byes) / 2 = (numTeams + bracketSize - numTeams) / 2 = bracketSize / 2
  // So round 1 always has bracketSize/2 matches. 

  // For byes, the match has team1 = bye team, team2 = NULL, winner = bye team (pre-set).
  // For play-in, team1 and team2 are the play teams.

  // Round 2+: all teams are TBD (NULL), matches created with NULL team1 and team2.
  // They'll be filled in when the previous round completes.

  // But NULL team1 and team2 violates the NOT NULL constraint on team1_id.
  // Let me make team1_id nullable too.

  // Hmm, this is getting complicated. Let me simplify.

  // Alternative approach: create matches lazily. When transitioning to knockout,
  // create round 1 matches only. When a round 1 match is scored, check if all
  // round 1 matches are done. If so, create round 2 matches with the winners.
  // And so on.

  // This is cleaner. Let me do this.

  // For now, just create round 1 matches.
  // Round 1 matches are already created above (playInMatches + bye matches).
  // Round 2+ will be created lazily.
}

export function getKnockoutMatches(eventId: string): Match[] {
  const db = getDb();
  const rows = db
    .query("SELECT id, event_id, team1_id, team2_id, phase, group_number, round, set1_t1, set1_t2, set2_t1, set2_t2, set3_t1, set3_t2, winner_team_id, is_walkover, played_at, created_at FROM matches WHERE event_id = ? AND phase = 'knockout' ORDER BY round, id")
    .all(eventId) as {
      id: string;
      event_id: string;
      team1_id: string | null;
      team2_id: string | null;
      phase: string;
      group_number: number | null;
      round: number;
      set1_t1: number | null;
      set1_t2: number | null;
      set2_t1: number | null;
      set2_t2: number | null;
      set3_t1: number | null;
      set3_t2: number | null;
      winner_team_id: string | null;
      is_walkover: number;
      played_at: string | null;
      created_at: string;
    }[];
  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    team1Id: r.team1_id,
    team2Id: r.team2_id,
    phase: r.phase as "group" | "knockout",
    groupNumber: r.group_number,
    round: r.round,
    set1T1: r.set1_t1,
    set1T2: r.set1_t2,
    set2T1: r.set2_t1,
    set2T2: r.set2_t2,
    set3T1: r.set3_t1,
    set3T2: r.set3_t2,
    winnerTeamId: r.winner_team_id,
    isWalkover: r.is_walkover === 1,
    playedAt: r.played_at,
    createdAt: r.created_at,
  }));
}

export function isKnockoutComplete(eventId: string): boolean {
  const matches = getKnockoutMatches(eventId);
  if (matches.length === 0) return false;
  const maxRound = Math.max(...matches.map((m) => m.round));
  const finalMatches = matches.filter((m) => m.round === maxRound);
  return finalMatches.length === 1 && finalMatches[0].winnerTeamId !== null;
}

export function advanceKnockoutRound(eventId: string): void {
  const db = getDb();
  const matches = getKnockoutMatches(eventId);
  if (matches.length === 0) return;

  const maxRound = Math.max(...matches.map((m) => m.round));
  const currentRoundMatches = matches.filter((m) => m.round === maxRound);

  // Check if all current round matches are complete
  const allComplete = currentRoundMatches.every((m) => m.winnerTeamId !== null);
  if (!allComplete) return;

  // If only 1 match in this round, it's the final — done
  if (currentRoundMatches.length === 1) return;

  const nextRound = maxRound + 1;
  const winners = currentRoundMatches.map((m) => m.winnerTeamId!);

  const nextRoundMatches = matches.filter((m) => m.round === nextRound);

  // If next round already exists, update team slots to reflect (possibly corrected) winners
  if (nextRoundMatches.length > 0) {
    for (let i = 0; i < winners.length; i += 2) {
      const idx = i / 2;
      const m = nextRoundMatches[idx];
      if (!m) continue;
      if (i + 1 < winners.length) {
        db.run("UPDATE matches SET team1_id = ?, team2_id = ?, winner_team_id = NULL, is_walkover = 0, set1_t1 = NULL, set1_t2 = NULL, set2_t1 = NULL, set2_t2 = NULL, set3_t1 = NULL, set3_t2 = NULL, played_at = NULL WHERE id = ?", [
          winners[i],
          winners[i + 1],
          m.id,
        ]);
      } else {
        // odd winner gets a bye
        db.run("UPDATE matches SET team1_id = ?, team2_id = NULL, winner_team_id = ?, is_walkover = 0, set1_t1 = NULL, set1_t2 = NULL, set2_t1 = NULL, set2_t2 = NULL, set3_t1 = NULL, set3_t2 = NULL, played_at = NULL WHERE id = ?", [
          winners[i],
          winners[i],
          m.id,
        ]);
      }
    }
    return;
  }

  // Pair winners: (0,1), (2,3), etc.
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      const matchId = randomUUID();
      db.run(
        "INSERT INTO matches (id, event_id, team1_id, team2_id, phase, round, is_walkover) VALUES (?, ?, ?, ?, 'knockout', ?, 0)",
        [matchId, eventId, winners[i], winners[i + 1], nextRound]
      );
    } else {
      // Odd winner gets a bye
      const matchId = randomUUID();
      db.run(
        "INSERT INTO matches (id, event_id, team1_id, team2_id, phase, round, winner_team_id, is_walkover) VALUES (?, ?, ?, NULL, 'knockout', ?, ?, 0)",
        [matchId, eventId, winners[i], nextRound, winners[i]]
      );
    }
  }
}
export function getChampion(eventId: string): string | null {
  if (!isKnockoutComplete(eventId)) return null;
  const matches = getKnockoutMatches(eventId);
  const maxRound = Math.max(...matches.map((m) => m.round));
  const final = matches.find((m) => m.round === maxRound);
  return final?.winnerTeamId || null;
}