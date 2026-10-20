import type { EventSnapshot } from "./event-snapshot";
import { isValidTeamCount } from "./roster";
import type { EventState } from "./types";

export type FlowStep = "participants" | "teams" | "groups" | "bracket";
export type FlowStatus = "done" | "active" | "locked";

export interface FlowInput {
  state: EventState;
  teamsLocked: boolean;
  participantCount: number;
  teamCount: number;
  groupMatchCount: number;
  completedGroupMatchCount: number;
}

export type FlowSnapshot = Pick<
  EventSnapshot,
  "state" | "teamsLocked" | "participants" | "teams" | "matches"
>;

export function flowInputFromSnapshot(snapshot: FlowSnapshot): FlowInput {
  const groupMatches = snapshot.matches.filter(
    (match) => match.phase === "group"
  );

  return {
    state: snapshot.state,
    teamsLocked: snapshot.teamsLocked,
    participantCount: snapshot.participants.length,
    teamCount: snapshot.teams.length,
    groupMatchCount: groupMatches.length,
    completedGroupMatchCount: groupMatches.filter(
      (match) => match.winnerTeamId !== null
    ).length,
  };
}

export interface RosterValidation {
  valid: boolean;
  messages: string[];
}

export type FlowAction =
  | "add-participant"
  | "rename-participant"
  | "remove-participant"
  | "generate-teams"
  | "reshuffle-teams"
  | "swap-participants"
  | "lock-teams"
  | "draw-groups"
  | "reshuffle-groups"
  | "confirm-groups"
  | "score-group-match"
  | "start-knockout"
  | "score-knockout-match"
  | "present-bracket";

export interface FlowStepState {
  step: FlowStep;
  status: FlowStatus;
}

export interface FlowState {
  activeStep: FlowStep;
  steps: FlowStepState[];
  actions: FlowAction[];
  roster: RosterValidation;
  messages: string[];
}

export const STEP_ORDER: FlowStep[] = [
  "participants",
  "teams",
  "groups",
  "bracket",
];

export function validateRoster(participantCount: number): RosterValidation {
  const messages: string[] = [];

  if (participantCount === 0) {
    messages.push("Belum ada peserta.");
    return { valid: false, messages };
  }

  if (participantCount % 2 !== 0) {
    messages.push(`Jumlah peserta harus genap (sekarang ${participantCount}).`);
  }

  if (participantCount < 6) {
    messages.push("Minimal 6 peserta (3 tim).");
  }

  const teamCount = participantCount / 2;
  if (
    participantCount >= 6 &&
    participantCount % 2 === 0 &&
    !isValidTeamCount(teamCount)
  ) {
    messages.push(
      `${participantCount} peserta menghasilkan ${teamCount} tim dan tidak bisa dibagi menjadi grup 3–4. Tambah 2 (jadi ${
        participantCount + 2
      }) atau kurangi 2 (jadi ${participantCount - 2}).`
    );
  }

  return { valid: messages.length === 0, messages };
}

const ACTIVE_STEP: Record<EventState, FlowStep> = {
  registration: "participants",
  pairing: "teams",
  group_stage: "groups",
  knockout: "bracket",
  finished: "bracket",
};

function activeStepFor(input: FlowInput): FlowStep {
  if (input.state === "pairing") {
    return input.teamsLocked ? "groups" : "teams";
  }
  return ACTIVE_STEP[input.state];
}

export function deriveFlow(input: FlowInput): FlowState {
  const roster = validateRoster(input.participantCount);
  const activeStep = activeStepFor(input);
  const activeIndex = STEP_ORDER.indexOf(activeStep);

  const steps: FlowStepState[] = STEP_ORDER.map((step, index) => ({
    step,
    status:
      index < activeIndex
        ? "done"
        : index === activeIndex
          ? "active"
          : "locked",
  }));

  const actions: FlowAction[] = [];
  const messages: string[] = [];

  if (input.state === "registration") {
    actions.push("add-participant", "rename-participant", "remove-participant");
    if (roster.valid) actions.push("generate-teams");
  } else if (input.state === "pairing" && !input.teamsLocked) {
    if (input.teamCount > 0) {
      actions.push("reshuffle-teams", "swap-participants", "lock-teams");
    } else {
      actions.push("generate-teams");
      messages.push("Belum ada tim. Undi tim terlebih dahulu.");
    }
  } else if (input.state === "pairing" && input.teamsLocked) {
    actions.push("draw-groups", "reshuffle-groups", "confirm-groups");
  } else if (input.state === "group_stage") {
    actions.push("score-group-match");
    const remaining = input.groupMatchCount - input.completedGroupMatchCount;
    if (input.groupMatchCount === 0) {
      messages.push("Match grup belum dibuat.");
    } else if (remaining > 0) {
      messages.push(`Masih ada ${remaining} match grup yang belum selesai.`);
    } else {
      actions.push("start-knockout");
    }
  } else if (input.state === "knockout") {
    actions.push("score-knockout-match", "present-bracket");
  } else {
    actions.push("present-bracket");
  }

  return { activeStep, steps, actions, roster, messages };
}
