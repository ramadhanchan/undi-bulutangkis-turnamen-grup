import {
  buildKnockoutSkeleton,
  getChampion,
  getQualifiedTeams,
} from "./bracket";
import { getEvent } from "./events";
import { getParticipants } from "./participants";
import { getTeams } from "./pairing";
import { getMatches } from "./schedule";
import { getAllGroupStandings, type Standing } from "./standings";
import type { EventState, Match, Team } from "./types";

export interface ParticipantView {
  id: string;
  name: string;
}

export interface TeamView {
  id: string;
  player1: ParticipantView;
  player2: ParticipantView;
  groupNumber: number | null;
}

export interface MatchTeamView {
  id: string;
  name: string;
}

export interface MatchSetView {
  t1: number | null;
  t2: number | null;
}

export interface MatchView {
  id: string;
  team1: MatchTeamView | null;
  team2: MatchTeamView | null;
  phase: "group" | "knockout";
  groupNumber: number | null;
  round: number;
  position: number | null;
  sets: MatchSetView[];
  winnerTeamId: string | null;
  isWalkover: boolean;
  playedAt: string | null;
}

export interface BracketSlotView {
  id: string;
  round: number;
  position: number | null;
  team1: MatchTeamView | null;
  team2: MatchTeamView | null;
  sets: MatchSetView[];
  winnerTeamId: string | null;
  isWalkover: boolean;
  isBye: boolean;
}

export interface BracketRoundView {
  round: number;
  slots: BracketSlotView[];
}

export interface StandingGroupView {
  group: number;
  standings: Standing[];
}

export interface EventSnapshot {
  id: string;
  name: string;
  state: EventState;
  createdAt: string;
  updatedAt: string;
  teamsLocked: boolean;
  participants: ParticipantView[];
  teams: TeamView[];
  matches: MatchView[];
  standings: StandingGroupView[];
  bracket: BracketRoundView[];
  previewBracket: BracketRoundView[];
  champion: string | null;
}

function setsOf(match: Match): MatchSetView[] {
  return [
    { t1: match.set1T1, t2: match.set1T2 },
    { t1: match.set2T1, t2: match.set2T2 },
    { t1: match.set3T1, t2: match.set3T2 },
  ];
}

function playerName(id: string, names: Map<string, string>): string {
  return names.get(id) ?? "Tanpa nama";
}

export function buildTeamViews(
  teams: Team[],
  participantNames: Map<string, string>
): TeamView[] {
  return teams.map((team) => ({
    id: team.id,
    player1: {
      id: team.player1Id,
      name: playerName(team.player1Id, participantNames),
    },
    player2: {
      id: team.player2Id,
      name: playerName(team.player2Id, participantNames),
    },
    groupNumber: team.groupNumber,
  }));
}

function teamName(
  team: Team | undefined,
  participantNames: Map<string, string>
): string {
  if (!team) return "BYE";
  return `${playerName(team.player1Id, participantNames)} / ${playerName(
    team.player2Id,
    participantNames
  )}`;
}

function buildBracket(
  matches: Match[],
  teamsById: Map<string, Team>,
  participantNames: Map<string, string>
): BracketRoundView[] {
  const knockoutMatches = matches.filter((match) => match.phase === "knockout");
  if (knockoutMatches.length === 0) return [];

  const rounds = new Map<number, BracketSlotView[]>();

  for (const match of knockoutMatches) {
    const slot: BracketSlotView = {
      id: match.id,
      round: match.round,
      position: match.position,
      team1: match.team1Id
        ? {
            id: match.team1Id,
            name: teamName(teamsById.get(match.team1Id), participantNames),
          }
        : null,
      team2: match.team2Id
        ? {
            id: match.team2Id,
            name: teamName(teamsById.get(match.team2Id), participantNames),
          }
        : null,
      sets: setsOf(match),
      winnerTeamId: match.winnerTeamId,
      isWalkover: match.isWalkover,
      isBye:
        match.round === 1 &&
        match.team2Id === null &&
        match.team1Id !== null &&
        match.winnerTeamId === match.team1Id,
    };

    const slots = rounds.get(match.round) ?? [];
    slots.push(slot);
    rounds.set(match.round, slots);
  }

  return toBracketRounds(rounds);
}

function toBracketRounds(
  rounds: Map<number, BracketSlotView[]>
): BracketRoundView[] {
  return [...rounds.entries()]
    .sort(([left], [right]) => left - right)
    .map(([round, slots]) => ({
      round,
      slots: slots.sort((left, right) => {
        if (left.position === null && right.position === null) {
          return left.id.localeCompare(right.id);
        }
        if (left.position === null) return 1;
        if (right.position === null) return -1;
        return left.position - right.position;
      }),
    }));
}

export function buildPreviewBracket(
  eventId: string,
  teamsById: Map<string, Team>,
  participantNames: Map<string, string>
): BracketRoundView[] {
  const qualified = getQualifiedTeams(eventId);
  if (qualified.length < 2) return [];
  const skeleton = buildKnockoutSkeleton(qualified);

  const rounds = new Map<number, BracketSlotView[]>();

  for (const slot of skeleton) {
    const view: BracketSlotView = {
      id: `preview-${slot.round}-${slot.position}`,
      round: slot.round,
      position: slot.position,
      team1: slot.team1Id
        ? {
            id: slot.team1Id,
            name: teamName(teamsById.get(slot.team1Id), participantNames),
          }
        : null,
      team2: slot.team2Id
        ? {
            id: slot.team2Id,
            name: teamName(teamsById.get(slot.team2Id), participantNames),
          }
        : null,
      sets: [
        { t1: null, t2: null },
        { t1: null, t2: null },
        { t1: null, t2: null },
      ],
      winnerTeamId: slot.isBye ? slot.team1Id : null,
      isWalkover: false,
      isBye: slot.isBye,
    };

    const slots = rounds.get(slot.round) ?? [];
    slots.push(view);
    rounds.set(slot.round, slots);
  }

  return toBracketRounds(rounds);
}

export function buildEventSnapshot(eventId: string): EventSnapshot | null {
  const event = getEvent(eventId);
  if (!event) return null;

  const participants = getParticipants(eventId);
  const participantNames = new Map(
    participants.map((participant) => [participant.id, participant.name])
  );

  const teams = getTeams(eventId);
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  const participantViews = participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
  }));

  const teamViews = buildTeamViews(teams, participantNames);

  const matches = getMatches(eventId);
  const matchViews = matches.map((match) => ({
    id: match.id,
    team1: match.team1Id
      ? {
          id: match.team1Id,
          name: teamName(teamsById.get(match.team1Id), participantNames),
        }
      : null,
    team2: match.team2Id
      ? {
          id: match.team2Id,
          name: teamName(teamsById.get(match.team2Id), participantNames),
        }
      : null,
    phase: match.phase,
    groupNumber: match.groupNumber,
    round: match.round,
    position: match.position,
    sets: setsOf(match),
    winnerTeamId: match.winnerTeamId,
    isWalkover: match.isWalkover,
    playedAt: match.playedAt,
  }));

  const standings: StandingGroupView[] = [];
  if (
    event.state === "group_stage" ||
    event.state === "knockout" ||
    event.state === "finished"
  ) {
    for (const [group, rows] of getAllGroupStandings(eventId)) {
      standings.push({ group, standings: rows });
    }
    standings.sort((left, right) => left.group - right.group);
  }

  const bracket = buildBracket(matches, teamsById, participantNames);
  const previewBracket =
    event.state === "group_stage"
      ? buildPreviewBracket(eventId, teamsById, participantNames)
      : [];
  const champion =
    event.state === "finished" || event.state === "knockout"
      ? getChampion(eventId)
      : null;

  return {
    id: event.id,
    name: event.name,
    state: event.state,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    teamsLocked: event.teamsLocked,
    participants: participantViews,
    teams: teamViews,
    matches: matchViews,
    standings,
    bracket,
    previewBracket,
    champion,
  };
}

