"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"

export async function createUserAction(formData: FormData) {
  // 1. Validate that the current user is an admin
  const supabaseServer = await createServerClient()
  const { data: { user } } = await supabaseServer.auth.getUser()

  if (!user) {
    return { error: "No autorizado" }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  const adminClient = createClient(supabaseUrl, serviceKey)

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const normalizedRole = profile?.role?.toLowerCase()

  if (normalizedRole !== "admin" && normalizedRole !== "superadmin") {
    return { error: "No tienes permisos para crear usuarios" }
  }

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const full_name = formData.get("full_name") as string
  const position = formData.get("position") as string
  const role = formData.get("role") as string
  const allowed_modules_raw = formData.get("allowed_modules") as string

  // Reglas estrictas: Solo un SuperAdmin y un Admin en el sistema.
  // Un Administrador logueado no puede crear ni superadmin ni otro admin.
  if (role === "superadmin") {
    if (normalizedRole !== "superadmin") {
      return { error: "Solo un Super Administrador puede crear o asignar el rol de Super Admin." }
    }
    const { data: existingSuper } = await adminClient.from("profiles").select("id").eq("role", "superadmin")
    if (existingSuper && existingSuper.length > 0) {
      return { error: "Solo puede existir un único Super Administrador en el sistema." }
    }
  }

  if (role === "admin") {
    if (normalizedRole !== "superadmin") {
      return { error: "Un Administrador no puede crear otros usuarios Administradores. Solo el Super Administrador puede gestionar esta designación." }
    }
    const { data: existingAdmin } = await adminClient.from("profiles").select("id").eq("role", "admin")
    if (existingAdmin && existingAdmin.length > 0) {
      return { error: "Solo puede existir un único Administrador en el sistema. Ya se encuentra registrado un Administrador de Planta." }
    }
  }

  let allowed_modules: string[] = []
  try {
    if (allowed_modules_raw) {
      allowed_modules = JSON.parse(allowed_modules_raw)
    }
  } catch (e) {
    allowed_modules = []
  }
  allowed_modules = allowed_modules.filter((m) => m !== "/admin/usuarios");

  if (!email || !password || !full_name || !role) {
    return { error: "Faltan campos obligatorios" }
  }

  // 2. Create the user using the admin API to bypass rate limits and email confirmation
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      full_name,
      position,
      allowed_modules,
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: "No se pudo crear el usuario" }
  }

  // 3. Create the profile.
  // We attempt with the selected role first; if the database enum doesn't contain it yet,
  // we fallback to the corresponding base permission role while preserving custom role in user_metadata.
  let profileError;
  const { error: initialErr } = await adminClient
    .from("profiles")
    .upsert({
      id: authData.user.id,
      full_name,
      position,
      role: role as any,
      email,
    })

  if (initialErr) {
    // If enum restriction error, map to base permission role
    const dbBaseRole = (role === 'cajero' || role === 'entrega_recepcion')
      ? 'ventas'
      : role === 'ing_produccion'
      ? 'produccion'
      : role;

    const { error: fallbackErr } = await adminClient
      .from("profiles")
      .upsert({
        id: authData.user.id,
        full_name,
        position,
        role: dbBaseRole as any,
        email,
      });

    profileError = fallbackErr;
  }

  if (profileError) {
    console.error("Error creating profile:", profileError)
    return { error: "Usuario creado en Auth, pero error al guardar perfil: " + profileError.message }
  }

  return { success: true }
}

export async function deleteUserAction(targetUserId: string) {
  const supabaseServer = await createServerClient()
  const { data: { user } } = await supabaseServer.auth.getUser()

  if (!user) return { error: "No autorizado" }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  const adminClient = createClient(supabaseUrl, serviceKey)

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const normalizedRole = profile?.role?.toLowerCase()

  // admin y superadmin pueden eliminar
  if (normalizedRole !== "admin" && normalizedRole !== "superadmin") {
    return { error: "Solo los administradores pueden eliminar usuarios" }
  }

  const adminAuthClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Eliminar de Supabase Auth
  const { error: deleteError } = await adminAuthClient.auth.admin.deleteUser(targetUserId)

  if (deleteError) {
    return { error: "Error al eliminar en Supabase Auth: " + deleteError.message }
  }

  // Opcional: el registro de perfiles puede borrarse automáticamente con una cascada (ON DELETE CASCADE)
  // Pero lo hacemos manualmente por si acaso
  await adminClient.from("profiles").delete().eq("id", targetUserId)

  return { success: true }
}

export async function updateUserAction(formData: FormData) {
  const supabaseServer = await createServerClient()
  const { data: { user } } = await supabaseServer.auth.getUser()

  if (!user) return { error: "No autorizado" }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  const adminClient = createClient(supabaseUrl, serviceKey)

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const normalizedRole = profile?.role?.toLowerCase()

  // admin y superadmin pueden editar
  if (normalizedRole !== "admin" && normalizedRole !== "superadmin") {
    return { error: "Solo los administradores pueden editar usuarios" }
  }

  const targetUserId = formData.get("id") as string
  const full_name = formData.get("full_name") as string
  const position = formData.get("position") as string
  const role = formData.get("role") as string
  const password = formData.get("password") as string // opcional
  const allowed_modules_raw = formData.get("allowed_modules") as string

  // Reglas estrictas: Solo un SuperAdmin y un Admin en el sistema.
  if (role === "superadmin") {
    if (normalizedRole !== "superadmin") {
      return { error: "Solo un Super Administrador puede asignar el rol de Super Admin." }
    }
    const { data: existingSuper } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "superadmin")
      .neq("id", targetUserId)
    if (existingSuper && existingSuper.length > 0) {
      return { error: "Solo puede existir un único Super Administrador en el sistema." }
    }
  }

  if (role === "admin") {
    if (normalizedRole !== "superadmin" && targetUserId !== user.id) {
      return { error: "Un Administrador no puede promover usuarios a Administrador. Solo el Super Administrador puede realizar esta designación." }
    }
    const { data: existingAdmin } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .neq("id", targetUserId)
    if (existingAdmin && existingAdmin.length > 0) {
      return { error: "Solo puede existir un único Administrador en el sistema. Ya se encuentra registrado un Administrador de Planta." }
    }
  }

  let allowed_modules: string[] = []
  try {
    if (allowed_modules_raw) {
      allowed_modules = JSON.parse(allowed_modules_raw)
    }
  } catch (e) {
    allowed_modules = []
  }
  allowed_modules = allowed_modules.filter((m) => m !== "/admin/usuarios");

  if (!targetUserId || !full_name || !role) {
    return { error: "Faltan campos obligatorios" }
  }

  // Actualizar en Auth (user_metadata y opcionalmente password)
  const authUpdatePayload: any = {
    user_metadata: {
      role,
      full_name,
      position,
      allowed_modules,
    }
  };
  if (password && password.trim() !== "") {
    authUpdatePayload.password = password;
  }

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
    targetUserId,
    authUpdatePayload
  );

  if (updateAuthError) {
    return { error: "Error al actualizar en Auth: " + updateAuthError.message };
  }

  // Actualizar perfil público
  let { error: profileError } = await adminClient
    .from("profiles")
    .update({ full_name, position, role: role as any })
    .eq("id", targetUserId);

  if (profileError) {
    const dbBaseRole = (role === 'cajero' || role === 'entrega_recepcion')
      ? 'ventas'
      : role === 'ing_produccion'
      ? 'produccion'
      : role;

    const { error: fallbackErr } = await adminClient
      .from("profiles")
      .update({ full_name, position, role: dbBaseRole as any })
      .eq("id", targetUserId);

    profileError = fallbackErr;
  }

  if (profileError) {
    return { error: "Error al actualizar perfil: " + profileError.message };
  }

  return { success: true }
}
