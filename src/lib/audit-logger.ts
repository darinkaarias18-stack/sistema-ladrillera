import { AuditLogEntry, AuditActionType, AuditSeverity, UserRole } from "@/types/database.types";

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-1",
    timestamp: "2026-10-21T12:55:00.000Z",
    user_id: "usr-superadmin",
    user_name: "Darinka Arias",
    user_email: "darinka.arias18@gmail.com",
    user_role: "superadmin",
    action: "LOGIN_SUCCESS",
    severity: "low",
    module: "seguridad",
    description: "Inicio de sesión exitoso como Super Administrador de INCEGUA S.R.L.",
    ip_address: "192.168.0.9",
    details: { device: "Chrome 128 / Windows NT 10.0" }
  },
  {
    id: "log-2",
    timestamp: "2026-10-21T12:40:12.000Z",
    user_id: "usr-admin-1",
    user_name: "Fernando Espinoza",
    user_email: "darinkaarias@gmail.com",
    user_role: "admin",
    action: "UPDATE",
    severity: "medium",
    module: "usuarios",
    entity_id: "prof-3",
    description: "Actualización de módulos asignados al personal de planta",
    ip_address: "192.168.0.14",
    details: { changed_fields: ["allowed_modules"], target: "Supervisor Producción" }
  },
  {
    id: "log-3",
    timestamp: "2026-10-21T11:30:45.000Z",
    user_id: "usr-ing-1",
    user_name: "Ing. Carlos Mendoza",
    user_email: "carlos.mendoza@incegua.bo",
    user_role: "ing_produccion",
    action: "CREATE",
    severity: "low",
    module: "produccion_hornos",
    entity_id: "horno-cycle-01",
    description: "Inicio de ciclo de quema en Horno Hoffman #1 (42,000 ladrillos 6 huecos)",
    ip_address: "192.168.0.22",
    details: { kiln_number: 1, batch_quantity: 42000, combustible: "gas_natural" }
  },
  {
    id: "log-4",
    timestamp: "2026-10-21T10:15:30.000Z",
    user_id: "usr-cajero-1",
    user_name: "Mariela Quispe",
    user_email: "mariela.caja@incegua.bo",
    user_role: "cajero",
    action: "CREATE",
    severity: "low",
    module: "caja",
    entity_id: "cash-tx-889",
    description: "Cobro nota de venta #PED-1042 por Bs. 18,200 (Constructora El Fuerte)",
    ip_address: "192.168.0.50",
    details: { monto: 18200, metodo: "efectivo", factura_emitida: true }
  },
  {
    id: "log-5",
    timestamp: "2026-10-21T09:45:10.000Z",
    user_id: "usr-despacho-1",
    user_name: "Roberto Vaca",
    user_email: "roberto.patio@incegua.bo",
    user_role: "entrega_recepcion",
    action: "STOCK_ADJUSTMENT",
    severity: "medium",
    module: "inventario",
    entity_id: "inv-6huecos",
    description: "Salida de 10,000 ladrillos 6 huecos en patio de despacho - Camión Placa 3421-XYZ",
    ip_address: "192.168.0.35",
    details: { tipo: "salida", cantidad: 10000, destino: "Santa Cruz Norte" }
  },
  {
    id: "log-6",
    timestamp: "2026-10-21T08:20:00.000Z",
    user_id: "anon",
    user_name: "Usuario Anónimo",
    user_email: "desconocido@red.local",
    user_role: "produccion",
    action: "SECURITY_ALERT",
    severity: "critical",
    module: "seguridad",
    description: "Intento no autorizado de acceso a ruta administrativa (/admin/usuarios) bloqueado por el cortafuegos Zero Trust",
    ip_address: "192.168.0.105",
    details: { route_attempt: "/admin/usuarios", user_agent: "Mozilla/5.0", blocked: true }
  },
  {
    id: "log-7",
    timestamp: "2026-10-20T17:10:00.000Z",
    user_id: "usr-superadmin",
    user_name: "Darinka Arias",
    user_email: "darinka.arias18@gmail.com",
    user_role: "superadmin",
    action: "ROLE_CHANGE",
    severity: "high",
    module: "usuarios",
    entity_id: "usr-cajero-1",
    description: "Configuración y asignación de permisos especiales para el rol Cajero",
    ip_address: "192.168.0.9",
    details: { previous_role: "ventas", new_role: "cajero" }
  }
];

export class AuditLogger {
  private static logs: AuditLogEntry[] = [...INITIAL_AUDIT_LOGS];

  private static initFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("erp_audit_logs");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            AuditLogger.logs = parsed;
          }
        } else {
          localStorage.setItem("erp_audit_logs", JSON.stringify(AuditLogger.logs));
        }
      } catch (e) {
        console.error("Error al leer logs de localStorage", e);
      }
    }
  }

  private static saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("erp_audit_logs", JSON.stringify(AuditLogger.logs));
        window.dispatchEvent(new CustomEvent("erp_audit_updated"));
      } catch (e) {
        console.error("Error al guardar logs en localStorage", e);
      }
    }
  }

  static getLogs(filters?: {
    module?: string;
    action?: string;
    severity?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): AuditLogEntry[] {
    AuditLogger.initFromStorage();
    let result = [...AuditLogger.logs];

    if (!filters) return result;

    if (filters.search && filters.search.trim() !== "") {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.user_name.toLowerCase().includes(q) ||
          l.user_email.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q) ||
          l.ip_address?.toLowerCase().includes(q)
      );
    }

    if (filters.module && filters.module !== "all") {
      result = result.filter((l) => l.module === filters.module);
    }

    if (filters.action && filters.action !== "all") {
      result = result.filter((l) => l.action === filters.action);
    }

    if (filters.severity && filters.severity !== "all") {
      result = result.filter((l) => l.severity === filters.severity);
    }

    if (filters.startDate) {
      result = result.filter((l) => l.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      result = result.filter((l) => l.timestamp <= filters.endDate!);
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static log(
    entry: Omit<AuditLogEntry, "id" | "timestamp" | "user_id" | "user_name" | "user_email" | "user_role"> & {
      user_id?: string;
      user_name?: string;
      user_email?: string;
      user_role?: UserRole;
    }
  ): AuditLogEntry {
    try {
      AuditLogger.initFromStorage();

      let userId = entry.user_id;
      let userName = entry.user_name;
      let userEmail = entry.user_email;
      let userRole = entry.user_role;

      if (typeof window !== "undefined") {
        try {
          const storedUser = localStorage.getItem("erp_current_user");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (!userId) userId = parsed.id;
            if (!userName) userName = parsed.name || parsed.fullName || parsed.full_name;
            if (!userEmail) userEmail = parsed.email;
            if (!userRole) userRole = parsed.role;
          }
        } catch (e) {}
      }

      const finalUserId = userId || "83ea7d79-d6d7-4d73-b9ee-5304497df779";
      const finalUserName = userName || "Darinka Arias";
      const finalUserEmail = userEmail || "darinka.arias18@gmail.com";
      const finalUserRole: UserRole = userRole || "superadmin";

      const newEntry: AuditLogEntry = {
        ...entry,
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        user_id: finalUserId,
        user_name: finalUserName,
        user_email: finalUserEmail,
        user_role: finalUserRole,
        ip_address: entry.ip_address || (typeof window !== "undefined" ? "192.168.1.100" : "127.0.0.1"),
      };

      AuditLogger.logs.unshift(newEntry);
      AuditLogger.saveToStorage();
      return newEntry;
    } catch (err) {
      console.error("Error en AuditLogger.log:", err);
      return {
        id: `log-fallback-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: "83ea7d79-d6d7-4d73-b9ee-5304497df779",
        user_name: "Darinka Arias",
        user_email: "darinka.arias18@gmail.com",
        user_role: "superadmin",
        action: entry.action,
        severity: entry.severity,
        module: entry.module,
        description: entry.description,
      };
    }
  }

  static logSecurityAlert(
    severity: AuditSeverity,
    description: string,
    details?: Record<string, any>,
    user?: { id?: string; name?: string; email?: string; role?: UserRole }
  ): AuditLogEntry {
    return AuditLogger.log({
      user_id: user?.id || "anon",
      user_name: user?.name || "Desconocido",
      user_email: user?.email || "anon@sistema.local",
      user_role: user?.role || "produccion",
      action: "SECURITY_ALERT",
      severity,
      module: "seguridad",
      description,
      details,
      ip_address: typeof window !== "undefined" ? "127.0.0.1" : "server-internal",
    });
  }

  static clearLogs(): void {
    AuditLogger.logs = [];
    if (typeof window !== "undefined") {
      localStorage.removeItem("erp_audit_logs");
      window.dispatchEvent(new CustomEvent("erp_audit_updated"));
    }
  }

  static exportToCSV(): string {
    AuditLogger.initFromStorage();
    const headers = ["ID", "Fecha/Hora (UTC)", "Usuario", "Email", "Rol", "Accion", "Severidad", "Modulo", "Descripcion", "IP"];
    const rows = AuditLogger.logs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.user_name.replace(/"/g, '""')}"`,
      l.user_email,
      l.user_role,
      l.action,
      l.severity,
      l.module,
      `"${l.description.replace(/"/g, '""')}"`,
      l.ip_address || "N/A",
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}
