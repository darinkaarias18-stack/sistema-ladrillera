"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { HornoCycle, HornoStatus, BrickType, Employee } from "@/types/database.types";
import { getTodayDateString } from "@/lib/dates";
import React, { useEffect, useState, useMemo } from "react";
import {
  Flame,
  FlameKindling,
  Thermometer,
  Layers,
  User,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Printer,
  X,
  Filter,
  TrendingUp,
  Percent,
  Warehouse,
  ArrowRight,
  ShieldAlert,
  Sparkles
} from "lucide-react";

const HORNO_CONFIGS = [
  { name: "Horno 1", capacity: 30000, type: "Horno de Tiro Invertido / Gas y Biomasa" },
  { name: "Horno 2", capacity: 28000, type: "Horno Tipo Hoffman Continuo" },
];

export default function HornosPage() {
  const [cycles, setCycles] = useState<HornoCycle[]>([]);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filtros
  const [selectedHornoFilter, setSelectedHornoFilter] = useState<string>("todos");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("todos");

  // Modales
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isSalidaModalOpen, setIsSalidaModalOpen] = useState(false);
  const [selectedCycleForSalida, setSelectedCycleForSalida] = useState<HornoCycle | null>(null);
  const [printCycle, setPrintCycle] = useState<HornoCycle | null>(null);

  // Formulario de Ingreso (Enhorne)
  const [ingresoForm, setIngresoForm] = useState({
    horno_number: "Horno 1",
    fecha_ingreso: getTodayDateString(),
    hora_ingreso: "08:00",
    brick_type_id: "",
    cantidad_ingreso: 25000,
    quemador_id: "",
    combustible: "Gas Natural & Aserrín",
    temperatura_estimada: 950,
    notes: "",
  });

  // Formulario de Salida (Deshorne)
  const [salidaForm, setSalidaForm] = useState({
    fecha_salida: getTodayDateString(),
    hora_salida: "16:00",
    cantidad_salida_primera: 0,
    cantidad_salida_segunda: 0,
    cantidad_merma: 0,
    supervisor: "Victor Rodolfo (Maestro Quemador)",
    notes: "",
  });

  const loadData = () => {
    setCycles(store.getHornoCycles());
    const bricks = store.getBrickTypes().filter((b) => b.active);
    setBrickTypes(bricks);
    const emps = store.getEmployees().filter((e) => e.active);
    setEmployees(emps);

    if (bricks.length > 0 && !ingresoForm.brick_type_id) {
      setIngresoForm((prev) => ({ ...prev, brick_type_id: bricks[0].id }));
    }
    const quemador = emps.find((e) => e.position.toLowerCase().includes("quemador") || e.position.toLowerCase().includes("horno"));
    if (quemador && !ingresoForm.quemador_id) {
      setIngresoForm((prev) => ({ ...prev, quemador_id: quemador.id }));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Hornos actuales agrupados por nombre para el panel de bahías
  const hornoStatuses = useMemo(() => {
    return HORNO_CONFIGS.map((config) => {
      // Buscar el ciclo activo (no finalizado) más reciente
      const activeCycle = cycles.find(
        (c) => c.horno_number === config.name && c.status !== "finalizado"
      );
      return {
        config,
        cycle: activeCycle || null,
      };
    });
  }, [cycles]);

  // Métricas generales
  const stats = useMemo(() => {
    const activeCount = hornoStatuses.filter((h) => h.cycle !== null).length;
    const unitsInKilns = hornoStatuses.reduce(
      (sum, h) => sum + (h.cycle ? h.cycle.cantidad_ingreso : 0),
      0
    );

    const completed = cycles.filter((c) => c.status === "finalizado" && c.rendimiento_pct);
    const avgRendimiento =
      completed.length > 0
        ? (completed.reduce((sum, c) => sum + (c.rendimiento_pct || 0), 0) / completed.length).toFixed(1)
        : "94.5";

    return {
      activeCount,
      unitsInKilns,
      avgRendimiento,
      totalCycles: cycles.length,
    };
  }, [hornoStatuses, cycles]);

  // Filtrado de la tabla de ciclos
  const filteredCycles = useMemo(() => {
    return cycles.filter((c) => {
      if (selectedHornoFilter !== "todos" && c.horno_number !== selectedHornoFilter) return false;
      if (selectedStatusFilter !== "todos" && c.status !== selectedStatusFilter) return false;
      return true;
    });
  }, [cycles, selectedHornoFilter, selectedStatusFilter]);

  // Manejar apertura de Ingreso con horno preseleccionado
  const handleOpenIngreso = (hornoName?: string) => {
    setIngresoForm((prev) => ({
      ...prev,
      horno_number: hornoName || "Horno 1",
      fecha_ingreso: getTodayDateString(),
      hora_ingreso: new Date().toTimeString().substring(0, 5),
    }));
    setIsIngresoModalOpen(true);
  };

  // Guardar Ingreso a Horno
  const handleSaveIngreso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingresoForm.brick_type_id || !ingresoForm.quemador_id || ingresoForm.cantidad_ingreso <= 0) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    store.addHornoIngreso({
      horno_number: ingresoForm.horno_number,
      fecha_ingreso: ingresoForm.fecha_ingreso,
      hora_ingreso: ingresoForm.hora_ingreso,
      brick_type_id: ingresoForm.brick_type_id,
      cantidad_ingreso: Number(ingresoForm.cantidad_ingreso),
      quemador_id: ingresoForm.quemador_id,
      combustible: ingresoForm.combustible,
      temperatura_estimada: Number(ingresoForm.temperatura_estimada) || 950,
      status: "en_quema",
      notes: ingresoForm.notes,
    });

    setIsIngresoModalOpen(false);
    loadData();
  };

  // Preparar Modal de Salida (Deshorne)
  const handleOpenSalida = (cycle: HornoCycle) => {
    setSelectedCycleForSalida(cycle);
    // Sugerir cantidades preliminares (94% primera, 4% segunda, 2% merma)
    const estimPrimera = Math.round(cycle.cantidad_ingreso * 0.94);
    const estimSegunda = Math.round(cycle.cantidad_ingreso * 0.04);
    const estimMerma = cycle.cantidad_ingreso - estimPrimera - estimSegunda;

    setSalidaForm({
      fecha_salida: getTodayDateString(),
      hora_salida: new Date().toTimeString().substring(0, 5),
      cantidad_salida_primera: estimPrimera,
      cantidad_salida_segunda: estimSegunda,
      cantidad_merma: estimMerma,
      supervisor: cycle.supervisor || "Victor Rodolfo (Maestro Quemador)",
      notes: "",
    });
    setIsSalidaModalOpen(true);
  };

  // Guardar Salida (Deshorne)
  const handleSaveSalida = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycleForSalida) return;

    store.updateHornoSalida(selectedCycleForSalida.id, {
      fecha_salida: salidaForm.fecha_salida,
      hora_salida: salidaForm.hora_salida,
      cantidad_salida_primera: Number(salidaForm.cantidad_salida_primera),
      cantidad_salida_segunda: Number(salidaForm.cantidad_salida_segunda),
      cantidad_merma: Number(salidaForm.cantidad_merma),
      supervisor: salidaForm.supervisor,
      notes: salidaForm.notes,
    });

    setIsSalidaModalOpen(false);
    setSelectedCycleForSalida(null);
    loadData();
  };

  // Cambiar estado intermedio del horno (ej. de Quema a Enfriando)
  const handleToggleStatus = (cycleId: string, nextStatus: HornoStatus) => {
    store.updateHornoStatus(cycleId, nextStatus);
    loadData();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
      <Header title="Producción • Ingreso y Salida de Hornos" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Banner Superior con Acciones Principales y Métricas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <FlameKindling className="w-64 h-64" />
          </div>

          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-200" />
              <span>Gestión Térmica & Control de Cocción</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Ingreso & Salida de Hornos (Quema y Deshorne)
            </h1>
            <p className="text-amber-100 text-sm max-w-2xl">
              Monitorea en tiempo real el ciclo de enhorne (carga de ladrillo verde), proceso de quema, curvas de temperatura, enfriamiento y deshorne con clasificación de primera, segunda y merma.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenIngreso()}
              className="inline-flex items-center space-x-2 bg-white text-orange-700 hover:bg-orange-50 font-bold px-5 py-2.5 rounded-xl shadow-md transition-all transform active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Registrar Ingreso (Enhorne)</span>
            </button>
          </div>
        </div>

        {/* 4 Métricas Clave */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hornos en Actividad</p>
              <h3 className="text-2xl font-black text-slate-800">
                {stats.activeCount} <span className="text-sm font-normal text-slate-400">/ 2 Hornos</span>
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ladrillos en Fuego / Horno</p>
              <h3 className="text-2xl font-black text-slate-800">
                {stats.unitsInKilns.toLocaleString()} <span className="text-xs font-normal text-slate-400">unid</span>
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rendimiento Promedio (1ra)</p>
              <h3 className="text-2xl font-black text-emerald-700">
                {stats.avgRendimiento}% <span className="text-xs font-normal text-slate-400">calidad</span>
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ciclos Registrados</p>
              <h3 className="text-2xl font-black text-slate-800">
                {stats.totalCycles} <span className="text-xs font-normal text-slate-400">quemadas</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Panel de Estado Visual de las Bahías de Hornos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-orange-600" />
                <span>Estado Actual de Hornos en Planta</span>
              </h2>
              <p className="text-xs text-slate-500">
                Supervisa el estado térmico y operativo de cada nave de combustión.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hornoStatuses.map(({ config, cycle }) => {
              const isOccupied = cycle !== null;
              const brick = cycle ? brickTypes.find((b) => b.id === cycle.brick_type_id) : null;
              const quemador = cycle ? employees.find((e) => e.id === cycle.quemador_id) : null;
              const capacityPct = cycle
                ? Math.min(100, Math.round((cycle.cantidad_ingreso / config.capacity) * 100))
                : 0;

              return (
                <div
                  key={config.name}
                  className={`rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                    isOccupied
                      ? cycle.status === "en_quema"
                        ? "bg-gradient-to-b from-orange-50/80 to-white border-orange-300 shadow-md ring-1 ring-orange-200"
                        : "bg-gradient-to-b from-blue-50/60 to-white border-blue-200 shadow-sm"
                      : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
                  }`}
                >
                  {/* Top Bar de la tarjeta */}
                  <div className="p-5 pb-3 border-b border-slate-100 flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-slate-800">{config.name}</h3>
                        {isOccupied ? (
                          cycle.status === "en_quema" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-600 text-white animate-pulse">
                              <Flame className="w-3 h-3 mr-1" /> En Quema ({cycle.temperatura_estimada}°C)
                            </span>
                          ) : cycle.status === "enfriando" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-600 text-white">
                              <Clock className="w-3 h-3 mr-1" /> Enfriamiento ({cycle.temperatura_estimada}°C)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                              <Warehouse className="w-3 h-3 mr-1" /> En Deshorne
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Disponible / Frío
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{config.type}</p>
                    </div>

                    {isOccupied && (
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        {cycle.folio}
                      </span>
                    )}
                  </div>

                  {/* Cuerpo de la tarjeta */}
                  <div className="p-5 space-y-4 flex-1">
                    {isOccupied ? (
                      <>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold text-slate-600">
                            <span>Ocupación de Horno</span>
                            <span className="font-bold text-slate-800">
                              {cycle.cantidad_ingreso.toLocaleString()} / {config.capacity.toLocaleString()} unid ({capacityPct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                cycle.status === "en_quema" ? "bg-orange-500" : "bg-cyan-500"
                              }`}
                              style={{ width: `${capacityPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-white/80 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Tipo de Ladrillo:</span>
                            <span className="font-bold text-slate-800 text-right">{brick?.name || "Ladrillo Estándar"}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Fecha de Ingreso:</span>
                            <span className="font-semibold text-slate-700">{cycle.fecha_ingreso} a las {cycle.hora_ingreso}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Maestro Quemador:</span>
                            <span className="font-bold text-slate-800">{quemador?.full_name || "Victor Rodolfo"}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Combustible:</span>
                            <span className="text-slate-700">{cycle.combustible || "Gas Natural"}</span>
                          </div>
                        </div>

                        {cycle.notes && (
                          <p className="text-xs text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100/60">
                            "{cycle.notes}"
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center py-6 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">Horno Libre & Limpio</p>
                        <p className="text-xs text-slate-400 max-w-[200px]">
                          Capacidad total de {config.capacity.toLocaleString()} ladrillos lista para nueva carga de secadero.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones de la tarjeta */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isOccupied ? (
                      <>
                        {cycle.status === "en_quema" ? (
                          <button
                            onClick={() => handleToggleStatus(cycle.id, "enfriando")}
                            className="flex-1 inline-flex items-center justify-center space-x-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-xs transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pasar a Enfriamiento</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenSalida(cycle)}
                            className="flex-1 inline-flex items-center justify-center space-x-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-sm transition-all"
                          >
                            <Warehouse className="w-3.5 h-3.5" />
                            <span>Registrar Salida (Deshorne)</span>
                          </button>
                        )}
                        <button
                          onClick={() => setPrintCycle(cycle)}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
                          title="Imprimir Boleta de Horno"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleOpenIngreso(config.name)}
                        className="w-full inline-flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-sm transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cargar este Horno (Enhorne)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historial Completo de Quemadas y Deshornes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FlameKindling className="w-5 h-5 text-orange-600" />
                <span>Historial de Ciclos de Quema y Deshorne</span>
              </h3>
              <p className="text-xs text-slate-500">
                Registro histórico con auditoría de rendimientos, descarte y clasificación de primera/segunda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-slate-500">Horno:</label>
                <select
                  value={selectedHornoFilter}
                  onChange={(e) => setSelectedHornoFilter(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                >
                  <option value="todos">Todos los Hornos</option>
                  <option value="Horno 1">Horno 1</option>
                  <option value="Horno 2">Horno 2</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-slate-500">Estado:</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="en_quema">En Quema</option>
                  <option value="enfriando">Enfriando</option>
                  <option value="finalizado">Finalizados / Deshornados</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <th className="py-3 px-4">Folio / Horno</th>
                  <th className="py-3 px-4">Fecha Ingreso / Salida</th>
                  <th className="py-3 px-4">Tipo Ladrillo</th>
                  <th className="py-3 px-4 text-right">Ingreso</th>
                  <th className="py-3 px-4 text-right">1ra Selección</th>
                  <th className="py-3 px-4 text-right">2da / Merma</th>
                  <th className="py-3 px-4 text-center">Rendimiento</th>
                  <th className="py-3 px-4">Responsable</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCycles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No se encontraron registros de hornos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredCycles.map((c) => {
                    const brick = brickTypes.find((b) => b.id === c.brick_type_id);
                    const quemador = employees.find((e) => e.id === c.quemador_id);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-800">{c.folio}</span>
                          <span className="block font-bold text-orange-700 text-[11px]">{c.horno_number}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <div><span className="text-slate-400 text-[10px]">IN:</span> {c.fecha_ingreso} ({c.hora_ingreso})</div>
                          {c.fecha_salida ? (
                            <div><span className="text-slate-400 text-[10px]">OUT:</span> {c.fecha_salida} ({c.hora_salida})</div>
                          ) : (
                            <span className="text-slate-400 italic">En proceso de cocción</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {brick?.name || "Ladrillo"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">
                          {c.cantidad_ingreso.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                          {c.cantidad_salida_primera ? c.cantidad_salida_primera.toLocaleString() : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {c.cantidad_salida_segunda || c.cantidad_merma ? (
                            <div>
                              <span className="text-amber-700">{c.cantidad_salida_segunda?.toLocaleString() || 0} 2da</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span className="text-rose-600 font-semibold">{c.cantidad_merma?.toLocaleString() || 0} merma</span>
                            </div>
                          ) : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {c.rendimiento_pct ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-emerald-800 bg-emerald-100 text-[10px]">
                              {c.rendimiento_pct}% 1ra
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">En quema</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <p className="font-semibold">{quemador?.full_name || "Victor Rodolfo"}</p>
                          <span className="text-[10px] text-slate-400">{c.combustible || "Gas"}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {c.status === "en_quema" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                              <Flame className="w-3 h-3 mr-0.5" /> En Quema
                            </span>
                          ) : c.status === "enfriando" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                              <Clock className="w-3 h-3 mr-0.5" /> Enfriando
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              <CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-600" /> Finalizado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: REGISTRAR INGRESO (ENHORNE) */}
      {isIngresoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-amber-200" />
                <h3 className="font-extrabold text-base">Registrar Ingreso a Horno (Enhorne)</h3>
              </div>
              <button
                onClick={() => setIsIngresoModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIngreso} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Horno Destino *</label>
                  <select
                    value={ingresoForm.horno_number}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, horno_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-800"
                  >
                    <option value="Horno 1">Horno 1 (30,000 max)</option>
                    <option value="Horno 2">Horno 2 (28,000 max)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Ladrillo *</label>
                  <select
                    value={ingresoForm.brick_type_id}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, brick_type_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800"
                  >
                    {brickTypes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de Ingreso *</label>
                  <input
                    type="date"
                    value={ingresoForm.fecha_ingreso}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, fecha_ingreso: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hora de Ingreso *</label>
                  <input
                    type="time"
                    value={ingresoForm.hora_ingreso}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, hora_ingreso: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cantidad a Enhornar (Unidades) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={ingresoForm.cantidad_ingreso}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, cantidad_ingreso: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold font-mono text-sm text-orange-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Se descontará de 'Patio de Secado'</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Temperatura Objetivo (°C)</label>
                  <input
                    type="number"
                    value={ingresoForm.temperatura_estimada}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, temperatura_estimada: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Maestro Quemador / Responsable *</label>
                  <select
                    value={ingresoForm.quemador_id}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, quemador_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Combustible / Insumo</label>
                  <input
                    type="text"
                    value={ingresoForm.combustible}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, combustible: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                    placeholder="Gas natural, aserrín, leña..."
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones de Enhorne</label>
                <textarea
                  rows={2}
                  value={ingresoForm.notes}
                  onChange={(e) => setIngresoForm({ ...ingresoForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                  placeholder="Detalles de apilado, cuadrilla de apoyo, etc."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsIngresoModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-md"
                >
                  Confirmar Enhorne
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR SALIDA / DESHORNE (CONTROL DE CALIDAD) */}
      {isSalidaModalOpen && selectedCycleForSalida && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Warehouse className="w-5 h-5 text-amber-200" />
                <h3 className="font-extrabold text-base">
                  Salida de Horno & Control de Calidad ({selectedCycleForSalida.folio})
                </h3>
              </div>
              <button
                onClick={() => setIsSalidaModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSalida} className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-amber-900">{selectedCycleForSalida.horno_number}</p>
                  <p className="text-amber-800 text-[11px]">
                    Ingreso original: <span className="font-bold font-mono">{selectedCycleForSalida.cantidad_ingreso.toLocaleString()}</span> ladrillos
                  </p>
                </div>
                <div className="text-right font-mono text-[11px] text-amber-800">
                  <span>Fecha: {selectedCycleForSalida.fecha_ingreso}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de Salida *</label>
                  <input
                    type="date"
                    value={salidaForm.fecha_salida}
                    onChange={(e) => setSalidaForm({ ...salidaForm, fecha_salida: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hora de Salida *</label>
                  <input
                    type="time"
                    value={salidaForm.hora_salida}
                    onChange={(e) => setSalidaForm({ ...salidaForm, hora_salida: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold"
                  />
                </div>
              </div>

              {/* Clasificación de Calidad */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Percent className="w-4 h-4 text-orange-600" />
                  <span>Clasificación de Lote Deshornado</span>
                </h4>

                <div>
                  <label className="font-bold text-emerald-800 block mb-1">
                    Ladrillos de 1ra Calidad (Venta Principal) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={salidaForm.cantidad_salida_primera}
                    onChange={(e) => setSalidaForm({ ...salidaForm, cantidad_salida_primera: Number(e.target.value) })}
                    className="w-full bg-white border border-emerald-300 rounded-lg p-2 font-mono font-bold text-sm text-emerald-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-amber-800 block mb-1">
                      2da Calidad (Con detalles)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={salidaForm.cantidad_salida_segunda}
                      onChange={(e) => setSalidaForm({ ...salidaForm, cantidad_salida_segunda: Number(e.target.value) })}
                      className="w-full bg-white border border-amber-300 rounded-lg p-2 font-mono font-bold text-amber-700"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-rose-800 block mb-1">
                      Merma / Rotos / Descarte
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={salidaForm.cantidad_merma}
                      onChange={(e) => setSalidaForm({ ...salidaForm, cantidad_merma: Number(e.target.value) })}
                      className="w-full bg-white border border-rose-300 rounded-lg p-2 font-mono font-bold text-rose-700"
                    />
                  </div>
                </div>

                {/* Resumen dinámico de Rendimiento */}
                {(() => {
                  const total =
                    salidaForm.cantidad_salida_primera +
                    salidaForm.cantidad_salida_segunda +
                    salidaForm.cantidad_merma;
                  const rend = selectedCycleForSalida.cantidad_ingreso > 0
                    ? ((salidaForm.cantidad_salida_primera / selectedCycleForSalida.cantidad_ingreso) * 100).toFixed(1)
                    : "0";
                  const mermaPct = selectedCycleForSalida.cantidad_ingreso > 0
                    ? ((salidaForm.cantidad_merma / selectedCycleForSalida.cantidad_ingreso) * 100).toFixed(1)
                    : "0";

                  return (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600">Total contabilizado: {total.toLocaleString()} unid</span>
                      <div className="space-x-2">
                        <span className="text-emerald-700">{rend}% Rend. 1ra</span>
                        <span className="text-rose-600">{mermaPct}% Merma</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Supervisor que Recibe en Bodega/Patio</label>
                <input
                  type="text"
                  value={salidaForm.supervisor}
                  onChange={(e) => setSalidaForm({ ...salidaForm, supervisor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones Finales de Cocción</label>
                <textarea
                  rows={2}
                  value={salidaForm.notes}
                  onChange={(e) => setSalidaForm({ ...salidaForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                  placeholder="Uniformidad de color, nivel de dureza sonora, etc."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSalidaModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md"
                >
                  Registrar Salida a Bodega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FICHA DE IMPRESIÓN OFICIAL DE QUEMA */}
      {printCycle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-300 relative space-y-6">
            <button
              onClick={() => setPrintCycle(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-slate-900">INCEGUA S.R.L.</h2>
                <p className="text-xs text-slate-500">PLANTA INDUSTRIAL DE PRODUCCIÓN DE CERÁMICA ROJA</p>
                <p className="text-xs font-semibold text-orange-700 mt-1">
                  BOLETA OFICIAL DE CONTROL DE QUEMA Y DESHORNE
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded border border-slate-300">
                  FOLIO: {printCycle.folio}
                </span>
                <p className="text-xs text-slate-500 mt-1 font-bold">{printCycle.horno_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p><span className="font-bold text-slate-600">Fecha de Ingreso:</span> {printCycle.fecha_ingreso} ({printCycle.hora_ingreso})</p>
                <p><span className="font-bold text-slate-600">Tipo de Producto:</span> {printCycle.brick_type?.name || "Ladrillo"}</p>
                <p><span className="font-bold text-slate-600">Cantidad Cargada:</span> {printCycle.cantidad_ingreso.toLocaleString()} unidades</p>
                <p><span className="font-bold text-slate-600">Combustible:</span> {printCycle.combustible || "Gas Natural"}</p>
              </div>
              <div className="space-y-1">
                <p><span className="font-bold text-slate-600">Fecha de Salida:</span> {printCycle.fecha_salida || "En proceso"}</p>
                <p><span className="font-bold text-slate-600">Ladrillos 1ra:</span> {printCycle.cantidad_salida_primera?.toLocaleString() || "Pendiente"} unid</p>
                <p><span className="font-bold text-slate-600">Ladrillos 2da / Merma:</span> {printCycle.cantidad_salida_segunda || 0} / {printCycle.cantidad_merma || 0}</p>
                <p><span className="font-bold text-slate-600">Rendimiento Calidad:</span> {printCycle.rendimiento_pct || "---"}%</p>
              </div>
            </div>

            <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-800">{printCycle.quemador?.full_name || "Victor Rodolfo"}</p>
                <p className="text-slate-400 text-[10px]">Maestro Quemador / Horno</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-800">{printCycle.supervisor || "Darinka Arias"}</p>
                <p className="text-slate-400 text-[10px]">Supervisor de Producción</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-orange-600 text-white font-bold rounded-lg flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Boleta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
