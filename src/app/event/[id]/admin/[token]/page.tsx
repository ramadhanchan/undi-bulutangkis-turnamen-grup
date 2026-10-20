import { Suspense } from "react";
import AdminClient from "./client";

export default function Page({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}) {
  return (
    <Suspense fallback={<main className="p-8">Memuat event...</main>}>
      <AdminPage params={params} />
    </Suspense>
  );
}

async function AdminPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}) {
  const { id, token } = await params;
  return <AdminClient id={id} token={token} />;
}
