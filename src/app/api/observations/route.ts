import { NextResponse } from "next/server";
import { SystemObservation } from "@/lib/observations-manager";

// Cache en memoria en servidor
let serverObservations: SystemObservation[] = [];

export async function GET() {
  return NextResponse.json({
    success: true,
    observations: serverObservations,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, observation, id, status, admin_notes, resolved_at } = body;

    if (action === "create" && observation) {
      serverObservations.unshift(observation);
      return NextResponse.json({ success: true, observation });
    }

    if (action === "update" && id) {
      const target = serverObservations.find((o) => o.id === id);
      if (target) {
        if (status) target.status = status;
        if (admin_notes !== undefined) target.admin_notes = admin_notes;
        if (resolved_at !== undefined) target.resolved_at = resolved_at;
      }
      return NextResponse.json({ success: true });
    }

    if (action === "delete" && id) {
      serverObservations = serverObservations.filter((o) => o.id !== id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
