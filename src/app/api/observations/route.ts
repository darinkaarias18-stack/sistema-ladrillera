import { NextResponse } from "next/server";
import { SystemObservation } from "@/lib/observations-manager";
import { createClient } from "@supabase/supabase-js";

// Supabase client con service role si existe para operaciones seguras en servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Cache en memoria como respaldo / fallback
let serverObservations: SystemObservation[] = [];

export async function GET() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("system_observations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          success: true,
          observations: data,
          source: "supabase",
        });
      }
    } catch (e) {
      console.warn("Error leyendo de Supabase system_observations:", e);
    }
  }

  return NextResponse.json({
    success: true,
    observations: serverObservations,
    source: "memory",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, observation, id, status, admin_notes, resolved_at } = body;

    if (action === "create" && observation) {
      serverObservations.unshift(observation);

      if (supabase) {
        try {
          await supabase.from("system_observations").insert([
            {
              user_name: observation.user_name,
              user_email: observation.user_email,
              user_role: observation.user_role,
              route: observation.route,
              category: observation.category,
              title: observation.title,
              description: observation.description,
            },
          ]);
        } catch (e) {
          console.warn("No se pudo insertar en Supabase (usando fallback en memoria):", e);
        }
      }

      return NextResponse.json({ success: true, observation });
    }

    if (action === "update" && id) {
      const target = serverObservations.find((o) => o.id === id);
      if (target) {
        if (status) target.status = status;
        if (admin_notes !== undefined) target.admin_notes = admin_notes;
        if (resolved_at !== undefined) target.resolved_at = resolved_at;
      }

      if (supabase) {
        try {
          await supabase
            .from("system_observations")
            .update({
              status,
              admin_notes,
              resolved_at,
            })
            .eq("id", id);
        } catch {}
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete" && id) {
      serverObservations = serverObservations.filter((o) => o.id !== id);

      if (supabase) {
        try {
          await supabase.from("system_observations").delete().eq("id", id);
        } catch {}
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
