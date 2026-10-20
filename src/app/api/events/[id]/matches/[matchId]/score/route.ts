import { NextResponse } from "next/server";
import { readAdminRequest } from "@/lib/admin-request";
import { getDb } from "@/lib/db";
import { isEventState } from "@/lib/event-state";
import { transitionPhase } from "@/lib/events";
import {
  advanceKnockoutRound,
  isKnockoutComplete,
} from "@/lib/bracket";
import { recordMatchScore } from "@/lib/scoring";
import { broadcast } from "@/lib/sse";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id, matchId } = await params;
  const admin = await readAdminRequest(request, id);
  if ("response" in admin) return admin.response;
  const { body, token, event } = admin;

  try {
    const db = getDb();
    const match = db
      .query(
        "SELECT phase, team1_id, team2_id FROM matches WHERE id = ? AND event_id = ?"
      )
      .get(matchId, id) as {
      phase: string;
      team1_id: string | null;
      team2_id: string | null;
    } | null;
    if (!match) {
      return NextResponse.json(
        { error: "Match tidak ditemukan" },
        { status: 404 }
      );
    }
    if (!match.team1_id || !match.team2_id) {
      return NextResponse.json(
        { error: "Match belum siap dimainkan" },
        { status: 400 }
      );
    }
    if (match.phase === "group" && !isEventState(event.state, ["group_stage"])) {
      return NextResponse.json(
        { error: "Skor grup tidak bisa diubah setelah knockout dimulai" },
        { status: 400 }
      );
    }
    const rawSets = body.sets;
    const sets = Array.isArray(rawSets) ? rawSets : [];
    const isWalkover = body.isWalkover === true;
    const walkoverWinnerId =
      typeof body.walkoverWinnerId === "string"
        ? body.walkoverWinnerId
        : undefined;

    if (isWalkover) {
      if (
        !walkoverWinnerId ||
        (walkoverWinnerId !== match.team1_id &&
          walkoverWinnerId !== match.team2_id)
      ) {
        return NextResponse.json(
          { error: "Pemenang walkover tidak valid" },
          { status: 400 }
        );
      }
    } else {
      const validSets = sets.every(
        (set) =>
          set !== null &&
          typeof set === "object" &&
          typeof (set as { t1?: unknown }).t1 === "number" &&
          typeof (set as { t2?: unknown }).t2 === "number"
      );
      if (!validSets) {
        return NextResponse.json(
          { error: "Skor tidak valid" },
          { status: 400 }
        );
      }
    }

    const result = db.transaction(() => {
      const recorded = recordMatchScore(
        matchId,
        sets as { t1: number; t2: number }[],
        isWalkover,
        walkoverWinnerId
      );

      if (event.state === "knockout") {
        advanceKnockoutRound(id);
        if (isKnockoutComplete(id)) {
          transitionPhase(id, token, "finished");
        }
      }

      return recorded;
    })();

    broadcast(id, {
      type: "score_updated",
      matchId,
      winnerTeamId: result.winnerTeamId,
    });
    return NextResponse.json({
      success: true,
      winnerTeamId: result.winnerTeamId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
