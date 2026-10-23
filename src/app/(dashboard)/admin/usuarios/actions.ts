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

  // El rol de SuperAdmin es exclusivo: Ni Admin ni nadie puede crear nuevos SuperAdmin
  if (role === "superadmin") {
    return { error: "Acceso denegado: El rol de Super Administrador es único y exclusivo. No se pueden crear nuevos usuarios con este rol." }
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

  const userMetadataRole = user.user_metadata?.role?.toLowerCase()
  const isMasterRequester = user.email?.toLowerCase() === "darinka.arias18@gmail.com" || userMetadataRole === "superadmin"
  const normalizedRole = isMasterRequester ? "superadmin" : (profile?.role?.toLowerCase() || userMetadataRole)

  // Solo admin y superadmin pueden eliminar usuarios
  if (normalizedRole !== "admin" && normalizedRole !== "superadmin") {
    return { error: "Solo los administradores pueden eliminar usuarios" }
  }

  // Obtener perfil del usuario objetivo
  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", targetUserId)
    .single()

  const isMasterTarget = 
    targetUserId === "83ea7d79-d6d7-4d73-b9ee-5304497df779" ||
    targetProfile?.email?.toLowerCase() === "darinka.arias18@gmail.com" ||
    targetProfile?.role === "superadmin"

  // BLINDAJE INMUTABLE: La cuenta principal de SuperAdmin jamás puede ser borrada ni anulada
  if (isMasterTarget) {
    return { error: "Acción estrictamente denegada: La cuenta de Super Administrador está blindada y jamás puede ser eliminada." }
  }

  const adminAuthClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Eliminar de Supabase Auth si existe
  const { error: deleteError } = await adminAuthClient.auth.admin.deleteUser(targetUserId)

  if (deleteError && !deleteError.message?.toLowerCase().includes("not found")) {
    return { error: "Error al eliminar en Supabase Auth: " + deleteError.message }
  }

  // Eliminar de la tabla profiles
  const { error: profileDeleteError } = await adminClient.from("profiles").delete().eq("id", targetUserId)
  if (profileDeleteError) {
    return { error: "Error al eliminar perfil: " + profileDeleteError.message }
  }

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

  const userMetadataRole = user.user_metadata?.role?.toLowerCase()
  const isMasterRequester = user.email?.toLowerCase() === "darinka.arias18@gmail.com" || userMetadataRole === "superadmin"
  const normalizedRole = isMasterRequester ? "superadmin" : (profile?.role?.toLowerCase() || userMetadataRole)

  // Solo admin y superadmin pueden editar
  if (normalizedRole !== "admin" && normalizedRole !== "superadmin") {
    return { error: "Solo los administradores pueden editar usuarios" }
  }

  const targetUserId = formData.get("id") as string
  const full_name = formData.get("full_name") as string
  const position = formData.get("position") as string
  const role = formData.get("role") as string
  const email = (formData.get("email") as string)?.trim()
  const password = (formData.get("password") as string)?.trim() // opcional
  const allowed_modules_raw = formData.get("allowed_modules") as string

  // Obtener perfil del usuario objetivo
  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("id, email, role")
    .eq("id", targetUserId)
    .single()

  const isTargetMaster = 
    targetUserId === "83ea7d79-d6d7-4d73-b9ee-5304497df779" ||
    targetProfile?.email?.toLowerCase() === "darinka.arias18@gmail.com" ||
    targetProfile?.role === "superadmin"

  // BLINDAJE INMUTABLE: La cuenta de SuperAdmin jamás puede ser editada ni degradada
  if (isTargetMaster) {
    return { error: "Acción estrictamente denegada: La cuenta de Super Administrador está blindada y no permite edición." }
  }

  // Nadie puede asignar o promover al rol de SuperAdmin
  if (role === "superadmin" && targetProfile?.role !== "superadmin") {
    return { error: "Acceso denegado: El rol de Super Administrador es único y exclusivo. No se puede asignar a otros usuarios." }
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

  // Actualizar en Auth (user_metadata, email y password)
  const authUpdatePayload: any = {
    user_metadata: {
      role,
      full_name,
      position,
      allowed_modules,
    }
  };

  if (email && email !== "") {
    authUpdatePayload.email = email;
    authUpdatePayload.email_confirm = true; // Auto-confirmar cambio de correo realizado por superadmin
  }

  if (password && password !== "") {
    if (password.length < 6) {
      return { error: "La nueva contraseña debe tener un mínimo de 6 caracteres." }
    }
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
  const profileUpdates: any = { full_name, position, role: role as any };
  if (email && email !== "") {
    profileUpdates.email = email;
  }

  let { error: profileError } = await adminClient
    .from("profiles")
    .update(profileUpdates)
    .eq("id", targetUserId);

  if (profileError) {
    const dbBaseRole = (role === 'cajero' || role === 'entrega_recepcion')
      ? 'ventas'
      : role === 'ing_produccion'
      ? 'produccion'
      : role;

    profileUpdates.role = dbBaseRole as any;
    const { error: fallbackErr } = await adminClient
      .from("profiles")
      .update(profileUpdates)
      .eq("id", targetUserId);

    profileError = fallbackErr;
  }

  if (profileError) {
    return { error: "Error al actualizar perfil: " + profileError.message };
  }

  return { success: true }
}
