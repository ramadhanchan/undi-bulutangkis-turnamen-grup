/**
 * Group-stage counts: 3 or 4 teams per group, and 5 teams is impossible.
 * Shared by roster validation and group sizing so the rule lives in one place.
 */
export function isValidTeamCount(teamCount: number): boolean {
  return teamCount >= 3 && teamCount !== 5;
}
