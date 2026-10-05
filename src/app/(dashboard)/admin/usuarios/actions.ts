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

  if (!email || !password || !full_name || !role) {
    return { error: "Faltan campos obligatorios" }
  }

  // 2. Create the user using the admin API to bypass rate limits and email confirmation
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: "No se pudo crear el usuario" }
  }

  // 3. Create the profile.
  // Normally the profile is created by a database trigger on auth.users insert.
  // If the trigger exists, doing an insert here will cause a unique constraint violation.
  // So we try an upsert or update instead.
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: authData.user.id,
      full_name,
      position,
      role,
      email,
    })

  if (profileError) {
    // If we can't write to profiles, it might be RLS.
    // Assuming the admin has RLS privileges or we just return the error.
    console.error("Error creating profile:", profileError)
    // We don't fail completely, as the auth user was created, but we inform the client.
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

  if (!targetUserId || !full_name || !role) {
    return { error: "Faltan campos obligatorios" }
  }

  // Actualizar perfil público
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ full_name, position, role })
    .eq("id", targetUserId)

  if (profileError) {
    return { error: "Error al actualizar perfil: " + profileError.message }
  }

  // Si envían password, actualizar en Auth
  if (password && password.trim() !== "") {
    if (!serviceKey) {
      return { error: "Perfil actualizado. Pero para cambiar contraseña falta SUPABASE_SERVICE_ROLE_KEY" }
    }

    const adminAuthClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { error: updateAuthError } = await adminAuthClient.auth.admin.updateUserById(
      targetUserId,
      { password }
    )

    if (updateAuthError) {
      return { error: "Perfil actualizado. Pero error en contraseña: " + updateAuthError.message }
    }
  }

  return { success: true }
}
