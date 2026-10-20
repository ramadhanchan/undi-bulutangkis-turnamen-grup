"use client";

import { EventFlow } from "@/components/event-flow";

export default function AdminClient({
  id,
  token,
}: {
  id: string;
  token: string;
}) {
  return <EventFlow eventId={id} token={token} canEdit />;
}
