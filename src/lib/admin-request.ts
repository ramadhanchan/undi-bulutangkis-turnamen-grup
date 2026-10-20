import { NextResponse } from "next/server";
import { getEvent, verifyAdminToken } from "./events";
import { readJsonBody } from "./http";
import type { Event } from "./types";

export interface AdminRequest {
  body: Record<string, unknown>;
  token: string;
  event: Event;
}

/**
 * Single gate for JSON mutation routes: event exists, body parses, and the
 * Admin Link matches. Route-specific state checks stay with the route.
 */
export async function readAdminRequest(
  request: Request,
  eventId: string
): Promise<AdminRequest | { response: NextResponse }> {
  const event = getEvent(eventId);
  if (!event) {
    return {
      response: NextResponse.json(
        { error: "Event tidak ditemukan." },
        { status: 404 }
      ),
    };
  }

  const body = await readJsonBody(request);
  if (!body) {
    return {
      response: NextResponse.json(
        { error: "Body permintaan tidak valid." },
        { status: 400 }
      ),
    };
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token || !verifyAdminToken(eventId, token)) {
    return {
      response: NextResponse.json(
        { error: "Admin Link tidak valid" },
        { status: 403 }
      ),
    };
  }

  return { body, token, event };
}
