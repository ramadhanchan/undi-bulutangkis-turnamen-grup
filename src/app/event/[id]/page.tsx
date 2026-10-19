import { Suspense } from "react";
import EventClient from "./client";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <EventPage params={params} />
    </Suspense>
  );
}

async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventClient id={id} />;
}
