"use client";

import { EventFlow } from "@/components/event-flow";

export default function EventClient({ id }: { id: string }) {
  return <EventFlow eventId={id} />;
}
