import { NextResponse } from "next/server";
import { regenerateAdminToken } from "@/lib/events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token : "";
    if (!token) {
      return NextResponse.json({ error: "Admin token required" }, { status: 401 });
    }

    const adminToken = regenerateAdminToken(id, token);
    return NextResponse.json({
      adminToken,
      adminUrl: `/event/${id}/admin/${adminToken}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
