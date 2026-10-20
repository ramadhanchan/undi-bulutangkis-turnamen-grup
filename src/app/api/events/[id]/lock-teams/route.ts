import { NextResponse } from "next/server";
import { readAdminRequest } from "@/lib/admin-request";
import { isEventState } from "@/lib/event-state";
import { lockTeams } from "@/lib/pairing";
import { broadcast } from "@/lib/sse";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await readAdminRequest(request, id);
  if ("response" in admin) return admin.response;
  const { event } = admin;

  try {
    if (!isEventState(event.state, ["pairing"])) {
      return NextResponse.json(
        { error: "Event harus berada di fase undian tim" },
        { status: 400 }
      );
    }

    lockTeams(id);
    broadcast(id, { type: "teams_locked" });
    return NextResponse.json({ success: true, teamsLocked: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
