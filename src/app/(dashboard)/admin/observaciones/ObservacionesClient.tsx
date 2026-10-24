"use client";

import { useState, useEffect } from "react";
import {
  ObservationsManager,
  SystemObservation,
} from "@/lib/observations-manager";
import {
  Download,
  Search,
  FileText,
  Trash2,
  Eye,
  X,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  MapPin,
  Tag,
  Clock,
  Layers,
  Users,
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
    icon: Tag,
  },
  cambio_datos: {
    label: "Cambio de Datos",
    bg: "bg-amber-50 text-amber-800 border-amber-200",
    icon: FileText,
  },
  duda: {
    label: "Duda / Pregunta",
    bg: "bg-sky-50 text-sky-800 border-sky-200",
    icon: MessageSquare,
  },
  general: {
    label: "General",
    bg: "bg-slate-50 text-slate-800 border-slate-200",
    icon: MessageSquare,
  },
};

export function ObservacionesClient({
  initialObservations,
}: ObservacionesClientProps) {
  const [observations, setObservations] =
    useState<SystemObservation[]>(initialObservations);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modal de detalle
  const [selectedObs, setSelectedObs] = useState<SystemObservation | null>(null);

  // Control de visibilidad del botón de observaciones para el Administrador / Cliente
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

  const handleDelete = (id: string, title: string) => {
    if (confirm(`¿Eliminar la observación: "${title}"?`)) {
      ObservationsManager.delete(id);
      setObservations([...ObservationsManager.getAll()]);
      if (selectedObs?.id === id) setSelectedObs(null);
    }
  };

  // Filtrado simple por texto y categoría
  const filtered = observations.filter((o) => {
    const term = search.toLowerCase();
    const matchesSearch =
      o.title.toLowerCase().includes(term) ||
      o.description.toLowerCase().includes(term) ||
      o.user_name.toLowerCase().includes(term) ||
      o.route.toLowerCase().includes(term) ||
      o.category.toLowerCase().includes(term);

    const matchesCategory =
      categoryFilter === "all" ||
      o.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Métricas de control
  const totalCount = observations.length;
  const uniqueScreensCount = new Set(observations.map((o) => o.route)).size;
  const uniqueUsersCount = new Set(observations.map((o) => o.user_name)).size;
  const lastObservationDate =
    observations.length > 0
      ? new Date(observations[0].created_at).toLocaleDateString("es-BO", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Sin registros";

  // Categorías únicas para el filtro
  const uniqueCategories = Array.from(
    new Set(observations.map((o) => o.category || "General"))
  );

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
                ? "El Administrador (tu cliente) tiene visible el botón flotante [+ Dejar Observación] y puede redactar sus notas."
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
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-6 h-6 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Pantallas con Notas
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {uniqueScreensCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Módulos observados
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Usuarios Participantes
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {uniqueUsersCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Admin y personal
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Último Registro
            </span>
            <span className="text-sm font-bold text-slate-800 mt-1 block truncate max-w-[160px]">
              {lastObservationDate}
            </span>
            <span className="text-[11px] text-slate-400">
              Fecha y hora reciente
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Barra de Herramientas y Exportación */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Búsqueda y Filtro de Categoría */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, texto, pantalla, usuario..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer font-medium text-slate-700"
          >
            <option value="all">Todas las categorías</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Botones de Exportación */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportWord}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover:shadow-md cursor-pointer border border-blue-800"
            title="Descargar reporte completo formateado en documento Microsoft Word (.doc)"
          >
            <FileText className="w-4 h-4 text-blue-200" />
            <span>📄 Exportar a Word (.doc)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer"
            title="Descargar reporte en formato CSV para Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Tabla de Observaciones (Exactamente los campos llenados) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider">
                <th className="p-3.5 pl-5 whitespace-nowrap">Fecha y Hora</th>
                <th className="p-3.5 whitespace-nowrap">Pantalla / Módulo</th>
                <th className="p-3.5 whitespace-nowrap">Tipo de Observación</th>
                <th className="p-3.5">Título</th>
                <th className="p-3.5 min-w-[260px]">Detalle de la Observación</th>
                <th className="p-3.5 whitespace-nowrap">Usuario</th>
                <th className="p-3.5 text-right pr-5 whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <MessageSquare className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-700">
                      No se encontraron observaciones
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Las observaciones que registre tu cliente aparecerán aquí en tiempo real.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((obs) => {
                  const cat =
                    CATEGORY_CONFIG[obs.category.toLowerCase()] || {
                      label: obs.category || "General",
                      bg: "bg-orange-50 text-orange-800 border-orange-200",
                      icon: Tag,
                    };
                  const CatIcon = cat.icon;

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
                      {/* 1. Fecha */}
                      <td className="p-3.5 pl-5 whitespace-nowrap font-mono text-slate-500">
                        {localDate}
                      </td>

                      {/* 2. Pantalla / Módulo */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] border border-slate-200 font-medium">
                          {obs.route}
                        </span>
                      </td>

                      {/* 3. Tipo de Observación */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cat.bg}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span>{cat.label}</span>
                        </span>
                      </td>

                      {/* 4. Título */}
                      <td className="p-3.5 font-bold text-slate-900 max-w-[200px]">
                        <div className="line-clamp-2 leading-snug">
                          {obs.title}
                        </div>
                      </td>

                      {/* 5. Detalle de la Observación */}
                      <td className="p-3.5 max-w-md text-slate-600">
                        <div className="line-clamp-3 leading-relaxed whitespace-pre-wrap text-[11.5px]">
                          {obs.description}
                        </div>
                      </td>

                      {/* 6. Usuario */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {obs.user_name}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          {obs.user_role}
                        </div>
                      </td>

                      {/* 7. Acciones */}
                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedObs(obs)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                            title="Ver observación completa"
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

      {/* Modal de Detalle Completo de la Observación */}
      {selectedObs && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden my-6">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">
                  Observación #{selectedObs.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedObs(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Título de la Observación
                </span>
                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedObs.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <span>
                    Tipo:{" "}
                    <strong className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      {selectedObs.category || "General"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Pantalla: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">{selectedObs.route}</code>
                  </span>
                  <span>•</span>
                  <span>
                    Por: <strong className="text-slate-700">{selectedObs.user_name}</strong> ({selectedObs.user_role})
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Detalle Escrito por el Usuario:
                </span>
                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                  {selectedObs.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedObs(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
