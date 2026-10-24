import { UserRole } from "@/types/database.types";

export type ObservationCategory = string;
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

      // Sincronización en segundo plano con el servidor / Supabase
      if (typeof window !== "undefined") {
        fetch("/api/observations")
          .then((res) => res.json())
          .then((data) => {
            if (
              data &&
              data.success &&
              Array.isArray(data.observations) &&
              data.observations.length > 0
            ) {
              ObservationsManager.observations = data.observations;
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data.observations)
              );
              window.dispatchEvent(new CustomEvent("erp_observations_updated"));
            }
          })
          .catch(() => {});
      }
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
      "Fecha y Hora",
      "Pantalla / Ruta",
      "Tipo de Observacion",
      "Titulo",
      "Detalle de la Observacion",
      "Usuario",
      "Correo",
      "Rol",
    ];

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
        cleanText(o.route || "/"),
        cleanText(o.category || "General"),
        cleanText(o.title),
        cleanText(o.description),
        cleanText(o.user_name),
        cleanText(o.user_email || ""),
        cleanText(o.user_role || "admin"),
      ].join(",");
    });

    return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  }

  public static exportToWord(): Blob {
    const list = ObservationsManager.getAll();
    const currentDate = new Date().toLocaleString("es-BO", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const tableRows = list
      .map((o, idx) => {
        const dateStr = new Date(o.created_at).toLocaleString("es-BO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const safeDesc = (o.description || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br/>");
        const safeTitle = (o.title || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const safeCategory = (o.category || "General")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        return `
          <tr style="border-bottom: 1pt solid #cbd5e1; ${
            idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"
          }">
            <td style="padding: 8pt; font-weight: bold; color: #64748b; text-align: center; width: 25pt; vertical-align: top;">${
              idx + 1
            }</td>
            <td style="padding: 8pt; white-space: nowrap; font-size: 8.5pt; color: #334155; width: 85pt; vertical-align: top;">${dateStr}</td>
            <td style="padding: 8pt; font-size: 8.5pt; color: #64748b; width: 85pt; vertical-align: top; font-family: monospace;">
              ${o.route || "/"}
            </td>
            <td style="padding: 8pt; font-size: 8.5pt; width: 80pt; vertical-align: top;">
              <span style="display: inline-block; padding: 2pt 6pt; border-radius: 3pt; background-color: #ffedd5; color: #9a3412; font-weight: bold; font-size: 8pt;">
                ${safeCategory}
              </span>
            </td>
            <td style="padding: 8pt; font-weight: bold; font-size: 9.5pt; color: #0f172a; width: 110pt; vertical-align: top;">
              ${safeTitle}
            </td>
            <td style="padding: 8pt; vertical-align: top; font-size: 9pt; color: #334155; line-height: 1.5; white-space: normal;">
              ${safeDesc}
            </td>
            <td style="padding: 8pt; font-size: 8.5pt; color: #334155; width: 85pt; vertical-align: top;">
              <div style="font-weight: 600; color: #0f172a;">${o.user_name || "Usuario"}</div>
              <div style="color: #64748b; font-size: 8pt; text-transform: uppercase;">${o.user_role || "admin"}</div>
            </td>
          </tr>
        `;
      })
      .join("");

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Reporte de Observaciones - INCEGUA ERP</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 landscape;
            margin: 1.8cm 1.5cm 1.8cm 1.5cm;
            mso-header-margin: 1cm;
            mso-footer-margin: 1cm;
          }
          body {
            font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            font-size: 10pt;
            line-height: 1.4;
          }
          h1 {
            color: #c85a32;
            font-size: 18pt;
            margin: 0 0 4pt 0;
            font-weight: bold;
          }
          .subtitle {
            font-size: 10.5pt;
            color: #475569;
            margin: 0 0 14pt 0;
          }
          .meta-table {
            width: 100%;
            margin-bottom: 16pt;
            border: 1pt solid #cbd5e1;
            background-color: #f8fafc;
            border-collapse: collapse;
          }
          .meta-table td {
            padding: 8pt 12pt;
            font-size: 9pt;
            border: 1pt solid #e2e8f0;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            border: 1pt solid #cbd5e1;
          }
          .data-table th {
            background-color: #c85a32;
            color: #ffffff;
            font-size: 9pt;
            font-weight: bold;
            text-align: left;
            padding: 9pt 8pt;
            border: 1pt solid #9a3412;
          }
          .footer-note {
            margin-top: 25pt;
            font-size: 8.5pt;
            color: #64748b;
            text-align: center;
            border-top: 1pt solid #e2e8f0;
            padding-top: 8pt;
          }
        </style>
      </head>
      <body>
        <table style="width: 100%; margin-bottom: 10pt;">
          <tr>
            <td style="vertical-align: middle;">
              <h1>INCEGUA S.R.L. &mdash; ERP Industrial</h1>
              <div class="subtitle">Reporte de Observaciones, Ajustes y Solicitudes de Mejora</div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <div style="font-size: 9pt; color: #64748b;">Documento Oficial de Control</div>
              <div style="font-size: 11pt; font-weight: bold; color: #c85a32;">F&aacute;brica de Ladrillos</div>
            </td>
          </tr>
        </table>

        <table class="meta-table">
          <tr>
            <td style="width: 33%;"><strong>Fecha de Emisión:</strong><br/>${currentDate}</td>
            <td style="width: 33%;"><strong>Total de Registros:</strong><br/>${list.length} observaciones registradas</td>
            <td style="width: 34%;"><strong>Emitido por:</strong><br/>SuperAdmin (Darinka Arias)</td>
          </tr>
          <tr>
            <td colspan="3" style="color: #475569; font-size: 8.5pt; background-color: #f1f5f9;">
              Este documento contiene las observaciones anotadas por el cliente y administradores para los ajustes y mejoras del sistema ERP.
            </td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25pt; text-align: center;">#</th>
              <th style="width: 85pt;">Fecha</th>
              <th style="width: 85pt;">Pantalla / Módulo</th>
              <th style="width: 80pt;">Tipo</th>
              <th style="width: 110pt;">Título</th>
              <th>Detalle de la Observación</th>
              <th style="width: 85pt;">Usuario</th>
            </tr>
          </thead>
          <tbody>
            ${
              tableRows ||
              '<tr><td colspan="7" style="padding: 20pt; text-align: center; color: #94a3b8;">No se han registrado observaciones aún.</td></tr>'
            }
          </tbody>
        </table>

        <div class="footer-note">
          Sistema de Gestión y Operaciones &bull; INCEGUA S.R.L. &bull; Reporte exportado en formato Microsoft Word (.doc)
        </div>
      </body>
      </html>
    `;

    return new Blob(["\uFEFF", wordHtml], {
      type: "application/msword;charset=utf-8;",
    });
  }
}
