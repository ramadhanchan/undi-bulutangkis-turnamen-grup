export interface SavedEvent {
  id: string;
  name: string;
  adminToken: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const STORAGE_KEY = "badminton:saved-events";

function isSavedEvent(value: unknown): value is SavedEvent {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    typeof entry.adminToken === "string"
  );
}

export function listSavedEvents(storage: StorageLike = window.localStorage): SavedEvent[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedEvent);
  } catch {
    return [];
  }
}

export function saveEvent(
  event: SavedEvent,
  storage: StorageLike = window.localStorage
): void {
  const events = listSavedEvents(storage).filter((e) => e.id !== event.id);
  events.unshift(event);
  storage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function updateSavedEventToken(
  id: string,
  adminToken: string,
  storage: StorageLike = window.localStorage
): void {
  let changed = false;
  const events = listSavedEvents(storage).map((event) => {
    if (event.id !== id) return event;
    changed = true;
    return { ...event, adminToken };
  });
  if (changed) storage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function removeSavedEvent(
  id: string,
  storage: StorageLike = window.localStorage
): void {
  const events = listSavedEvents(storage).filter((event) => event.id !== id);
  storage.setItem(STORAGE_KEY, JSON.stringify(events));
}
