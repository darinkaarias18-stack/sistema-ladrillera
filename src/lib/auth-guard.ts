import { getCurrentUserSession, UserSessionData } from "@/actions/auth";
import { UserRole } from "@/types/database.types";
import { PermissionAction, canPerformAction, canEditOrDelete } from "@/lib/role-validator";

export type AuthGuardResult =
  | { authorized: true; session: UserSessionData }
  | { authorized: false; error: string; status: 401 | 403 };

/**
 * Verifica que exista una sesión autenticada válida en el servidor.
 * Nunca confía en datos del cliente ni permite fallbacks anónimos.
 */
export async function requireAuthenticatedSession(): Promise<AuthGuardResult> {
  const session = await getCurrentUserSession();
  if (!session.user || !session.user.id) {
    return {
      authorized: false,
      error: "No autorizado: debe iniciar sesión para realizar esta operación.",
      status: 401,
    };
  }
  return { authorized: true, session };
}

/**
 * Verifica sesión activa y que el rol del usuario posea el permiso granular requerido.
 */
export async function requirePermission(
  permission: PermissionAction,
  actionContext: string = "esta operación"
): Promise<AuthGuardResult> {
  const auth = await requireAuthenticatedSession();
  if (!auth.authorized) return auth;

  if (!canPerformAction(auth.session.role, permission)) {
    return {
      authorized: false,
      error: `Acceso denegado: el rol '${auth.session.role}' no tiene permisos (${permission}) para ${actionContext}.`,
      status: 403,
    };
  }

  return auth;
}

/**
 * Verifica sesión activa y que el rol figure en la lista de roles permitidos.
 */
export async function requireRoles(
  allowedRoles: UserRole[],
  actionContext: string = "esta operación"
): Promise<AuthGuardResult> {
  const auth = await requireAuthenticatedSession();
  if (!auth.authorized) return auth;

  if (auth.session.role !== "superadmin" && !allowedRoles.includes(auth.session.role)) {
    return {
      authorized: false,
      error: `Acceso denegado: se requiere uno de los roles [${allowedRoles.join(", ")}] para ${actionContext}.`,
      status: 403,
    };
  }

  return auth;
}

/**
 * Verifica sesión activa y privilegios administrativos para editar o eliminar registros.
 */
export async function requireAdminEditDelete(
  actionContext: string = "editar o eliminar registros"
): Promise<AuthGuardResult> {
  const auth = await requireAuthenticatedSession();
  if (!auth.authorized) return auth;

  if (!canEditOrDelete(auth.session.role)) {
    return {
      authorized: false,
      error: `Acceso denegado: solo administradores pueden ${actionContext}.`,
      status: 403,
    };
  }

  return auth;
}
