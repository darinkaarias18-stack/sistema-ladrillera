import { UserRole } from "@/types/database.types";
import { DEFAULT_ROLE_MODULES, getAllModuleHrefs } from "@/lib/modules-config";
import { getCurrentUserSession } from "@/actions/auth";

/**
 * Acciones y capacidades granulares del sistema
 */
export type PermissionAction =
  | "admin.users.manage"
  | "employees.view"
  | "employees.manage"
  | "payroll.view"
  | "payroll.manage"
  | "production.view"
  | "production.record"
  | "kilns.manage"
  | "inventory.view"
  | "inventory.manage"
  | "deliveries.view"
  | "deliveries.manage"
  | "sales.view"
  | "sales.create"
  | "cash.view"
  | "cash.manage"
  | "reports.view"
  | "reports.export";

/**
 * Matriz de Permisos Granulares por Rol
 */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  superadmin: [
    "admin.users.manage",
    "employees.view",
    "employees.manage",
    "payroll.view",
    "payroll.manage",
    "production.view",
    "production.record",
    "kilns.manage",
    "inventory.view",
    "inventory.manage",
    "deliveries.view",
    "deliveries.manage",
    "sales.view",
    "sales.create",
    "cash.view",
    "cash.manage",
    "reports.view",
    "reports.export",
  ],
  admin: [
    "admin.users.manage",
    "employees.view",
    "employees.manage",
    "payroll.view",
    "payroll.manage",
    "production.view",
    "production.record",
    "kilns.manage",
    "inventory.view",
    "inventory.manage",
    "deliveries.view",
    "deliveries.manage",
    "sales.view",
    "sales.create",
    "cash.view",
    "cash.manage",
    "reports.view",
    "reports.export",
  ],
  ing_produccion: [
    "employees.view",
    "production.view",
    "production.record",
    "kilns.manage",
    "inventory.view",
    "inventory.manage",
    "deliveries.view",
    "reports.view",
  ],
  produccion: [
    "production.view",
    "production.record",
    "kilns.manage",
    "inventory.view",
  ],
  entrega_recepcion: [
    "deliveries.view",
    "deliveries.manage",
    "inventory.view",
    "sales.view",
    "reports.view",
  ],
  cajero: [
    "sales.view",
    "sales.create",
    "deliveries.view",
    "cash.view",
    "cash.manage",
    "reports.view",
  ],
  ventas: [
    "sales.view",
    "sales.create",
    "deliveries.view",
    "cash.view",
  ],
};

/**
 * Etiquetas y estilos visuales para cada rol
 */
export const ROLE_METADATA: Record<
  UserRole,
  { label: string; description: string; badgeClass: string }
> = {
  superadmin: {
    label: "Super Administrador",
    description: "Control absoluto de todas las configuraciones, usuarios y módulos",
    badgeClass: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  admin: {
    label: "Administrador de Planta",
    description: "Gestión global de personal, producción, caja y operaciones",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  ing_produccion: {
    label: "Ing. de Producción",
    description: "Control técnico de vaciados, quemas en hornos, inventarios y personal",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
  produccion: {
    label: "Operario de Producción",
    description: "Registro de moldeo de ladrillos, horneado y stock en patio",
    badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  entrega_recepcion: {
    label: "Entrega y Despacho",
    description: "Recepción de producto en patio, control de stock y despacho de pedidos",
    badgeClass: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
  cajero: {
    label: "Cajero / Tesorería",
    description: "Arqueo de caja diaria, cobro de pedidos, compras y libros de caja",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  ventas: {
    label: "Ejecutivo de Ventas",
    description: "Atención a clientes, cotizaciones y registro de órdenes de venta",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
};

/**
 * Validador de acceso a una ruta URL según el rol y módulos personalizados
 */
export function canAccessRoute(
  role: UserRole,
  pathname: string,
  customAllowedModules?: string[]
): boolean {
  if (role === "superadmin") return true;

  // Ruta base siempre permitida a usuarios autenticados
  if (pathname === "/" || pathname === "/dashboard") return true;

  // Logs de auditoría y Módulo de Observaciones del Cliente: EXCLUSIVOS para superadmin (bloqueado para admin y demás roles)
  if (
    pathname.startsWith("/admin/auditoria") ||
    pathname.startsWith("/admin/logs") ||
    pathname.startsWith("/admin/observaciones")
  ) {
    return false;
  }

  // Gestión de usuarios y rutas administrativas operativas para admin
  if (pathname.startsWith("/admin")) {
    return role === "admin";
  }

  // Admin tiene acceso a todos los módulos operativos del sistema (excepto /admin/auditoria verificado arriba)
  if (role === "admin") {
    return true;
  }

  // Si tiene lista personalizada de módulos permitidos
  if (customAllowedModules && customAllowedModules.length > 0) {
    return customAllowedModules.some((modulePath) => {
      if (modulePath === "/") return pathname === "/";
      return pathname.startsWith(modulePath);
    });
  }

  // Módulos por defecto según el rol
  const defaultModules = DEFAULT_ROLE_MODULES[role] || [];
  return defaultModules.some((modulePath) => {
    if (modulePath === "/") return pathname === "/";
    return pathname.startsWith(modulePath);
  });
}

/**
 * REGLA ESTRICTA DE PERMISOS DE EDICIÓN Y ELIMINACIÓN:
 * - SuperAdmin y Admin: Tienen plenas facultades para EDITAR y ELIMINAR registros en los módulos.
 * - Otros Roles (cajero, ventas, produccion, ing_produccion, entrega_recepcion, etc.):
 *   NO tienen permisos para editar ni eliminar en ningún módulo.
 */
export function canEditOrDelete(role?: UserRole | string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "superadmin" || normalized === "admin";
}

/**
 * Validador de acceso exclusivo a los Logs de Auditoría (Solo SuperAdmin)
 */
export function canAccessAuditLogs(role?: UserRole | string | null): boolean {
  if (!role) return false;
  return role.toLowerCase() === "superadmin";
}

/**
 * Valida si un rol tiene permiso para ejecutar una acción específica
 */
export function canPerformAction(role: UserRole, permission: PermissionAction): boolean {
  if (role === "superadmin") return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Lanza una excepción si el rol no figura entre los permitidos
 */
export function assertRole(
  currentRole: UserRole,
  allowedRoles: UserRole[],
  actionContext: string = "esta operación"
): void {
  if (currentRole === "superadmin") return;
  if (!allowedRoles.includes(currentRole)) {
    throw new Error(
      `Acceso denegado: El rol '${currentRole}' no tiene autorización para realizar ${actionContext}. Se requiere: [${allowedRoles.join(
        ", "
      )}].`
    );
  }
}

/**
 * Validador para Server Actions
 * Verifica la sesión activa del usuario y comprueba si su rol está autorizado.
 */
export async function validateServerActionRole(
  allowedRoles: UserRole[],
  actionContext: string = "esta acción"
): Promise<{
  authorized: boolean;
  role: UserRole;
  userId: string | null;
  error?: string;
}> {
  try {
    const session = await getCurrentUserSession();
    const userRole = session.role;

    if (userRole === "superadmin") {
      return { authorized: true, role: userRole, userId: session.user?.id || null };
    }

    if (!allowedRoles.includes(userRole)) {
      return {
        authorized: false,
        role: userRole,
        userId: session.user?.id || null,
        error: `Acceso no autorizado: Se requiere uno de los roles [${allowedRoles.join(
          ", "
        )}] para ${actionContext}, pero tu rol es '${userRole}'.`,
      };
    }

    return {
      authorized: true,
      role: userRole,
      userId: session.user?.id || null,
    };
  } catch (err: any) {
    return {
      authorized: false,
      role: "produccion",
      userId: null,
      error: `Error al validar sesión y permisos: ${err?.message || "Error desconocido"}`,
    };
  }
}

/**
 * Agente validador de configuración de roles (auditoría en memoria)
 */
export class RoleValidatorAgent {
  /**
   * Ejecuta una auditoría completa de los módulos accesibles por rol
   */
  static auditRoleMatrix(): Record<
    UserRole,
    {
      role: UserRole;
      label: string;
      allowedModulesCount: number;
      modules: string[];
      permissionsCount: number;
      permissions: PermissionAction[];
    }
  > {
    const roles: UserRole[] = [
      "superadmin",
      "admin",
      "ing_produccion",
      "produccion",
      "entrega_recepcion",
      "cajero",
      "ventas",
    ];

    const result = {} as any;

    roles.forEach((r) => {
      const modules = r === "superadmin" || r === "admin"
        ? getAllModuleHrefs()
        : DEFAULT_ROLE_MODULES[r] || [];

      const permissions = ROLE_PERMISSIONS[r] || [];

      result[r] = {
        role: r,
        label: ROLE_METADATA[r].label,
        allowedModulesCount: modules.length,
        modules,
        permissionsCount: permissions.length,
        permissions,
      };
    });

    return result;
  }

  /**
   * Verifica si un conjunto de roles puede acceder a una ruta de prueba
   */
  static testRouteAccess(
    pathname: string
  ): Record<UserRole, { allowed: boolean; reason: string }> {
    const roles: UserRole[] = [
      "superadmin",
      "admin",
      "ing_produccion",
      "produccion",
      "entrega_recepcion",
      "cajero",
      "ventas",
    ];

    const report = {} as any;

    roles.forEach((role) => {
      const allowed = canAccessRoute(role, pathname);
      report[role] = {
        allowed,
        reason: allowed
          ? `Acceso permitido para ${role}`
          : `Acceso denegado: ${pathname} no está en los módulos asignados a ${role}`,
      };
    });

    return report;
  }
}
