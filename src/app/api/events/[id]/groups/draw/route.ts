import { NextResponse } from "next/server";
import { readAdminRequest } from "@/lib/admin-request";
import { isEventState } from "@/lib/event-state";
import { getTeams } from "@/lib/pairing";
import { drawGroupAssignments, summarizeGroups } from "@/lib/schedule";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await readAdminRequest(request, id);
  if ("response" in admin) return admin.response;
  const { event } = admin;

  try {
    if (!isEventState(event.state, ["pairing"]) || !event.teamsLocked) {
      return NextResponse.json(
        { error: "Kunci tim terlebih dahulu" },
        { status: 400 }
      );
    }

    const teams = getTeams(id);
    if (teams.length === 0) {
      return NextResponse.json({ error: "Belum ada tim" }, { status: 400 });
    }

    const groups = drawGroupAssignments(teams.map((team) => team.id));
    return NextResponse.json({
      groups,
      summary: summarizeGroups(groups),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
