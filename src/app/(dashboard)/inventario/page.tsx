"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { AuditLogger } from "@/lib/audit-logger";
import {
  BrickType,
  InventoryMovement,
  InventoryLocation,
  InventoryStock,
  HornoCycle,
  MovementType,
  ProductionBatch,
  Sale,
  UserRole,
} from "@/types/database.types";
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
  enPatio: number;
  enHorno: number;
  stockEnProceso: number;
  ingresosBodega: number;
  salidasDia: number;
  entradasDia: number;
  stockFinal: number;
  foliosVaciado: string[];
}

import { getTodayDateString } from "@/lib/dates";

const ADJUSTMENT_REASONS = [
  "Rotura en bodega",
  "Diferencia de conteo físico",
  "Uso interno en planta",
  "Saldo inicial",
];

export default function InventarioPage() {
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [hornoCycles, setHornoCycles] = useState<HornoCycle[]>([]);
  const [inventoryStock, setInventoryStock] = useState<InventoryStock[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>("superadmin");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filtros
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedBrickId, setSelectedBrickId] = useState<string>("todos");
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"diario" | "historico">("diario");

  // Formulario Movimiento Manual
  const [formBrickId, setFormBrickId] = useState<string>("");
  const [movementType, setMovementType] = useState<MovementType>("salida");
  const [quantity, setQuantity] = useState<number>(500);
  const [fromLoc, setFromLoc] = useState<InventoryLocation>("bodega_terminado");
  const [toLoc, setToLoc] = useState<InventoryLocation>("bodega_terminado");
  const [reason, setReason] = useState<string>("Rotura en bodega");
  const [notes, setNotes] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = () => {
    const bts = store.getBrickTypes();
    setBrickTypes(bts);
    setBatches(store.getProductionBatches());
    setHornoCycles(store.getHornoCycles());
    setInventoryStock(store.getInventoryStock());
    setMovements(store.getInventoryMovements());
    setSales(store.getSales());
    setCurrentRole(store.getCurrentRole());
    if (bts.length > 0 && !formBrickId) {
      setFormBrickId(bts[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const handleRoleChange = (e: Event) => {
      const detailRole = (e as CustomEvent<UserRole>).detail;
      const nextRole = detailRole || store.getCurrentRole();
      setCurrentRole(nextRole);
      if (nextRole !== "superadmin") {
        setIsModalOpen(false);
      }
    };
    const events = [
      "erp_sync_completed",
      "erp_brick_types_updated",
      "erp_batches_updated",
      "erp_inventory_updated",
      "erp_orders_updated",
      "erp_sales_updated",
    ];
    events.forEach((ev) => window.addEventListener(ev, loadData));
    window.addEventListener("erp_role_changed", handleRoleChange);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, loadData));
      window.removeEventListener("erp_role_changed", handleRoleChange);
    };
  }, []);

  const isSuperAdmin = currentRole === "superadmin";

  // 1. Obtener todas las fechas con actividad registrada (Vaciados, Hornos, Ventas o Movimientos) + Hoy
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    const todayStr = getTodayDateString();
    datesSet.add(todayStr);

    batches.forEach((b) => {
      if (b.production_date) datesSet.add(b.production_date);
    });

    hornoCycles.forEach((c) => {
      if (c.fecha_ingreso) datesSet.add(c.fecha_ingreso);
      if (c.fecha_salida) datesSet.add(c.fecha_salida);
    });

    sales.forEach((s) => {
      if (s.created_at) {
        datesSet.add(s.created_at.split("T")[0]);
      }
    });

    movements.forEach((m) => {
      if (m.created_at) {
        datesSet.add(m.created_at.split("T")[0]);
      }
    });

    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [batches, hornoCycles, sales, movements]);

  // 2. Calcular Kardex Histórico día a día anclado al stock real en Bodega, Patio y Horno
  const kardexHistory = useMemo(() => {
    if (brickTypes.length === 0) return [];

    // Ordenar fechas descendente (desde el cierre actual hacia atrás) para cuadrar exactamente con el stock real
    const sortedDatesDesc = [...availableDates].sort((a, b) => b.localeCompare(a));

    const runningBodega: Record<string, number> = {};
    const patioByBrick: Record<string, number> = {};
    const hornoByBrick: Record<string, number> = {};

    brickTypes.forEach((bt) => {
      runningBodega[bt.id] = inventoryStock
        .filter((s) => s.brick_type_id === bt.id && s.location === "bodega_terminado")
        .reduce((sum, s) => sum + (s.quantity || 0), 0);
      patioByBrick[bt.id] = inventoryStock
        .filter((s) => s.brick_type_id === bt.id && s.location === "patio_secado")
        .reduce((sum, s) => sum + (s.quantity || 0), 0);
      hornoByBrick[bt.id] = inventoryStock
        .filter((s) => s.brick_type_id === bt.id && s.location === "horno")
        .reduce((sum, s) => sum + (s.quantity || 0), 0);
    });

    const result: DailyBrickKardex[] = [];

    sortedDatesDesc.forEach((dateStr) => {
      brickTypes.forEach((bt) => {
        const stockFinalDia = Math.max(0, runningBodega[bt.id]);

        // Ingresos a Bodega Terminado por deshorne (1ra + 2da) en esta fecha
        let ingresosDeshorne = 0;
        const foliosHorno: string[] = [];
        hornoCycles.forEach((c) => {
          if (c.status !== "finalizado") return;
          const outDate = c.fecha_salida || c.fecha_ingreso;
          if (outDate !== dateStr) return;

          if (c.items && c.items.length > 0) {
            c.items.forEach((it) => {
              if (it.brick_type_id === bt.id) {
                ingresosDeshorne += (it.cantidad_salida_primera || 0) + (it.cantidad_salida_segunda || 0);
                if (c.folio && !foliosHorno.includes(c.folio)) foliosHorno.push(c.folio);
              }
            });
          } else if (c.brick_type_id === bt.id) {
            ingresosDeshorne += (c.cantidad_salida_primera || 0) + (c.cantidad_salida_segunda || 0);
            if (c.folio && !foliosHorno.includes(c.folio)) foliosHorno.push(c.folio);
          }
        });

        // Folios de vaciado del día
        const foliosVaciado = batches
          .filter((b) => b.brick_type_id === bt.id && b.production_date === dateStr)
          .map((b) => b.folio_number)
          .filter((f): f is string => Boolean(f));

        // Salidas por ventas del día
        let salidasVenta = 0;
        sales.forEach((s) => {
          const sDate = s.created_at ? s.created_at.split("T")[0] : "";
          if (sDate === dateStr && s.items) {
            s.items.forEach((item) => {
              if (item.brick_type_id === bt.id) {
                salidasVenta += item.quantity || 0;
              }
            });
          }
        });

        // Movimientos manuales que afectan bodega_terminado
        let entradasManual = 0;
        let salidasManual = 0;
        movements.forEach((m) => {
          const mDate = m.created_at ? m.created_at.split("T")[0] : "";
          if (mDate === dateStr && m.brick_type_id === bt.id) {
            if (m.movement_type === "entrada" && (!m.to_location || m.to_location === "bodega_terminado")) {
              entradasManual += m.quantity || 0;
            }
            if (m.movement_type === "salida" && (!m.from_location || m.from_location === "bodega_terminado")) {
              salidasManual += m.quantity || 0;
            }
          }
        });

        const ingresosBodega = ingresosDeshorne + entradasManual;
        const salidasDia = salidasVenta + salidasManual;
        const stockInicial = Math.max(0, stockFinalDia - ingresosBodega + salidasDia);

        // Retroceder el saldo para la fecha anterior
        runningBodega[bt.id] = stockInicial;

        const enPatio = patioByBrick[bt.id] || 0;
        const enHorno = hornoByBrick[bt.id] || 0;
        const stockEnProceso = enPatio + enHorno;

        result.push({
          date: dateStr,
          brickTypeId: bt.id,
          brickName: bt.name,
          dimensions: bt.dimensions || "N/A",
          stockInicial,
          enPatio,
          enHorno,
          stockEnProceso,
          ingresosBodega,
          salidasDia,
          entradasDia: entradasManual,
          stockFinal: stockFinalDia,
          foliosVaciado: [...foliosHorno, ...foliosVaciado],
        });
      });
    });

    return result;
  }, [brickTypes, availableDates, batches, hornoCycles, inventoryStock, sales, movements]);

  // 3. Kardex filtrado para la fecha seleccionada (ordenado con stock > 0 primero)
  const dailyReportForSelectedDate = useMemo(() => {
    let list = kardexHistory.filter((k) => k.date === selectedDate);
    if (selectedBrickId !== "todos") {
      list = list.filter((k) => k.brickTypeId === selectedBrickId);
    }
    if (hideZeroStock) {
      list = list.filter(
        (k) => k.stockFinal > 0 || k.stockEnProceso > 0 || k.ingresosBodega > 0 || k.salidasDia > 0
      );
    }
    return [...list].sort((a, b) => {
      const aActive = a.stockFinal > 0 || a.ingresosBodega > 0 || a.salidasDia > 0 || a.stockEnProceso > 0 ? 1 : 0;
      const bActive = b.stockFinal > 0 || b.ingresosBodega > 0 || b.salidasDia > 0 || b.stockEnProceso > 0 ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      if (b.stockFinal !== a.stockFinal) return b.stockFinal - a.stockFinal;
      return b.stockEnProceso - a.stockEnProceso;
    });
  }, [kardexHistory, selectedDate, selectedBrickId, hideZeroStock]);

  // 4. Kardex histórico filtrado para la pestaña de histórico
  const filteredKardexHistory = useMemo(() => {
    let list = kardexHistory;
    if (selectedBrickId !== "todos") {
      list = list.filter((k) => k.brickTypeId === selectedBrickId);
    }
    if (hideZeroStock) {
      list = list.filter(
        (k) => k.stockFinal > 0 || k.stockEnProceso > 0 || k.ingresosBodega > 0 || k.salidasDia > 0
      );
    }
    return list;
  }, [kardexHistory, selectedBrickId, hideZeroStock]);

  // Totales de la fecha seleccionada = Suma exacta de las columnas de la tabla
  const totalsSelectedDate = useMemo(() => {
    const items = dailyReportForSelectedDate;
    const totalStockInicial = items.reduce((acc, k) => acc + k.stockInicial, 0);
    const totalEnPatio = items.reduce((acc, k) => acc + k.enPatio, 0);
    const totalEnHorno = items.reduce((acc, k) => acc + k.enHorno, 0);
    const totalEnProceso = items.reduce((acc, k) => acc + k.stockEnProceso, 0);
    const totalIngresosBodega = items.reduce((acc, k) => acc + k.ingresosBodega, 0);
    const totalSalidas = items.reduce((acc, k) => acc + k.salidasDia, 0);
    const totalStockFinal = items.reduce((acc, k) => acc + k.stockFinal, 0);

    return {
      totalStockInicial,
      totalEnPatio,
      totalEnHorno,
      totalEnProceso,
      totalIngresosBodega,
      totalSalidas,
      totalStockFinal,
      totalPlanta: totalStockFinal + totalEnProceso,
    };
  }, [dailyReportForSelectedDate]);

  const handleCreateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!isSuperAdmin) {
      setModalError("Solo el rol SuperAdmin puede ejecutar ajustes de inventario.");
      return;
    }
    if (!formBrickId || quantity <= 0) {
      setModalError("Selecciona un producto y una cantidad mayor a 0.");
      return;
    }
    if (!reason.trim()) {
      setModalError("Debes seleccionar un motivo obligatorio para el ajuste de inventario.");
      return;
    }
    if (!notes.trim()) {
      setModalError("Debes escribir una observación obligatoria antes de guardar el ajuste.");
      return;
    }

    const movement = store.addInventoryMovement({
      brick_type_id: formBrickId,
      movement_type: movementType,
      quantity,
      from_location: movementType === "entrada" ? null : fromLoc,
      to_location: movementType === "salida" ? null : toLoc,
      reference_type: `ajuste_inventario: ${reason}`,
    });

    const btName = brickTypes.find((b) => b.id === formBrickId)?.name || formBrickId;
    let currentUserName = "Usuario Sistema";
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("erp_current_user");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.name) currentUserName = parsed.name;
        } catch {}
      }
    }

    const nowDateTime = new Date().toLocaleString("es-BO");
    AuditLogger.log({
      action: "STOCK_ADJUSTMENT",
      severity: "high",
      module: "inventario",
      entity_id: movement.id,
      user_name: currentUserName,
      description: `Ajuste de Inventario (${movementType.toUpperCase()}): ${quantity.toLocaleString("es-BO")} unid. de ${btName} — Motivo: ${reason} — Obs: ${notes.trim()} — Usuario: ${currentUserName} — Fecha/Hora: ${nowDateTime}`,
      details: {
        movement_id: movement.id,
        brick_type_id: formBrickId,
        brick_name: btName,
        movement_type: movementType,
        quantity,
        reason,
        notes: notes.trim(),
        user: currentUserName,
        date: getTodayDateString(),
        date_time: nowDateTime,
      },
    });

    setNotes("");
    setModalError(null);
    setIsModalOpen(false);
    loadData();
  };

  const handlePrintReport = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <>
      <Header title="Control Kardex de Inventario & Producción por Fechas" />

      <div className={(isSuperAdmin && isModalOpen) || isPrintModalOpen ? "hidden" : "p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full print:hidden"}>
        {/* Banner de Introducción & Acciones */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="z-10 space-y-1 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-medium border border-orange-500/30">
              <PackageCheck className="w-4 h-4" />
              <span>Balance Diario Actualizado</span>
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Registro Kardex de Producción e Inventario
            </h2>
            <p className="text-xs text-slate-300">
              Consulte el <strong className="font-semibold">stock que había antes de cada fecha</strong>, la <strong className="font-semibold">producción vaciada ese día</strong> y el <strong className="font-semibold">inventario final con el stock actualizado</strong>.
            </p>
          </div>

          <div className="z-10 flex items-center space-x-3">
            <button
              onClick={handlePrintReport}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl font-medium text-xs border border-slate-700 transition"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>Imprimir Kardex</span>
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setModalError(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-medium text-xs shadow-lg shadow-orange-950/50 transition cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Ajuste de Inventario</span>
              </button>
            )}
          </div>
        </div>

        {/* Tarjetas KPI de Resumen para la Fecha Seleccionada */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Stock Anterior (Bodega)</span>
              <History className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-800 font-mono">
              {totalsSelectedDate.totalStockInicial.toLocaleString("es-BO")} <span className="text-xs font-normal text-slate-400">unid.</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Saldo inicial en bodega al {selectedDate}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs bg-emerald-50/20">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-medium mb-1">
              <span>Ingresos a Bodega ({selectedDate})</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-semibold text-emerald-900 font-mono">
              +{totalsSelectedDate.totalIngresosBodega.toLocaleString("es-BO")} <span className="text-xs font-normal text-emerald-700">unid.</span>
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">Deshornes y ajustes ingresados</p>
          </div>

          <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-xs bg-rose-50/20">
            <div className="flex items-center justify-between text-rose-700 text-xs font-medium mb-1">
              <span>Salidas / Ventas (-)</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-semibold text-rose-900 font-mono">
              -{totalsSelectedDate.totalSalidas.toLocaleString("es-BO")} <span className="text-xs font-normal text-rose-700">unid.</span>
            </div>
            <p className="text-[11px] text-rose-600 mt-1">Ventas y mermas en {selectedDate}</p>
          </div>

          <div className="bg-white rounded-xl border border-orange-300 p-4 shadow-md bg-orange-50/40">
            <div className="flex items-center justify-between text-orange-800 text-xs font-semibold mb-1">
              <span>Stock Final Bodega ({selectedDate})</span>
              <Boxes className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-semibold text-orange-950 font-mono">
              {totalsSelectedDate.totalStockFinal.toLocaleString("es-BO")} <span className="text-xs font-normal text-orange-800">unid.</span>
            </div>
            <p className="text-[11px] text-orange-700 font-medium mt-1">
              En Proceso: {totalsSelectedDate.totalEnProceso.toLocaleString("es-BO")} (Patio: {totalsSelectedDate.totalEnPatio.toLocaleString("es-BO")} + Horno: {totalsSelectedDate.totalEnHorno.toLocaleString("es-BO")}) • Total Planta: {totalsSelectedDate.totalPlanta.toLocaleString("es-BO")}
            </p>
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
                className="bg-white border border-slate-300 text-slate-900 font-medium rounded-md px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
                <option value="todos">🧱 Todos los productos ({brickTypes.length} Tipos)</option>
                {brickTypes.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {bt.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={hideZeroStock}
                onChange={(e) => setHideZeroStock(e.target.checked)}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Ocultar productos sin stock</span>
            </label>
          </div>

          {/* Toggle de Pestañas / Modo de Vista */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setViewMode("diario")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition ${
                viewMode === "diario"
                  ? "bg-white text-orange-600 shadow-xs font-semibold"
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
                  ? "bg-white text-orange-600 shadow-xs font-semibold"
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
                <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
                  <span>Balance del Inventario al Cierre de {selectedDate}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualización de Stock Inicial, Producción Registrada y Stock Final por Tipo de Ladrillo.
                </p>
              </div>

              <span className="text-xs font-medium bg-orange-100 text-orange-800 px-3 py-1 rounded-full border border-orange-200">
                {dailyReportForSelectedDate.length} Productos En Lista
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-medium uppercase tracking-wider text-[11px]">
                    <th className="px-2.5 py-3">N° / Tipo de Ladrillo</th>
                    <th className="px-2 py-3 text-center whitespace-nowrap">Dim.</th>
                    <th className="px-2.5 py-3 text-right bg-slate-200/50 text-slate-800 whitespace-nowrap">
                      Stock Inicial <br />
                      <span className="text-[10px] font-normal text-slate-500">(Bodega)</span>
                    </th>
                    <th className="px-2.5 py-3 text-right bg-blue-50 text-blue-900 whitespace-nowrap">
                      En Patio <br />
                      <span className="text-[10px] font-normal text-blue-700">(Crudo)</span>
                    </th>
                    <th className="px-2.5 py-3 text-right bg-amber-50 text-amber-900 whitespace-nowrap">
                      En Horno <br />
                      <span className="text-[10px] font-normal text-amber-700">(Cocción)</span>
                    </th>
                    <th className="px-2.5 py-3 text-right bg-emerald-50 text-emerald-900 whitespace-nowrap">
                      Ingresos (+) <br />
                      <span className="text-[10px] font-normal text-emerald-700">(Bodega)</span>
                    </th>
                    <th className="px-2.5 py-3 text-right bg-rose-50 text-rose-900 whitespace-nowrap">
                      Salidas (-) <br />
                      <span className="text-[10px] font-normal text-rose-700">(Ventas)</span>
                    </th>
                    <th className="px-2.5 py-3 text-right bg-orange-100/60 text-orange-950 whitespace-nowrap">
                      Stock Final (=) <br />
                      <span className="text-[10px] font-semibold text-orange-800">(Bodega)</span>
                    </th>
                    <th className="px-2.5 py-3 text-center">Folios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyReportForSelectedDate.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No hay registros de producciones o movimientos para la fecha seleccionada.
                      </td>
                    </tr>
                  ) : (
                    dailyReportForSelectedDate.map((item, idx) => (
                      <tr key={item.brickTypeId} className="hover:bg-slate-50/80 transition">
                        <td className="px-2.5 py-2.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400 font-mono text-[11px] font-medium w-5 shrink-0">{idx + 1}.</span>
                            <div className="font-semibold text-slate-900 text-xs">{item.brickName}</div>
                          </div>
                        </td>

                        <td className="px-2 py-2.5 text-center text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {item.dimensions}
                        </td>

                        <td className="px-2.5 py-2.5 text-right font-mono font-medium text-slate-700 bg-slate-50/50 whitespace-nowrap">
                          {item.stockInicial.toLocaleString("es-BO")} <span className="text-[10px] text-slate-400">u</span>
                        </td>

                        <td className="px-2.5 py-2.5 text-right font-mono font-semibold bg-blue-50/30 text-blue-800 whitespace-nowrap">
                          {item.enPatio > 0 ? (
                            <span className="inline-flex items-center text-blue-700 font-medium bg-blue-100 px-2 py-0.5 rounded-md">
                              {item.enPatio.toLocaleString("es-BO")}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="px-2.5 py-2.5 text-right font-mono font-semibold bg-amber-50/30 text-amber-800 whitespace-nowrap">
                          {item.enHorno > 0 ? (
                            <span className="inline-flex items-center text-amber-800 font-medium bg-amber-100 px-2 py-0.5 rounded-md">
                              {item.enHorno.toLocaleString("es-BO")}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="px-2.5 py-2.5 text-right font-mono font-semibold bg-emerald-50/30 text-emerald-800 whitespace-nowrap">
                          {item.ingresosBodega > 0 ? (
                            <span className="inline-flex items-center space-x-0.5 text-emerald-700 font-medium bg-emerald-100 px-2 py-0.5 rounded-md">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>+{item.ingresosBodega.toLocaleString("es-BO")}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="px-2.5 py-2.5 text-right font-mono font-semibold bg-rose-50/30 text-rose-800 whitespace-nowrap">
                          {item.salidasDia > 0 ? (
                            <span className="inline-flex items-center space-x-0.5 text-rose-700 font-medium bg-rose-100 px-2 py-0.5 rounded-md">
                              <ArrowDownRight className="w-3 h-3" />
                              <span>-{item.salidasDia.toLocaleString("es-BO")}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-xs bg-orange-50/40 text-orange-950 whitespace-nowrap">
                          <span className="inline-block whitespace-nowrap bg-orange-500/10 text-orange-900 px-2.5 py-1 rounded-lg border border-orange-300">
                            {item.stockFinal.toLocaleString("es-BO")} unid.
                          </span>
                        </td>

                        <td className="px-2.5 py-2.5 text-center">
                          {item.foliosVaciado.length > 0 ? (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {item.foliosVaciado.map((f) => (
                                <span
                                  key={f}
                                  className="px-2 py-0.5 bg-orange-600 text-white font-mono text-[10px] font-medium rounded-md shadow-xs whitespace-nowrap"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[11px] whitespace-nowrap">Sin mov.</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-mono font-semibold text-xs text-slate-900">
                  <tr>
                    <td colSpan={2} className="px-2.5 py-3 font-sans uppercase text-[11px]">
                      TOTALES ({dailyReportForSelectedDate.length} productos)
                    </td>
                    <td className="px-2.5 py-3 text-right whitespace-nowrap">
                      {totalsSelectedDate.totalStockInicial.toLocaleString("es-BO")}
                    </td>
                    <td className="px-2.5 py-3 text-right text-blue-800 whitespace-nowrap">
                      {totalsSelectedDate.totalEnPatio.toLocaleString("es-BO")}
                    </td>
                    <td className="px-2.5 py-3 text-right text-amber-800 whitespace-nowrap">
                      {totalsSelectedDate.totalEnHorno.toLocaleString("es-BO")}
                    </td>
                    <td className="px-2.5 py-3 text-right text-emerald-700 whitespace-nowrap">
                      +{totalsSelectedDate.totalIngresosBodega.toLocaleString("es-BO")}
                    </td>
                    <td className="px-2.5 py-3 text-right text-rose-700 whitespace-nowrap">
                      -{totalsSelectedDate.totalSalidas.toLocaleString("es-BO")}
                    </td>
                    <td className="px-2.5 py-3 text-right text-orange-950 bg-orange-100/70 whitespace-nowrap">
                      {totalsSelectedDate.totalStockFinal.toLocaleString("es-BO")} unid.
                    </td>
                    <td className="px-2.5 py-3 text-center font-sans text-[11px] text-slate-600 whitespace-nowrap">
                      Proceso: {totalsSelectedDate.totalEnProceso.toLocaleString("es-BO")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* MODO 2: TABLA HISTÓRICA KARDEX DÍA A DÍA (EVOLUCIÓN CRONOLÓGICA) */}
        {viewMode === "historico" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
                  <span>Evolución Histórica de Inventario por Fechas</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trazabilidad corrida de entradas y salidas ordenadas por fecha.
                </p>
              </div>

              <span className="text-xs font-medium bg-slate-200 text-slate-700 px-3 py-1 rounded-full">
                {filteredKardexHistory.length} Registros Encontrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-medium uppercase tracking-wider">
                    <th className="p-3.5">Fecha</th>
                    <th className="p-3.5">Tipo de Ladrillo</th>
                    <th className="p-3.5 text-right">Stock Inicial (Bodega)</th>
                    <th className="p-3.5 text-right text-blue-800">En Proceso (Patio+Horno)</th>
                    <th className="p-3.5 text-right text-emerald-800">Ingresos Bodega (+)</th>
                    <th className="p-3.5 text-right text-rose-800">Salidas / Ventas (-)</th>
                    <th className="p-3.5 text-right text-orange-950 font-semibold">Stock Final (Bodega)</th>
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
                        <td className="p-3.5 font-mono font-medium text-slate-900">{k.date}</td>
                        <td className="p-3.5 font-medium text-slate-800">{k.brickName}</td>
                        <td className="p-3.5 text-right font-mono font-semibold text-slate-600">
                          {k.stockInicial.toLocaleString("es-BO")}
                        </td>
                        <td className="p-3.5 text-right font-mono font-medium text-blue-700">
                          {k.stockEnProceso > 0 ? k.stockEnProceso.toLocaleString("es-BO") : "0"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-medium text-emerald-700">
                          {k.ingresosBodega > 0 ? `+${k.ingresosBodega.toLocaleString("es-BO")}` : "0"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-medium text-rose-700">
                          {k.salidasDia > 0 ? `-${k.salidasDia.toLocaleString("es-BO")}` : "0"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-semibold text-slate-900 bg-orange-50/50">
                          {k.stockFinal.toLocaleString("es-BO")} unid.
                        </td>
                        <td className="p-3.5">
                          {k.foliosVaciado.length > 0 ? (
                            <span className="text-[10px] font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-medium">
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

      {/* Vista Previa Pantalla Completa - Imprimir Kardex */}
      {isPrintModalOpen && (
        <div className="w-full flex-1 bg-white flex flex-col print:p-0 print:static print:bg-white">
          <div className="bg-white w-full flex-1 flex flex-col animate-in fade-in duration-150">
            <div className="sticky top-16 z-10 px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-orange-400" />
                <h3 className="font-medium text-sm">Vista Previa - Reporte Kardex de Inventario ({selectedDate})</h3>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Descargar PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6 flex-1">
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 tracking-tight">INCEGUA S.R.L.</h1>
                  <p className="text-xs text-slate-500">KARDEX OFICIAL DE INVENTARIO Y PRODUCCIÓN EN PLANTA</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-medium text-slate-800">Fecha de Corte: {selectedDate}</p>
                  <p className="text-slate-500">Total Planta: {totalsSelectedDate.totalPlanta.toLocaleString("es-BO")} unid.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block">Stock Anterior (Bodega)</span>
                  <strong className="text-base font-mono text-slate-900">
                    {totalsSelectedDate.totalStockInicial.toLocaleString("es-BO")} unid.
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                  <span className="text-emerald-700 block">Ingresos a Bodega (+)</span>
                  <strong className="text-base font-mono text-emerald-900">
                    +{totalsSelectedDate.totalIngresosBodega.toLocaleString("es-BO")} unid.
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50">
                  <span className="text-rose-700 block">Salidas / Ventas (-)</span>
                  <strong className="text-base font-mono text-rose-900">
                    -{totalsSelectedDate.totalSalidas.toLocaleString("es-BO")} unid.
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-orange-300 bg-orange-50/60">
                  <span className="text-orange-800 block">Stock Final Bodega (=)</span>
                  <strong className="text-base font-mono text-orange-950">
                    {totalsSelectedDate.totalStockFinal.toLocaleString("es-BO")} unid.
                  </strong>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-medium uppercase">
                      <th className="p-3">Producto</th>
                      <th className="p-3 text-right">Stock Inicial</th>
                      <th className="p-3 text-right">En Patio</th>
                      <th className="p-3 text-right">En Horno</th>
                      <th className="p-3 text-right">Ingresos (+)</th>
                      <th className="p-3 text-right">Salidas (-)</th>
                      <th className="p-3 text-right">Stock Final (=)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyReportForSelectedDate.map((item) => (
                      <tr key={item.brickTypeId}>
                        <td className="p-3 font-semibold text-slate-900">{item.brickName}</td>
                        <td className="p-3 text-right font-mono">{item.stockInicial.toLocaleString("es-BO")}</td>
                        <td className="p-3 text-right font-mono text-blue-700">{item.enPatio.toLocaleString("es-BO")}</td>
                        <td className="p-3 text-right font-mono text-amber-700">{item.enHorno.toLocaleString("es-BO")}</td>
                        <td className="p-3 text-right font-mono text-emerald-700">+{item.ingresosBodega.toLocaleString("es-BO")}</td>
                        <td className="p-3 text-right font-mono text-rose-700">-{item.salidasDia.toLocaleString("es-BO")}</td>
                        <td className="p-3 text-right font-mono font-medium text-slate-900">{item.stockFinal.toLocaleString("es-BO")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-mono font-medium text-xs">
                    <tr>
                      <td className="p-3 font-sans uppercase">TOTALES</td>
                      <td className="p-3 text-right">{totalsSelectedDate.totalStockInicial.toLocaleString("es-BO")}</td>
                      <td className="p-3 text-right text-blue-800">{totalsSelectedDate.totalEnPatio.toLocaleString("es-BO")}</td>
                      <td className="p-3 text-right text-amber-800">{totalsSelectedDate.totalEnHorno.toLocaleString("es-BO")}</td>
                      <td className="p-3 text-right text-emerald-700">+{totalsSelectedDate.totalIngresosBodega.toLocaleString("es-BO")}</td>
                      <td className="p-3 text-right text-rose-700">-{totalsSelectedDate.totalSalidas.toLocaleString("es-BO")}</td>
                      <td className="p-3 text-right text-orange-950">{totalsSelectedDate.totalStockFinal.toLocaleString("es-BO")} unid.</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end pt-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cerrar Vista Previa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajuste de Inventario (solo SuperAdmin) en pantalla completa respetando el menú izquierdo */}
      {isSuperAdmin && isModalOpen && (
        <div className="w-full flex-1 bg-white flex flex-col print:hidden">
          <div className="bg-white w-full flex-1 flex flex-col animate-in fade-in duration-150">
            <div className="sticky top-16 z-10 px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-orange-400" />
                <h3 className="font-semibold text-sm">Ajuste de Inventario (Conteo / Merma)</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="p-6 space-y-4 text-xs flex-1">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tipo de Ladrillo *</label>
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
                <label className="block font-medium text-slate-700 mb-1">Tipo de Operación</label>
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
                <label className="block font-medium text-slate-700 mb-1">Cantidad de Ladrillos *</label>
                <input
                  type="number"
                  step="50"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Motivo del Ajuste / Salida *</label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                >
                  <option value="">Selecciona un motivo...</option>
                  {ADJUSTMENT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Observaciones *</label>
                <input
                  required
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Detalle del conteo físico o lote afectado"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {modalError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {modalError}
                </div>
              )}

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
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg shadow-md"
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
