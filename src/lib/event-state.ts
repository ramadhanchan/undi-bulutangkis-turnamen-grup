import type { EventState } from "./types";

export function isEventState(
  state: EventState,
  allowed: readonly EventState[]
): boolean {
  return allowed.includes(state);
}
