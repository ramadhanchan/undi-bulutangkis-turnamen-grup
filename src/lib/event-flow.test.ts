import { describe, test, expect } from "bun:test";
import { deriveFlow, validateRoster, type FlowInput } from "./event-flow";

function input(overrides: Partial<FlowInput> = {}): FlowInput {
  return {
    state: "registration",
    teamsLocked: false,
    participantCount: 8,
    teamCount: 0,
    groupMatchCount: 0,
    completedGroupMatchCount: 0,
    ...overrides,
  };
}

describe("validateRoster", () => {
  test("rejects an empty roster", () => {
    const result = validateRoster(0);
    expect(result.valid).toBe(false);
    expect(result.messages.join(" ")).toContain("Belum ada peserta");
  });

  test("rejects an odd count", () => {
    const result = validateRoster(7);
    expect(result.valid).toBe(false);
    expect(result.messages.join(" ")).toContain("genap");
  });

  test("rejects fewer than 6 participants", () => {
    const result = validateRoster(4);
    expect(result.valid).toBe(false);
    expect(result.messages.join(" ")).toContain("Minimal 6");
  });

  test("rejects 10 participants with actionable guidance", () => {
    const result = validateRoster(10);
    expect(result.valid).toBe(false);
    expect(result.messages.join(" ")).toContain("5 tim");
    expect(result.messages.join(" ")).toContain("12");
    expect(result.messages.join(" ")).toContain("8");
  });

  for (const count of [6, 8, 12, 14, 16, 20]) {
    test(`accepts ${count} participants`, () => {
      expect(validateRoster(count).valid).toBe(true);
    });
  }
});

describe("deriveFlow", () => {
  test("registration starts at Peserta and allows roster actions", () => {
    const flow = deriveFlow(input());

    expect(flow.activeStep).toBe("participants");
    expect(flow.steps).toEqual([
      { step: "participants", status: "active" },
      { step: "teams", status: "locked" },
      { step: "groups", status: "locked" },
      { step: "bracket", status: "locked" },
    ]);
    expect(flow.actions).toContain("add-participant");
    expect(flow.actions).toContain("rename-participant");
    expect(flow.actions).toContain("remove-participant");
    expect(flow.actions).toContain("generate-teams");
  });

  test("registration blocks team generation for an invalid roster", () => {
    const flow = deriveFlow(input({ participantCount: 10 }));
    expect(flow.actions).not.toContain("generate-teams");
  });

  test("pairing without a lock is Undi Tim", () => {
    const flow = deriveFlow(input({ state: "pairing", participantCount: 8, teamCount: 4 }));

    expect(flow.activeStep).toBe("teams");
    expect(flow.actions).toContain("reshuffle-teams");
    expect(flow.actions).toContain("swap-participants");
    expect(flow.actions).toContain("lock-teams");
  });

  test("pairing after the lock is Bagi Grup", () => {
    const flow = deriveFlow(
      input({ state: "pairing", teamsLocked: true, participantCount: 8, teamCount: 4 })
    );

    expect(flow.activeStep).toBe("groups");
    expect(flow.actions).toContain("draw-groups");
    expect(flow.actions).toContain("reshuffle-groups");
    expect(flow.actions).toContain("confirm-groups");
  });

  test("group stage blocks knockout while a match is unfinished", () => {
    const flow = deriveFlow(
      input({
        state: "group_stage",
        teamsLocked: true,
        participantCount: 8,
        teamCount: 4,
        groupMatchCount: 6,
        completedGroupMatchCount: 4,
      })
    );

    expect(flow.activeStep).toBe("groups");
    expect(flow.actions).not.toContain("start-knockout");
    expect(flow.messages.join(" ")).toContain("2 match grup");
  });

  test("group stage allows knockout when every match is finished", () => {
    const flow = deriveFlow(
      input({
        state: "group_stage",
        teamsLocked: true,
        participantCount: 8,
        teamCount: 4,
        groupMatchCount: 6,
        completedGroupMatchCount: 6,
      })
    );

    expect(flow.actions).toContain("start-knockout");
  });

  test("knockout is the Bagan step", () => {
    const flow = deriveFlow(
      input({
        state: "knockout",
        teamsLocked: true,
        participantCount: 8,
        teamCount: 4,
        groupMatchCount: 6,
        completedGroupMatchCount: 6,
      })
    );

    expect(flow.activeStep).toBe("bracket");
    expect(flow.steps.slice(0, 3).every((step) => step.status === "done")).toBe(true);
    expect(flow.actions).toContain("score-knockout-match");
    expect(flow.actions).toContain("present-bracket");
  });

  test("finished stays on the Bagan step", () => {
    const flow = deriveFlow(
      input({
        state: "finished",
        teamsLocked: true,
        participantCount: 8,
        teamCount: 4,
        groupMatchCount: 6,
        completedGroupMatchCount: 6,
      })
    );

    expect(flow.activeStep).toBe("bracket");
    expect(flow.actions).toContain("present-bracket");
  });
});
