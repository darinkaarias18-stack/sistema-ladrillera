"use client"

import { useState, useEffect, useMemo } from "react"
import { AuditLogEntry, AuditActionType, AuditSeverity, UserRole } from "@/types/database.types"
import { store } from "@/lib/store"
import { AuditLogger } from "@/lib/audit-logger"
import {
  Search,
  Download,
  ShieldAlert,
  Filter,
  RotateCcw,
  FileText,
  AlertTriangle,
  Info,
  Clock,
  User,
  X,
  Activity,
  ShieldCheck,
  Flame,
  Wallet,
  Boxes,
  Users as UsersIcon,
  Eye
} from "lucide-react"

interface AuditoriaClientProps {
  initialLogs: AuditLogEntry[]
  currentUserRole: string
}

const ACTION_LABELS: Record<AuditActionType, { label: string; badgeClass: string }> = {
  CREATE: { label: "Creación", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  UPDATE: { label: "Modificación", badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  DELETE: { label: "Eliminación", badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  LOGIN_SUCCESS: { label: "Login Exitoso", badgeClass: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  LOGIN_FAILED: { label: "Login Fallido", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  SECURITY_ALERT: { label: "Alerta de Seguridad", badgeClass: "bg-red-500/10 text-red-600 border-red-500/20" },
  EXPORT_DATA: { label: "Exportación", badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  STOCK_ADJUSTMENT: { label: "Ajuste de Stock", badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  ROLE_CHANGE: { label: "Cambio de Rol", badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
}

const SEVERITY_BADGES: Record<AuditSeverity, { label: string; badgeClass: string; icon: any }> = {
  low: { label: "Baja", badgeClass: "bg-slate-100 text-slate-700 border-slate-200", icon: Info },
  medium: { label: "Media", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertTriangle },
  high: { label: "Alta", badgeClass: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertTriangle },
  critical: { label: "Crítica", badgeClass: "bg-red-100 text-red-700 border-red-300 font-bold animate-pulse", icon: ShieldAlert },
}

const MODULE_ICONS: Record<string, any> = {
  seguridad: ShieldCheck,
  usuarios: UsersIcon,
  caja: Wallet,
  produccion_hornos: Flame,
  produccion: Flame,
  inventario: Boxes,
  empleados: UsersIcon,
  ventas: Wallet,
}

export function AuditoriaClient({ initialLogs, currentUserRole }: AuditoriaClientProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs)
  const [search, setSearch] = useState("")
  const [selectedModule, setSelectedModule] = useState<string>("all")
  const [selectedAction, setSelectedAction] = useState<string>("all")
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all")
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  // Rol activo sincronizado con el simulador y eventos globales
  const [activeRole, setActiveRole] = useState<string>(currentUserRole || store.getCurrentRole())

  useEffect(() => {
    const handleRoleUpdate = (e: any) => {
      const newRole = e?.detail || store.getCurrentRole()
      setActiveRole(newRole)
    }
    const handleAuditUpdate = () => {
      setLogs(AuditLogger.getLogs())
    }

    window.addEventListener("erp_role_changed", handleRoleUpdate)
    window.addEventListener("erp_audit_updated", handleAuditUpdate)
    window.addEventListener("storage", handleAuditUpdate)

    return () => {
      window.removeEventListener("erp_role_changed", handleRoleUpdate)
      window.removeEventListener("erp_audit_updated", handleAuditUpdate)
      window.removeEventListener("storage", handleAuditUpdate)
    }
  }, [])

  // Filtrado de logs en memoria
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedModule !== "all" && log.module !== selectedModule) return false
      if (selectedAction !== "all" && log.action !== selectedAction) return false
      if (selectedSeverity !== "all" && log.severity !== selectedSeverity) return false
      if (search.trim() !== "") {
        const q = search.toLowerCase()
        const matchDesc = log.description?.toLowerCase().includes(q)
        const matchUser = log.user_name?.toLowerCase().includes(q)
        const matchEmail = log.user_email?.toLowerCase().includes(q)
        const matchModule = log.module?.toLowerCase().includes(q)
        const matchIp = log.ip_address?.toLowerCase().includes(q)
        return matchDesc || matchUser || matchEmail || matchModule || matchIp
      }
      return true
    })
  }, [logs, selectedModule, selectedAction, selectedSeverity, search])

  // KPIs
  const totalEvents = logs.length
  const criticalCount = logs.filter((l) => l.severity === "critical" || l.action === "SECURITY_ALERT").length
  const cashEvents = logs.filter((l) => l.module === "caja").length
  const productionEvents = logs.filter((l) => l.module.startsWith("produccion") || l.module === "inventario").length

  const handleExportCSV = () => {
    const csvContent = AuditLogger.exportToCSV()
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `incegua_auditoria_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleResetFilters = () => {
    setSearch("")
    setSelectedModule("all")
    setSelectedAction("all")
    setSelectedSeverity("all")
  }

  // BARRERA DE SEGURIDAD CLIENT-SIDE: Solo SuperAdmin
  if (activeRole !== "superadmin") {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center max-w-xl mx-auto my-12 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Estrictamente Reservado</h2>
        <p className="text-sm text-slate-600 mb-6">
          La sección de <strong>Logs de Auditoría y Trazabilidad</strong> es de uso confidencial y exclusivo para el{" "}
          <span className="font-semibold text-red-600">Super Administrador</span>. Ni siquiera el rol Administrador de Planta tiene acceso a estos registros.
          Tu rol activo actual es <span className="font-mono uppercase bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-800">{activeRole}</span>.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition shadow-sm cursor-pointer"
        >
          Volver al Dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Eventos</p>
            <h3 className="text-3xl font-bold mt-1 text-white">{totalEvents}</h3>
            <span className="text-[11px] text-slate-400 mt-1 inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Trazabilidad en vivo
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Alertas Críticas */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Incidentes de Seguridad</p>
            <h3 className="text-3xl font-bold mt-1 text-slate-900">{criticalCount}</h3>
            <span className="text-[11px] text-red-500 font-medium mt-1 block">
              Alertas y bloqueos de intrusión
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Movimientos de Caja */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Auditoría en Caja</p>
            <h3 className="text-3xl font-bold mt-1 text-slate-900">{cashEvents}</h3>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
              Cobros, egresos y notas de venta
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Producción y Hornos */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Producción & Stock</p>
            <h3 className="text-3xl font-bold mt-1 text-slate-900">{productionEvents}</h3>
            <span className="text-[11px] text-orange-600 font-medium mt-1 block">
              Quemas en hornos y patio de secado
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por usuario, descripción, IP o módulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              title="Descargar reporte forense en CSV"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
              title="Restablecer filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer
            </button>
          </div>
        </div>

        {/* Filtros Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Módulo</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="all">Todos los módulos</option>
              <option value="seguridad">Seguridad & Cortafuegos</option>
              <option value="usuarios">Gestión de Usuarios</option>
              <option value="caja">Libro de Caja y Cobros</option>
              <option value="produccion_hornos">Producción & Hornos</option>
              <option value="inventario">Inventario & Patio</option>
              <option value="empleados">Empleados & Nómina</option>
              <option value="ventas">Ventas & Pedidos</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Tipo de Acción</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="all">Todas las acciones</option>
              <option value="CREATE">Creación (CREATE)</option>
              <option value="UPDATE">Modificación (UPDATE)</option>
              <option value="DELETE">Eliminación (DELETE)</option>
              <option value="LOGIN_SUCCESS">Login Exitoso</option>
              <option value="SECURITY_ALERT">Alerta de Seguridad</option>
              <option value="STOCK_ADJUSTMENT">Ajuste de Stock</option>
              <option value="ROLE_CHANGE">Cambio de Rol</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Nivel de Severidad</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="all">Todas las severidades</option>
              <option value="low">Baja (Informativo)</option>
              <option value="medium">Media (Operativo)</option>
              <option value="high">Alta (Relevante)</option>
              <option value="critical">Crítica (Seguridad)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center text-xs">
          <div className="font-bold text-slate-800">
            Registro Cronológico ({filteredLogs.length} eventos encontrados)
          </div>
          <span className="text-slate-500">Orden descendente (más recientes primero)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-3.5 pl-4">Fecha y Hora</th>
                <th className="p-3.5">Usuario</th>
                <th className="p-3.5">Acción</th>
                <th className="p-3.5">Módulo</th>
                <th className="p-3.5">Descripción del Evento</th>
                <th className="p-3.5">Severidad</th>
                <th className="p-3.5">IP</th>
                <th className="p-3.5 pr-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No se encontraron registros de auditoría con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actionMeta = ACTION_LABELS[log.action] || {
                    label: log.action,
                    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                  }
                  const sevMeta = SEVERITY_BADGES[log.severity] || SEVERITY_BADGES.low
                  const SevIcon = sevMeta.icon
                  const ModIcon = MODULE_ICONS[log.module] || FileText
                  const dateObj = new Date(log.timestamp)

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-4 whitespace-nowrap text-slate-600 font-mono">
                        <div className="font-semibold text-slate-800">
                          {dateObj.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {dateObj.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.user_name}</div>
                        <div className="text-[11px] text-slate-500">{log.user_email}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {log.user_role}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md border text-[11px] font-semibold ${actionMeta.badgeClass}`}>
                          {actionMeta.label}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          <ModIcon className="w-3.5 h-3.5 text-slate-500" />
                          {log.module}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-700 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${sevMeta.badgeClass}`}>
                          <SevIcon className="w-3 h-3" />
                          {sevMeta.label}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                        {log.ip_address || "127.0.0.1"}
                      </td>

                      <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                          title="Ver detalles técnicos del log"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer de Detalles Técnicos del Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Detalle Forense del Evento
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Timestamp (UTC):</span>
                  <span className="font-mono text-slate-800 font-semibold">{selectedLog.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Dirección IP:</span>
                  <span className="font-mono text-slate-800 font-semibold">{selectedLog.ip_address || "127.0.0.1"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Usuario / Responsable:</span>
                  <span className="text-slate-800 font-semibold">{selectedLog.user_name} ({selectedLog.user_role})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Módulo:</span>
                  <span className="text-slate-800 font-semibold uppercase">{selectedLog.module}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-600 font-bold block mb-1">Descripción:</span>
                <p className="p-3 bg-slate-100/70 rounded-lg text-slate-800 text-sm">
                  {selectedLog.description}
                </p>
              </div>

              {selectedLog.details && (
                <div>
                  <span className="text-slate-600 font-bold block mb-1">Metadatos & Payload JSON:</span>
                  <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
