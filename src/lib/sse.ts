type SSEController = ReadableStreamDefaultController<Uint8Array>;

const encoder = new TextEncoder();

// Map of eventId -> Set of controllers
const subscribers = new Map<string, Set<SSEController>>();

export function subscribe(eventId: string, controller: SSEController): () => void {
  if (!subscribers.has(eventId)) {
    subscribers.set(eventId, new Set());
  }
  subscribers.get(eventId)!.add(controller);
  return () => {
    const set = subscribers.get(eventId);
    if (set) {
      set.delete(controller);
      if (set.size === 0) subscribers.delete(eventId);
    }
  };
}

export function broadcast(eventId: string, data: unknown): void {
  const set = subscribers.get(eventId);
  if (!set || set.size === 0) return;
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(message);
  for (const controller of set) {
    try {
      controller.enqueue(encoded);
    } catch {
      set.delete(controller);
    }
  }
}

export function subscriberCount(eventId: string): number {
  return subscribers.get(eventId)?.size ?? 0;
}