"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { BrickType, InventoryMovement, InventoryLocation, MovementType, ProductionBatch, Sale } from "@/types/database.types";
import { useEffect, useState, useMemo } from "react";
import {
  Boxes,
  ArrowRightLeft,
  Calendar,
  Filter,
  Printer,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  PackageCheck,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from "lucide-react";

interface DailyBrickKardex {
  date: string;
  brickTypeId: string;
  brickName: string;
  dimensions: string;
  stockInicial: number;
  produccionVerde: number;
  produccionTerminada: number;
  salidasDia: number;
  entradasDia: number;
  stockFinal: number;
  stockEnProceso: number;
  foliosVaciado: string[];
}

import { getTodayDateString } from "@/lib/dates";

export default function InventarioPage() {
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtros
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedBrickId, setSelectedBrickId] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"diario" | "historico">("diario");

  // Formulario Movimiento Manual
  const [formBrickId, setFormBrickId] = useState<string>("");
  const [movementType, setMovementType] = useState<MovementType>("salida");
  const [quantity, setQuantity] = useState<number>(500);
  const [fromLoc, setFromLoc] = useState<InventoryLocation>("bodega_terminado");
  const [toLoc, setToLoc] = useState<InventoryLocation>("bodega_terminado");
  const [notes, setNotes] = useState<string>("Salida por merma / rotura");

  const loadData = () => {
    const bts = store.getBrickTypes();
    setBrickTypes(bts);
    setBatches(store.getProductionBatches());
    setMovements(store.getInventoryMovements());
    setSales(store.getSales());
    if (bts.length > 0 && !formBrickId) {
      setFormBrickId(bts[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("erp_brick_types_updated", handleUpdate);
    window.addEventListener("erp_batches_updated", handleUpdate);
    return () => {
      window.removeEventListener("erp_brick_types_updated", handleUpdate);
      window.removeEventListener("erp_batches_updated", handleUpdate);
    };
  }, []);

  // 1. Obtener todas las fechas con actividad registrada (Vaciados, Ventas o Movimientos) + Hoy
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    const todayStr = getTodayDateString();
    datesSet.add(todayStr);

    batches.forEach((b) => {
      if (b.production_date) datesSet.add(b.production_date);
    });

    sales.forEach((s) => {
      if (s.created_at) {
        const d = s.created_at.split("T")[0];
        datesSet.add(d);
      }
    });

    movements.forEach((m) => {
      if (m.created_at) {
        const d = m.created_at.split("T")[0];
        datesSet.add(d);
      }
    });

    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [batches, sales, movements]);

  // 2. Calcular Kardex Histórico día a día para cada ladrillo
  const kardexHistory = useMemo(() => {
    if (brickTypes.length === 0) return [];

    // Ordenar fechas en orden cronológico ascendente (pasado -> futuro)
    const sortedDatesAsc = [...availableDates].sort((a, b) => a.localeCompare(b));

    const runningStock: Record<string, number> = {};
    const runningProceso: Record<string, number> = {};
    brickTypes.forEach((bt) => {
      runningStock[bt.id] = 0;
      runningProceso[bt.id] = 0;
    });

    const result: DailyBrickKardex[] = [];

    // Iterar día por día y actualizar el stock
    sortedDatesAsc.forEach((dateStr) => {
      brickTypes.forEach((bt) => {
        const stockInicial = runningStock[bt.id];
        const procesoInicial = runningProceso[bt.id];

        // Sumar producción del día (Vaciados)
        const dayBatches = batches.filter(
          (b) => b.brick_type_id === bt.id && b.production_date === dateStr
        );
        
        const produccionDiaria = dayBatches.reduce((acc, b) => acc + (b.quantity_produced || 0), 0);
          
        const produccionTerminada = dayBatches
          .filter(b => b.status === "terminado")
          .reduce((acc, b) => acc + (b.quantity_produced || 0), 0);

        const produccionVerde = produccionDiaria - produccionTerminada;

        const foliosVaciado = dayBatches
          .map((b) => b.folio_number)
          .filter((f): f is string => Boolean(f));

        // Sumar ventas del día
        let salidasVenta = 0;
        sales.forEach((s) => {
          const sDate = s.created_at ? s.created_at.split("T")[0] : "";
          if (sDate === dateStr && s.items) {
            s.items.forEach((item) => {
              if (item.brick_type_id === bt.id) {
                salidasVenta += item.quantity;
              }
            });
          }
        });

        // Sumar movimientos manuales del día (Opcional, pero util para ajustes)
        let entradasManual = 0;
        let salidasManual = 0;
        movements.forEach((m) => {
          const mDate = m.created_at ? m.created_at.split("T")[0] : "";
          if (mDate === dateStr && m.brick_type_id === bt.id) {
            if (m.movement_type === "entrada") entradasManual += m.quantity;
            if (m.movement_type === "salida") salidasManual += m.quantity;
          }
        });

        const salidasDia = salidasVenta + salidasManual;

        // Stock En Proceso (se suma verde, se resta terminada asumiendo conversión)
        const stockEnProceso = procesoInicial + produccionVerde - produccionTerminada;

        // Stock Final acumulado puramente de la producción (sin restar salidas para el arrastre)
        const stockFinalProduccion = stockInicial + produccionDiaria;

        // Actualizar el stock corriente para la siguiente fecha SOLO con producción
        runningStock[bt.id] = stockFinalProduccion;
        runningProceso[bt.id] = stockEnProceso < 0 ? 0 : stockEnProceso;

        // El Stock Final del día sí refleja la resta de las salidas
        const stockFinalDia = stockFinalProduccion - salidasDia;

        result.push({
          date: dateStr,
          brickTypeId: bt.id,
          brickName: bt.name,
          dimensions: bt.dimensions || "N/A",
          stockInicial,
          produccionVerde,
          produccionTerminada,
          salidasDia,
          entradasDia: entradasManual,
          stockFinal: stockFinalDia,
          stockEnProceso: runningProceso[bt.id],
          foliosVaciado
        });
      });
    });

    // Retornar ordenado descendente por fecha para vista reciente
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [brickTypes, availableDates, batches]);

  // 3. Kardex filtrado para la fecha seleccionada
  const dailyReportForSelectedDate = useMemo(() => {
    let list = kardexHistory.filter((k) => k.date === selectedDate);
    if (selectedBrickId !== "todos") {
      list = list.filter((k) => k.brickTypeId === selectedBrickId);
    }
    return list;
  }, [kardexHistory, selectedDate, selectedBrickId]);

  // 4. Kardex histórico filtrado para la pestaña de histórico
  const filteredKardexHistory = useMemo(() => {
    let list = kardexHistory;
    if (selectedBrickId !== "todos") {
      list = list.filter((k) => k.brickTypeId === selectedBrickId);
    }
    return list;
  }, [kardexHistory, selectedBrickId]);

  // Totales de la fecha seleccionada
  const totalsSelectedDate = useMemo(() => {
    const items = kardexHistory.filter((k) => k.date === selectedDate);
    const totalProduccionVerde = items.reduce((acc, k) => acc + k.produccionVerde, 0);
    const totalProduccionTerminada = items.reduce((acc, k) => acc + k.produccionTerminada, 0);
    const totalSalidas = items.reduce((acc, k) => acc + k.salidasDia, 0);
    const totalStockFinal = items.reduce((acc, k) => acc + k.stockFinal, 0);
    const totalStockInicial = items.reduce((acc, k) => acc + k.stockInicial, 0);
    const totalEnProceso = items.reduce((acc, k) => acc + k.stockEnProceso, 0);

    return {
      totalProduccionVerde,
      totalProduccionTerminada,
      totalSalidas,
      totalStockFinal,
      totalStockInicial,
      totalEnProceso,
      variacionNeta: totalProduccionTerminada - totalSalidas
    };
  }, [kardexHistory, selectedDate]);

  const handleCreateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBrickId || quantity <= 0) return;

    store.addInventoryMovement({
      brick_type_id: formBrickId,
      movement_type: movementType,
      quantity,
      from_location: movementType === "entrada" ? null : fromLoc,
      to_location: movementType === "salida" ? null : toLoc,
    });

    setIsModalOpen(false);
    loadData();
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <>
      <Header title="Control Kardex de Inventario & Producción por Fechas" />

      <div className="p-6 space-y-6">
        {/* Banner de Introducción & Acciones */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="z-10 space-y-1 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/30">
              <PackageCheck className="w-4 h-4" />
              <span>Balance Diario Actualizado</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Registro Kardex de Producción e Inventario
            </h2>
            <p className="text-xs text-slate-300">
              Consulte el <strong>stock que había antes de cada fecha</strong>, la <strong>producción vaciada ese día</strong> y el <strong>inventario final con el stock actualizado</strong>.
            </p>
          </div>

          <div className="z-10 flex items-center space-x-3">
            <button
              onClick={handlePrintReport}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-700 transition"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>Imprimir Kardex</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-orange-950/50 transition"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Ajuste / Salida Manual</span>
            </button>
          </div>
        </div>

        {/* Tarjetas KPI de Resumen para la Fecha Seleccionada */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Stock Anterior</span>
              <History className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {totalsSelectedDate.totalStockInicial.toLocaleString()} <span className="text-xs font-normal text-slate-400">unid.</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Stock hasta {(() => {
                const [year, month, day] = selectedDate.split('-').map(Number);
                const d = new Date(year, month - 1, day);
                d.setDate(d.getDate() - 1);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dy = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${dy}`;
              })()}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-xs bg-blue-50/20">
            <div className="flex items-center justify-between text-blue-700 text-xs font-bold mb-1">
              <span>Producción Diaria ({selectedDate})</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-900 font-mono">
              +{(totalsSelectedDate.totalProduccionVerde + totalsSelectedDate.totalProduccionTerminada).toLocaleString()} <span className="text-xs font-normal text-blue-700">unid.</span>
            </div>
            <p className="text-[11px] text-blue-600 mt-1">Producción total registrada en el día</p>
          </div>

          <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-xs bg-rose-50/20">
            <div className="flex items-center justify-between text-rose-700 text-xs font-bold mb-1">
              <span>Vendido / Salidas (-)</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-900 font-mono">
              -{totalsSelectedDate.totalSalidas.toLocaleString()} <span className="text-xs font-normal text-rose-700">unid.</span>
            </div>
            <p className="text-[11px] text-rose-600 mt-1">Ventas y mermas en {selectedDate}</p>
          </div>

          <div className="bg-white rounded-xl border border-orange-300 p-4 shadow-md bg-orange-50/40">
            <div className="flex items-center justify-between text-orange-800 text-xs font-extrabold mb-1">
              <span>Stock Actual ({selectedDate})</span>
              <Boxes className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-black text-orange-950 font-mono">
              {totalsSelectedDate.totalStockFinal.toLocaleString()} <span className="text-xs font-normal text-orange-800">unid.</span>
            </div>
            <p className="text-[11px] text-orange-700 font-medium mt-1">Inventario actualizado con cierre del día</p>
          </div>
        </div>

        {/* Bar de Filtros & Selector de Fecha y Ladrillo */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Fecha */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-slate-700">Fecha Kardex:</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 font-bold rounded-md px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d === "2026-09-03" ? `Hoy (${d})` : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Tipo de Ladrillo */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-700">Producto:</span>
              <select
                value={selectedBrickId}
                onChange={(e) => setSelectedBrickId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 font-semibold rounded-md px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="todos">🧱 Todos los productos (17 Tipos)</option>
                {brickTypes.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {bt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle de Pestañas / Modo de Vista */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode("diario")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition ${
                viewMode === "diario"
                  ? "bg-white text-orange-600 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Resumen Diario ({selectedDate})</span>
            </button>
            <button
              onClick={() => setViewMode("historico")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition ${
                viewMode === "historico"
                  ? "bg-white text-orange-600 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico Día a Día</span>
            </button>
          </div>
        </div>

        {/* MODO 1: TABLA RESUMEN DIARIO POR PRODUCTO PARA LA FECHA SELECCIONADA */}
        {viewMode === "diario" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
                  <span>Balance del Inventario al Cierre de {selectedDate}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualización de Stock Inicial, Producción Registrada y Stock Final por Tipo de Ladrillo.
                </p>
              </div>

              <span className="text-xs font-bold bg-orange-100 text-orange-800 px-3 py-1 rounded-full border border-orange-200">
                {dailyReportForSelectedDate.length} Productos En Lista
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="p-3.5">N° / Tipo de Ladrillo</th>
                    <th className="p-3.5 text-center">Dimensiones</th>
                    <th className="p-3.5 text-right bg-slate-200/50 text-slate-800">
                      Stock Inicial <br />
                      <span className="text-[10px] font-normal text-slate-500">(Bodega Terminado)</span>
                    </th>
                    <th className="p-3.5 text-right bg-blue-50 text-blue-900">
                      En Proceso (Verde) <br />
                      <span className="text-[10px] font-normal text-blue-700">(Recién Moldeado)</span>
                    </th>
                    <th className="p-3.5 text-right bg-emerald-50 text-emerald-900">
                      Terminado (+) <br />
                      <span className="text-[10px] font-normal text-emerald-700">(Pasa a Bodega)</span>
                    </th>
                    <th className="p-3.5 text-right bg-rose-50 text-rose-900">
                      Salidas / Ventas (-) <br />
                      <span className="text-[10px] font-normal text-rose-700">(Mermas/Venta)</span>
                    </th>
                    <th className="p-3.5 text-right bg-orange-100/60 text-orange-950">
                      Stock Final (=) <br />
                      <span className="text-[10px] font-extrabold text-orange-800">(Disponible Venta)</span>
                    </th>
                    <th className="p-3.5 text-center">Folios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyReportForSelectedDate.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No hay registros de producciones o movimientos para la fecha seleccionada.
                      </td>
                    </tr>
                  ) : (
                    dailyReportForSelectedDate.map((item, idx) => (
                      <tr key={item.brickTypeId} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <div className="flex items-center space-x-3">
                            <span className="text-slate-400 font-mono text-[11px] font-bold w-5">{idx + 1}.</span>
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm">{item.brickName}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-center text-slate-500 font-mono font-medium">
                          {item.dimensions}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-slate-700 bg-slate-50/50">
                          {item.stockInicial.toLocaleString()} <span className="text-[10px] text-slate-400">unid.</span>
                        </td>

                        <td className="p-3.5 text-right font-mono font-extrabold bg-blue-50/30 text-blue-800">
                          {item.produccionVerde > 0 ? (
                            <span className="inline-flex items-center space-x-1 text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>+{item.produccionVerde.toLocaleString()}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right font-mono font-extrabold bg-emerald-50/30 text-emerald-800">
                          {item.produccionTerminada > 0 ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>+{item.produccionTerminada.toLocaleString()}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right font-mono font-extrabold bg-rose-50/30 text-rose-800">
                          {item.salidasDia > 0 ? (
                            <span className="inline-flex items-center space-x-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-md">
                              <ArrowDownRight className="w-3 h-3" />
                              <span>-{item.salidasDia.toLocaleString()}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right font-mono font-black text-sm bg-orange-50/40 text-orange-950">
                          <span className="bg-orange-500/10 text-orange-900 px-2.5 py-1 rounded-lg border border-orange-300">
                            {item.stockFinal.toLocaleString()} unid.
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          {item.foliosVaciado.length > 0 ? (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {item.foliosVaciado.map((f) => (
                                <span
                                  key={f}
                                  className="px-2 py-0.5 bg-orange-600 text-white font-mono text-[10px] font-bold rounded-md shadow-xs"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">Sin vaciado</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODO 2: TABLA HISTÓRICA KARDEX DÍA A DÍA (EVOLUCIÓN CRONOLÓGICA) */}
        {viewMode === "historico" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
                  <span>Evolución Histórica de Inventario por Fechas</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trazabilidad corrida de entradas y salidas ordenadas por fecha.
                </p>
              </div>

              <span className="text-xs font-bold bg-slate-200 text-slate-700 px-3 py-1 rounded-full">
                {filteredKardexHistory.length} Registros Encontrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="p-3.5">Fecha</th>
                    <th className="p-3.5">Tipo de Ladrillo</th>
                    <th className="p-3.5 text-right">Stock Inicial (Terminado)</th>
                    <th className="p-3.5 text-right text-blue-800">Moldeados (Crudos)</th>
                    <th className="p-3.5 text-right text-emerald-800">Producción Terminada (+)</th>
                    <th className="p-3.5 text-right text-rose-800">Salidas / Ventas (-)</th>
                    <th className="p-3.5 text-right text-orange-950 font-black">Stock Final (Terminado)</th>
                    <th className="p-3.5">Detalle / Folio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKardexHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No hay datos históricos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredKardexHistory.map((k, index) => (
                      <tr key={`${k.date}-${k.brickTypeId}-${index}`} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono font-bold text-slate-900">{k.date}</td>
                        <td className="p-3.5 font-bold text-slate-800">{k.brickName}</td>
                        <td className="p-3.5 text-right font-mono font-semibold text-slate-600">
                          {k.stockInicial.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-blue-700">
                          {k.produccionVerde > 0 ? `+${k.produccionVerde.toLocaleString()}` : "0"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                          {k.produccionTerminada > 0 ? `+${k.produccionTerminada.toLocaleString()}` : "0"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-rose-700">
                          {k.salidasDia > 0 ? `-${k.salidasDia.toLocaleString()}` : "0"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-slate-900 bg-orange-50/50">
                          {k.stockFinal.toLocaleString()} unid.
                        </td>
                        <td className="p-3.5">
                          {k.foliosVaciado.length > 0 ? (
                            <span className="text-[10px] font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold">
                              {k.foliosVaciado.join(", ")}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ajuste / Movimiento Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-orange-400" />
                <h3 className="font-extrabold text-sm">Registrar Ajuste / Movimiento de Stock</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Ladrillo *</label>
                <select
                  value={formBrickId}
                  onChange={(e) => setFormBrickId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                >
                  {brickTypes.map((bt) => (
                    <option key={bt.id} value={bt.id}>
                      {bt.name} ({bt.dimensions})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Operación</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as MovementType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                >
                  <option value="salida">Salida (Rotura / Merma / Despacho)</option>
                  <option value="entrada">Entrada Especial (Ajuste Positivo)</option>
                  <option value="traslado">Traslado Interno (Patio -&gt; Horno -&gt; Bodega)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cantidad de Ladrillos *</label>
                <input
                  type="number"
                  step="50"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-black font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones / Motivo</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Mermas en horneado o rotura de transporte"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-md"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
