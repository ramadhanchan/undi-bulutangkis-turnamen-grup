import { NextResponse } from "next/server";
import { readAdminRequest } from "@/lib/admin-request";
import { getDb } from "@/lib/db";
import { transitionPhase } from "@/lib/events";
import { canPair } from "@/lib/participants";
import { generateKnockoutBracket } from "@/lib/bracket";
import { getGroupStageProgress } from "@/lib/schedule";
import { broadcast } from "@/lib/sse";
import type { EventState } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await readAdminRequest(request, id);
  if ("response" in admin) return admin.response;
  const { body, token } = admin;

  try {
    const targetState =
      typeof body.targetState === "string" ? body.targetState : "";

    if (targetState === "finished") {
      return NextResponse.json(
        { error: "Fase selesai ditetapkan otomatis saat Final selesai" },
        { status: 400 }
      );
    }

    if (targetState === "group_stage") {
      return NextResponse.json(
        { error: "Gunakan aksi konfirmasi grup" },
        { status: 400 }
      );
    }

    if (targetState === "pairing") {
      const check = canPair(id);
      if (!check.ok) {
        return NextResponse.json(
          { error: check.reason ?? "Roster belum valid" },
          { status: 400 }
        );
      }
    }

    if (targetState === "knockout") {
      const progress = getGroupStageProgress(id);
      if (progress.total === 0) {
        return NextResponse.json(
          { error: "Match grup belum dibuat" },
          { status: 400 }
        );
      }
      if (progress.unfinished.length > 0) {
        return NextResponse.json(
          {
            error: `Masih ada ${progress.unfinished.length} match grup yang belum selesai`,
          },
          { status: 400 }
        );
      }
    }

    const db = getDb();
    const event = db.transaction(() => {
      const next = transitionPhase(id, token, targetState as EventState);
      if (targetState === "knockout") {
        generateKnockoutBracket(id);
      }
      return next;
    })();

    broadcast(id, { type: "phase_transition", state: event.state });
    return NextResponse.json({ id: event.id, state: event.state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan";
    const status = message.includes("Admin Link tidak valid") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
