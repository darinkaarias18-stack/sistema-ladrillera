import { UserRole } from "@/types/database.types";

export type ObservationCategory = "sugerencia" | "error" | "cambio_datos" | "duda" | "general";
export type ObservationPriority = "baja" | "media" | "alta" | "urgente";
export type ObservationStatus = "pendiente" | "en_revision" | "implementado" | "descartado";

export interface SystemObservation {
  id: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  route: string;
  category: ObservationCategory;
  priority: ObservationPriority;
  title: string;
  description: string;
  status: ObservationStatus;
  admin_notes?: string;
  resolved_at?: string;
}

const STORAGE_KEY = "erp_system_observations";
const WIDGET_ACTIVE_KEY = "erp_observations_widget_enabled";

const INITIAL_OBSERVATIONS: SystemObservation[] = [
  {
    id: "obs-1",
    created_at: "2026-10-23T14:30:00.000Z",
    user_id: "usr-admin-1",
    user_name: "Fernando Espinoza",
    user_email: "fernandoespinoza@gmail.com",
    user_role: "admin",
    route: "/produccion/catalogo",
    category: "sugerencia",
    priority: "media",
    title: "Excelente visualización de los 17 ladrillos",
    description: "Las fotos de los ladrillos se ven nítidas y los precios coinciden con la lista de planta. Sugerimos agregar la opción de imprimir una ficha técnica en PDF de cada ladrillo.",
    status: "en_revision",
  },
  {
    id: "obs-2",
    created_at: "2026-10-23T15:15:00.000Z",
    user_id: "usr-cajero-1",
    user_name: "Carla Garcia",
    user_email: "carlagarcia@gmail.com",
    user_role: "cajero",
    route: "/caja",
    category: "cambio_datos",
    priority: "media",
    title: "Saldo de apertura en caja",
    description: "Para la prueba simulamos un arqueo de inicio de Bs. 5,000. Cuando pasemos a producción real queremos poder registrar el monto de apertura diario.",
    status: "pendiente",
  },
  {
    id: "obs-3",
    created_at: "2026-10-23T16:00:00.000Z",
    user_id: "83ea7d79-d6d7-4d73-b9ee-5304497df779",
    user_name: "Darinka Arias",
    user_email: "darinka.arias18@gmail.com",
    user_role: "superadmin",
    route: "/admin/usuarios",
    category: "general",
    priority: "alta",
    title: "Restricción de roles para Administrador aplicada",
    description: "Verificado: Cuando el Admin ingresa, la cuenta de SuperAdmin no se muestra y el usuario Admin no puede ser editado ni eliminado.",
    status: "implementado",
    admin_notes: "Ajuste de seguridad y Zero Trust implementado con éxito.",
    resolved_at: "2026-10-23T16:45:00.000Z",
  }
];

export class ObservationsManager {
  private static observations: SystemObservation[] = [];
  private static initialized = false;

  public static init(): SystemObservation[] {
    if (typeof window === "undefined") {
      return INITIAL_OBSERVATIONS;
    }

    if (!ObservationsManager.initialized) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            ObservationsManager.observations = parsed;
          } else {
            ObservationsManager.observations = [...INITIAL_OBSERVATIONS];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ObservationsManager.observations));
          }
        } else {
          ObservationsManager.observations = [...INITIAL_OBSERVATIONS];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(ObservationsManager.observations));
        }
      } catch (e) {
        console.warn("Error leyendo observaciones de localStorage:", e);
        ObservationsManager.observations = [...INITIAL_OBSERVATIONS];
      }
      ObservationsManager.initialized = true;
    }

    return ObservationsManager.observations;
  }

  public static getAll(): SystemObservation[] {
    return ObservationsManager.init();
  }

  public static isWidgetEnabledForUsers(): boolean {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(WIDGET_ACTIVE_KEY);
      if (stored === null) return true; // Activo por defecto durante el periodo de pruebas
      return stored === "true";
    } catch {
      return true;
    }
  }

  public static setWidgetEnabledForUsers(enabled: boolean): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(WIDGET_ACTIVE_KEY, enabled ? "true" : "false");
        window.dispatchEvent(
          new CustomEvent("erp_observations_config_changed", {
            detail: { enabled },
          })
        );
      } catch (e) {
        console.warn("Error guardando configuración de widget:", e);
      }
    }
  }

  public static add(
    data: Omit<SystemObservation, "id" | "created_at" | "status">
  ): SystemObservation {
    ObservationsManager.init();

    const newObservation: SystemObservation = {
      ...data,
      id: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      status: "pendiente",
    };

    ObservationsManager.observations.unshift(newObservation);
    ObservationsManager.save();

    if (typeof window !== "undefined") {
      fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", observation: newObservation }),
      }).catch((err) => {
        console.warn("No se pudo enviar observación al servidor:", err);
      });
    }

    return newObservation;
  }

  public static updateStatus(
    id: string,
    status: ObservationStatus,
    admin_notes?: string
  ): boolean {
    ObservationsManager.init();
    const obs = ObservationsManager.observations.find((o) => o.id === id);
    if (!obs) return false;

    obs.status = status;
    if (admin_notes !== undefined) {
      obs.admin_notes = admin_notes;
    }
    if (status === "implementado" || status === "descartado") {
      obs.resolved_at = new Date().toISOString();
    } else {
      obs.resolved_at = undefined;
    }

    ObservationsManager.save();

    if (typeof window !== "undefined") {
      fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id,
          status,
          admin_notes: obs.admin_notes,
          resolved_at: obs.resolved_at,
        }),
      }).catch(() => {});
    }

    return true;
  }

  public static delete(id: string): boolean {
    ObservationsManager.init();
    const prevCount = ObservationsManager.observations.length;
    ObservationsManager.observations = ObservationsManager.observations.filter(
      (o) => o.id !== id
    );

    if (ObservationsManager.observations.length !== prevCount) {
      ObservationsManager.save();
      if (typeof window !== "undefined") {
        fetch("/api/observations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", id }),
        }).catch(() => {});
      }
      return true;
    }

    return false;
  }

  private static save() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(ObservationsManager.observations)
        );
        window.dispatchEvent(new CustomEvent("erp_observations_updated"));
      } catch (e) {
        console.warn("Error guardando observaciones en localStorage:", e);
      }
    }
  }

  public static exportToCSV(): string {
    const list = ObservationsManager.getAll();

    const headers = [
      "ID",
      "Fecha y Hora (Local)",
      "Usuario",
      "Correo",
      "Rol",
      "Pantalla / Ruta",
      "Categoria",
      "Prioridad",
      "Estado",
      "Titulo de la Observacion",
      "Detalle / Descripcion",
      "Notas SuperAdmin",
      "Fecha Resolucion"
    ];

    const categoryLabels: Record<string, string> = {
      sugerencia: "Sugerencia / Mejora",
      error: "Ajuste / Error",
      cambio_datos: "Cambio de Datos",
      duda: "Duda / Pregunta",
      general: "General",
    };

    const statusLabels: Record<string, string> = {
      pendiente: "Pendiente",
      en_revision: "En Revision",
      implementado: "Implementado / Resuelto",
      descartado: "Descartado",
    };

    const rows = list.map((o) => {
      const localDate = new Date(o.created_at).toLocaleString("es-BO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const cleanText = (txt?: string) =>
        txt ? `"${txt.replace(/"/g, '""').replace(/\n/g, " ")}"` : '""';

      return [
        o.id,
        `"${localDate}"`,
        cleanText(o.user_name),
        o.user_email || "",
        o.user_role || "",
        o.route || "/",
        `"${categoryLabels[o.category] || o.category}"`,
        (o.priority || "media").toUpperCase(),
        `"${statusLabels[o.status] || o.status}"`,
        cleanText(o.title),
        cleanText(o.description),
        cleanText(o.admin_notes),
        o.resolved_at ? `"${new Date(o.resolved_at).toLocaleDateString("es-BO")}"` : '""',
      ].join(",");
    });

    return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  }
}
