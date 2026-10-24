"use client";

import { useState, useEffect } from "react";
import {
  ObservationsManager,
  SystemObservation,
  ObservationCategory,
  ObservationPriority,
  ObservationStatus,
} from "@/lib/observations-manager";
import {
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  FileText,
  Trash2,
  Filter,
  Eye,
  X,
  Sparkles,
  RefreshCw,
  Send,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

interface ObservacionesClientProps {
  initialObservations: SystemObservation[];
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; bg: string; icon: any }
> = {
  sugerencia: {
    label: "Sugerencia",
    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: Sparkles,
  },
  error: {
    label: "Ajuste / Error",
    bg: "bg-rose-50 text-rose-800 border-rose-200",
    icon: AlertTriangle,
  },
  cambio_datos: {
    label: "Cambio de Datos",
    bg: "bg-amber-50 text-amber-800 border-amber-200",
    icon: FileText,
  },
  duda: {
    label: "Duda / Pregunta",
    bg: "bg-sky-50 text-sky-800 border-sky-200",
    icon: HelpCircle,
  },
  general: {
    label: "General",
    bg: "bg-slate-50 text-slate-800 border-slate-200",
    icon: MessageSquare,
  },
};

const PRIORITY_BADGES: Record<
  ObservationPriority,
  { label: string; bg: string }
> = {
  baja: { label: "Baja", bg: "bg-slate-100 text-slate-700 border-slate-200" },
  media: { label: "Media", bg: "bg-amber-100 text-amber-800 border-amber-200" },
  alta: { label: "Alta", bg: "bg-orange-100 text-orange-800 border-orange-200" },
  urgente: { label: "Urgente", bg: "bg-red-100 text-red-800 border-red-200" },
};

const STATUS_CONFIG: Record<
  ObservationStatus,
  { label: string; bg: string; icon: any }
> = {
  pendiente: {
    label: "Pendiente",
    bg: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
  },
  en_revision: {
    label: "En Revisión",
    bg: "bg-blue-100 text-blue-800 border-blue-200",
    icon: RefreshCw,
  },
  implementado: {
    label: "Implementado",
    bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: CheckCircle2,
  },
  descartado: {
    label: "Descartado",
    bg: "bg-slate-100 text-slate-600 border-slate-200",
    icon: X,
  },
};

export function ObservacionesClient({
  initialObservations,
}: ObservacionesClientProps) {
  const [observations, setObservations] =
    useState<SystemObservation[]>(initialObservations);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Modal de detalle y edición de notas
  const [selectedObs, setSelectedObs] = useState<SystemObservation | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [selectedStatusInput, setSelectedStatusInput] =
    useState<ObservationStatus>("pendiente");

  // Control de visibilidad del botón de observaciones para otros usuarios (Admin / Clientes)
  const [isWidgetActive, setIsWidgetActive] = useState(true);

  useEffect(() => {
    setIsWidgetActive(ObservationsManager.isWidgetEnabledForUsers());
    const onConfig = () => {
      setIsWidgetActive(ObservationsManager.isWidgetEnabledForUsers());
    };
    window.addEventListener("erp_observations_config_changed", onConfig);
    return () =>
      window.removeEventListener("erp_observations_config_changed", onConfig);
  }, []);

  const handleToggleWidget = (newState: boolean) => {
    ObservationsManager.setWidgetEnabledForUsers(newState);
    setIsWidgetActive(newState);
  };

  useEffect(() => {
    const refresh = () => {
      setObservations([...ObservationsManager.getAll()]);
    };
    refresh();
    window.addEventListener("erp_observations_updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("erp_observations_updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const handleExportWord = () => {
    const blob = ObservationsManager.exportToWord();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.setAttribute(
      "download",
      `Reporte_Observaciones_INCEGUA_${dateStr}.doc`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const csvContent = ObservationsManager.exportToCSV();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.setAttribute("download", `Observaciones_Cliente_INCEGUA_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickStatusChange = (
    id: string,
    newStatus: ObservationStatus
  ) => {
    ObservationsManager.updateStatus(id, newStatus);
    setObservations([...ObservationsManager.getAll()]);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`¿Eliminar la observación: "${title}"?`)) {
      ObservationsManager.delete(id);
      setObservations([...ObservationsManager.getAll()]);
      if (selectedObs?.id === id) setSelectedObs(null);
    }
  };

  const openDetailModal = (obs: SystemObservation) => {
    setSelectedObs(obs);
    setAdminNoteInput(obs.admin_notes || "");
    setSelectedStatusInput(obs.status);
  };

  const handleSaveNotes = () => {
    if (!selectedObs) return;
    ObservationsManager.updateStatus(
      selectedObs.id,
      selectedStatusInput,
      adminNoteInput.trim()
    );
    setObservations([...ObservationsManager.getAll()]);
    setSelectedObs({
      ...selectedObs,
      status: selectedStatusInput,
      admin_notes: adminNoteInput.trim(),
    });
  };

  // Filtrado de observaciones
  const filtered = observations.filter((o) => {
    const matchesSearch =
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase()) ||
      o.user_name.toLowerCase().includes(search.toLowerCase()) ||
      o.route.toLowerCase().includes(search.toLowerCase()) ||
      (o.admin_notes || "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || o.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || o.priority === priorityFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  // Métricas
  const totalCount = observations.length;
  const pendingCount = observations.filter((o) => o.status === "pendiente").length;
  const reviewingCount = observations.filter(
    (o) => o.status === "en_revision"
  ).length;
  const resolvedCount = observations.filter(
    (o) => o.status === "implementado"
  ).length;

  return (
    <div className="space-y-6">
      {/* Control Maestro de Visibilidad del Botón de Observaciones */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isWidgetActive
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/20 text-rose-400 border-rose-500/30"
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white">
                Visibilidad para el Administrador / Cliente:
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isWidgetActive
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                    : "bg-rose-500/20 border-rose-400/40 text-rose-300"
                }`}
              >
                {isWidgetActive ? "HABILITADO PARA CLIENTE" : "OCULTO PARA CLIENTE"}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {isWidgetActive
                ? "El Administrador (tu cliente) puede ver el botón flotante [+ Dejar Observación] y abrir el panel para escribir."
                : "El botón está completamente oculto para el Administrador. Solo tú (SuperAdmin) puedes ver y gestionar las observaciones."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end shrink-0">
          <span className="text-xs font-semibold text-slate-300">
            {isWidgetActive ? "Botón Activo" : "Botón Oculto"}
          </span>
          <button
            type="button"
            onClick={() => handleToggleWidget(!isWidgetActive)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isWidgetActive ? "bg-emerald-500" : "bg-slate-700"
            }`}
            title={
              isWidgetActive
                ? "Haz clic para ocultar el botón al Administrador"
                : "Haz clic para volver a mostrar el botón al Administrador"
            }
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isWidgetActive ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tarjetas Métricas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Total Observaciones
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {totalCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Registradas en pruebas
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-6 h-6 text-slate-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
              Pendientes
            </span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {pendingCount}
            </span>
            <span className="text-[11px] text-amber-600/80">
              Por revisar por ti
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
              En Revisión
            </span>
            <span className="text-2xl font-black text-blue-700 mt-1 block">
              {reviewingCount}
            </span>
            <span className="text-[11px] text-blue-600/80">
              En proceso de ajuste
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <RefreshCw className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
              Implementadas
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {resolvedCount}
            </span>
            <span className="text-[11px] text-emerald-600/80">
              Ajustes listos
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Barra de Herramientas y Exportación */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Búsqueda y Filtros */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, texto, usuario..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            <option value="sugerencia">💡 Sugerencias</option>
            <option value="error">⚠️ Errores / Ajustes</option>
            <option value="cambio_datos">🧱 Cambio de Datos</option>
            <option value="duda">❓ Dudas</option>
            <option value="general">📝 Generales</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">🟡 Pendientes</option>
            <option value="en_revision">🔵 En Revisión</option>
            <option value="implementado">🟢 Implementadas</option>
            <option value="descartado">⚪ Descartadas</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="all">Todas las prioridades</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>

        {/* Botones de Exportación */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportWord}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm hover:shadow-md cursor-pointer border border-blue-800"
            title="Descargar reporte completo formateado en documento Microsoft Word (.doc)"
          >
            <FileText className="w-4 h-4 text-blue-200" />
            <span>📄 Exportar a Word (.doc)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer"
            title="Descargar reporte en formato CSV para Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Tabla de Observaciones */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider">
                <th className="p-3.5 pl-5">Fecha</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Título y Observación</th>
                <th className="p-3.5">Pantalla / Ruta</th>
                <th className="p-3.5">Usuario</th>
                <th className="p-3.5">Prioridad</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 text-right pr-5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No se encontraron observaciones.</p>
                    <p className="text-[11px] mt-0.5">
                      Las notas que tu cliente registre aparecerán automáticamente aquí.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((obs) => {
                  const cat =
                    CATEGORY_CONFIG[obs.category.toLowerCase()] || {
                      label: obs.category || "General",
                      bg: "bg-orange-50 text-orange-800 border-orange-200",
                      icon: MessageSquare,
                    };
                  const CatIcon = cat.icon;
                  const prio =
                    PRIORITY_BADGES[obs.priority] || PRIORITY_BADGES.media;
                  const stat =
                    STATUS_CONFIG[obs.status] || STATUS_CONFIG.pendiente;
                  const StatIcon = stat.icon;

                  const localDate = new Date(obs.created_at).toLocaleDateString(
                    "es-BO",
                    {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );

                  return (
                    <tr
                      key={obs.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="p-3.5 pl-5 whitespace-nowrap font-mono text-slate-500">
                        {localDate}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cat.bg}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span>{cat.label}</span>
                        </span>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {obs.title}
                        </div>
                        <div className="text-slate-500 line-clamp-2 mt-0.5 text-[11px]">
                          {obs.description}
                        </div>
                        {obs.admin_notes && (
                          <div className="mt-1 bg-purple-50 text-purple-800 border border-purple-200 rounded px-2 py-0.5 text-[10px] inline-block font-semibold">
                            💬 Nota SuperAdmin: {obs.admin_notes}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {obs.route}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {obs.user_name}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {obs.user_role}
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${prio.bg}`}
                        >
                          {prio.label}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <select
                          value={obs.status}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              obs.id,
                              e.target.value as ObservationStatus
                            )
                          }
                          className={`text-[11px] font-bold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer ${stat.bg}`}
                        >
                          <option value="pendiente">🟡 Pendiente</option>
                          <option value="en_revision">🔵 En Revisión</option>
                          <option value="implementado">🟢 Implementado</option>
                          <option value="descartado">⚪ Descartado</option>
                        </select>
                      </td>

                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openDetailModal(obs)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 border border-slate-200 transition cursor-pointer"
                            title="Ver detalle completo y redactar notas"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(obs.id, obs.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                            title="Eliminar observación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle y Respuesta del SuperAdmin */}
      {selectedObs && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden my-6">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">
                  Detalle de la Observación #{selectedObs.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedObs(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {selectedObs.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                  <span>Registrado por: <strong>{selectedObs.user_name}</strong></span>
                  <span>•</span>
                  <span>Rol: <strong className="capitalize">{selectedObs.user_role}</strong></span>
                  <span>•</span>
                  <span>Ruta: <code className="bg-slate-100 px-1 py-0.5 rounded">{selectedObs.route}</code></span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Comentario / Solicitud del Cliente
                </span>
                <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedObs.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cambiar Estado
                  </label>
                  <select
                    value={selectedStatusInput}
                    onChange={(e) =>
                      setSelectedStatusInput(e.target.value as ObservationStatus)
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="pendiente">🟡 Pendiente de revisar</option>
                    <option value="en_revision">🔵 En proceso de ajuste</option>
                    <option value="implementado">🟢 Implementado / Resuelto</option>
                    <option value="descartado">⚪ Descartado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prioridad Asignada
                  </label>
                  <div className="py-2 text-xs font-bold text-slate-700 uppercase">
                    {selectedObs.priority}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas de Resolución (SuperAdmin)
                </label>
                <textarea
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Escribe aquí los cambios realizados o motivos de resolución para tu control..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedObs.id, selectedObs.title)}
                  className="text-rose-600 hover:text-rose-800 font-semibold text-xs flex items-center space-x-1 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Registro</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedObs(null)}
                    className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition font-semibold"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveNotes();
                      setSelectedObs(null);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-lg font-bold shadow-xs transition"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
