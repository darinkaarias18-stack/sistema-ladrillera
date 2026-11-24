import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedSession, requireRoles } from "@/lib/auth-guard";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Credenciales de Supabase no configuradas en el servidor");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export async function GET() {
  try {
    const auth = await requireRoles(["superadmin"], "consultar registros de auditoría");
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("system_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return NextResponse.json({ success: true, logs: [], pending_migration: true });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const logs = (data || []).map((row) => ({
      id: row.id,
      timestamp: row.created_at,
      user_id: row.user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      user_role: row.user_role,
      action: row.action,
      severity: row.severity,
      module: row.module,
      entity_id: row.entity_id || undefined,
      description: row.description,
      details: row.details || undefined,
      ip_address: row.ip_address || undefined,
    }));

    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener logs de auditoría";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedSession();
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action, severity, module, entity_id, description, details } = body;

    if (!action || !severity || !module || !description) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios en el registro de auditoría" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    const ipAddress = extractClientIp(request);

    const { data: inserted, error } = await admin
      .from("system_audit_logs")
      .insert([
        {
          user_id: auth.session.user!.id,
          user_name: auth.session.user!.fullName,
          user_email: auth.session.user!.email,
          user_role: auth.session.role,
          action,
          severity,
          module,
          entity_id: entity_id || null,
          description,
          details: details || {},
          ip_address: ipAddress,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return NextResponse.json({ success: true, log: null, pending_migration: true });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: inserted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al registrar evento de auditoría";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
