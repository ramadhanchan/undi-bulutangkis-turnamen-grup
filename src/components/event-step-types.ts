import type { EventSnapshot } from "@/lib/event-snapshot";

export interface EventStepProps {
  eventId: string;
  token?: string;
  canEdit: boolean;
  snapshot: EventSnapshot;
  onChanged: () => void;
}
