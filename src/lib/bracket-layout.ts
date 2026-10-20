/**
 * Pure bracket geometry shared by the server and the UI.
 * Slot i in round r feeds slot floor(i / 2) in round r + 1.
 */
export function nextSlotPosition(position: number): number {
  return Math.floor(position / 2);
}
