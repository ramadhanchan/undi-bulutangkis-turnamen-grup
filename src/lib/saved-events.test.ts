import { describe, test, expect, beforeEach } from "bun:test";
import {
  listSavedEvents,
  removeSavedEvent,
  saveEvent,
  updateSavedEventToken,
} from "./saved-events";

function makeStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

const event = { id: "event-1", name: "Friday Badminton", adminToken: "token-1" };

let storage: ReturnType<typeof makeStorage>;

beforeEach(() => {
  storage = makeStorage();
});

describe("listSavedEvents", () => {
  test("returns an empty list when nothing is stored", () => {
    expect(listSavedEvents(storage)).toEqual([]);
  });

  test("ignores malformed JSON", () => {
    storage.setItem("badminton:saved-events", "{not json");
    expect(listSavedEvents(storage)).toEqual([]);
  });

  test("ignores entries with missing fields", () => {
    storage.setItem(
      "badminton:saved-events",
      JSON.stringify([event, { id: "event-2" }, null, "nope"])
    );
    expect(listSavedEvents(storage)).toEqual([event]);
  });
});

describe("saveEvent", () => {
  test("stores a new event at the front", () => {
    saveEvent(event, storage);
    const second = { id: "event-2", name: "Sunday", adminToken: "token-2" };
    saveEvent(second, storage);

    expect(listSavedEvents(storage)).toEqual([second, event]);
  });

  test("replaces an existing event with the same id", () => {
    saveEvent(event, storage);
    const renamed = { ...event, name: "Renamed" };
    saveEvent(renamed, storage);

    expect(listSavedEvents(storage)).toEqual([renamed]);
  });
});

describe("updateSavedEventToken", () => {
  test("updates the token for the matching event", () => {
    saveEvent(event, storage);
    updateSavedEventToken(event.id, "token-2", storage);

    expect(listSavedEvents(storage)).toEqual([{ ...event, adminToken: "token-2" }]);
  });

  test("leaves other events untouched", () => {
    const other = { id: "event-2", name: "Other", adminToken: "token-2" };
    saveEvent(other, storage);
    saveEvent(event, storage);

    updateSavedEventToken(event.id, "token-3", storage);

    expect(listSavedEvents(storage)).toEqual([
      { ...event, adminToken: "token-3" },
      other,
    ]);
  });
});

describe("removeSavedEvent", () => {
  test("removes only the matching event", () => {
    const other = { id: "event-2", name: "Other", adminToken: "token-2" };
    saveEvent(event, storage);
    saveEvent(other, storage);

    removeSavedEvent(event.id, storage);

    expect(listSavedEvents(storage)).toEqual([other]);
  });
});
