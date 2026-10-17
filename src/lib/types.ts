export type EventState =
  | "registration"
  | "pairing"
  | "group_stage"
  | "knockout"
  | "finished";

export interface Event {
  id: string;
  name: string;
  adminToken: string;
  state: EventState;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  createdAt: string;
}

export interface Team {
  id: string;
  eventId: string;
  player1Id: string;
  player2Id: string;
  groupNumber: number | null;
  createdAt: string;
}

export interface Match {
  id: string;
  eventId: string;
  team1Id: string | null;
  team2Id: string | null;
  phase: "group" | "knockout";
  groupNumber: number | null;
  round: number;
  set1T1: number | null;
  set1T2: number | null;
  set2T1: number | null;
  set2T2: number | null;
  set3T1: number | null;
  set3T2: number | null;
  winnerTeamId: string | null;
  isWalkover: boolean;
  playedAt: string | null;
  createdAt: string;
}