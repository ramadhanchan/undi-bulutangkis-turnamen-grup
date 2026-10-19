import { Suspense } from "react";
import AdminClient from "./client";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8">Loading...</main>}>
      <AdminClient />
    </Suspense>
  );
}
