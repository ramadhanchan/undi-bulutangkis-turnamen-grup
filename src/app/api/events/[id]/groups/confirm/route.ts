import { NextResponse } from "next/server";
import { readAdminRequest } from "@/lib/admin-request";
import { getDb } from "@/lib/db";
import { isEventState } from "@/lib/event-state";
import { transitionPhase } from "@/lib/events";
import { generateGroupStage, summarizeGroups } from "@/lib/schedule";
import { broadcast } from "@/lib/sse";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await readAdminRequest(request, id);
  if ("response" in admin) return admin.response;
  const { body, token, event } = admin;

  try {
    if (!isEventState(event.state, ["pairing"]) || !event.teamsLocked) {
      return NextResponse.json(
        { error: "Kunci tim terlebih dahulu" },
        { status: 400 }
      );
    }

    const rawGroups: unknown = body.groups;
    const isValidGroups =
      Array.isArray(rawGroups) &&
      rawGroups.every(
        (group) =>
          Array.isArray(group) &&
          group.every((teamId) => typeof teamId === "string")
      );
    if (!isValidGroups) {
      return NextResponse.json(
        { error: "Pembagian grup tidak valid" },
        { status: 400 }
      );
    }

    const groups = rawGroups as string[][];
    const db = getDb();
    db.transaction(() => {
      generateGroupStage(id, groups);
      transitionPhase(id, token, "group_stage");
    })();

    broadcast(id, { type: "groups_confirmed" });
    return NextResponse.json({
      success: true,
      state: "group_stage",
      summary: summarizeGroups(groups),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
