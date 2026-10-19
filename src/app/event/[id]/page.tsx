import { Suspense } from "react";
import EventClient from "./client";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <EventClient />
    </Suspense>
  );
}
