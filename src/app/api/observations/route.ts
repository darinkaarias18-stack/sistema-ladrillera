import { NextResponse } from "next/server";
import { SystemObservation } from "@/lib/observations-manager";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedSession, requireRoles } from "@/lib/auth-guard";

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
  const auth = await requireRoles(["superadmin", "admin"], "consultar observaciones del sistema");
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

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
    const auth = await requireAuthenticatedSession();
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action, observation, id, status, admin_notes, resolved_at } = body;

    if (action === "create" && observation) {
      // Forzar identidad verificada de la sesión del servidor para evitar suplantación
      const verifiedObservation: SystemObservation = {
        ...observation,
        user_id: auth.session.user!.id,
        user_name: auth.session.user!.fullName,
        user_email: auth.session.user!.email,
        user_role: auth.session.role,
      };
      serverObservations.unshift(verifiedObservation);

      if (supabase) {
        try {
          await supabase.from("system_observations").insert([
            {
              user_id: verifiedObservation.user_id,
              user_name: verifiedObservation.user_name,
              user_email: verifiedObservation.user_email,
              user_role: verifiedObservation.user_role,
              route: verifiedObservation.route,
              category: verifiedObservation.category,
              title: verifiedObservation.title,
              description: verifiedObservation.description,
            },
          ]);
        } catch (e) {
          console.warn("No se pudo insertar en Supabase (usando fallback en memoria):", e);
        }
      }

      return NextResponse.json({ success: true, observation: verifiedObservation });
    }

    if (action === "update" && id) {
      if (auth.session.role !== "superadmin") {
        return NextResponse.json(
          { success: false, error: "Acceso denegado: solo el Super Administrador puede actualizar observaciones." },
          { status: 403 }
        );
      }
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
      if (auth.session.role !== "superadmin") {
        return NextResponse.json(
          { success: false, error: "Acceso denegado: solo el Super Administrador puede eliminar observaciones." },
          { status: 403 }
        );
      }
      serverObservations = serverObservations.filter((o) => o.id !== id);

      if (supabase) {
        try {
          await supabase.from("system_observations").delete().eq("id", id);
        } catch {}
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
