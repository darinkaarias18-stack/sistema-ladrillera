"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { getTodayDateString } from "@/lib/dates";
import {
  ProductionBatch,
  InventoryStock,
  BrickType,
  Employee,
  Order,
  HornoCycle,
} from "@/types/database.types";
import { useEffect, useState, useMemo } from "react";
import {
  Factory,
  Flame,
  Boxes,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Truck,
  FlameKindling,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [stock, setStock] = useState<InventoryStock[]>([]);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hornoCycles, setHornoCycles] = useState<HornoCycle[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const loadDashboardData = () => {
    setBatches(store.getProductionBatches());
    setStock(store.getInventoryStock());
    setBrickTypes(store.getBrickTypes());
    setEmployees(store.getEmployees());
    setOrders(store.getOrders());
    setHornoCycles(store.getHornoCycles());
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      loadDashboardData();
    }, 0);

    const events = [
      "erp_sync_completed",
      "erp_batches_updated",
      "erp_inventory_updated",
      "erp_orders_updated",
    ];
    events.forEach((ev) => window.addEventListener(ev, loadDashboardData));
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, loadDashboardData));
    };
  }, []);

  // 1. MÉTRICAS CLAVE DE PRODUCCIÓN & HORNOS
  const currentMonthPrefix = useMemo(() => getTodayDateString().slice(0, 7), []);

  const kilnMetrics = useMemo(() => {
    const finalizedAll = hornoCycles.filter((c) => c.status === "finalizado");
    const finalizedMonth = finalizedAll.filter((c) =>
      (c.fecha_salida || c.fecha_ingreso || "").startsWith(currentMonthPrefix)
    );
    const targetCycles = finalizedMonth.length > 0 ? finalizedMonth : finalizedAll;

    let ingresado = 0;
    let sanoSalido = 0;
    let merma = 0;

    targetCycles.forEach((c) => {
      const ing = Number(c.cantidad_ingreso || 0);
      const sanos =
        Number(c.cantidad_salida_primera || 0) + Number(c.cantidad_salida_segunda || 0);
      const cycleMerma =
        c.cantidad_merma !== undefined ? Number(c.cantidad_merma) : Math.max(0, ing - sanos);
      ingresado += ing;
      sanoSalido += sanos;
      merma += cycleMerma;
    });

    const mermaPct = ingresado > 0 ? ((ingresado - sanoSalido) / ingresado) * 100 : 0;

    return {
      ingresado,
      sanoSalido,
      merma,
      mermaPct: Number(mermaPct.toFixed(1)),
      cyclesCount: targetCycles.length,
    };
  }, [hornoCycles, currentMonthPrefix]);

  const monthlyMolding = useMemo(() => {
    const currentMonthBatches = batches.filter((b) =>
      (b.production_date || "").startsWith(currentMonthPrefix)
    );
    if (currentMonthBatches.length > 0) {
      return {
        total: currentMonthBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0),
        count: currentMonthBatches.length,
        periodLabel: "Mes actual",
      };
    }
    if (batches.length === 0) {
      return { total: 0, count: 0, periodLabel: "Sin registros" };
    }
    const latestMonth = batches.reduce(
      (max, b) => {
        const m = (b.production_date || "").slice(0, 7);
        return m > max ? m : max;
      },
      (batches[0].production_date || "").slice(0, 7)
    );
    const latestBatches = batches.filter((b) =>
      (b.production_date || "").startsWith(latestMonth)
    );
    return {
      total: latestBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0),
      count: latestBatches.length,
      periodLabel: `Último mes (${latestMonth})`,
    };
  }, [batches, currentMonthPrefix]);

  const stockPatio = useMemo(() => {
    return stock
      .filter((s) => s.location === "patio_secado")
      .reduce((sum, s) => sum + s.quantity, 0);
  }, [stock]);

  const stockHorno = useMemo(() => {
    return stock
      .filter((s) => s.location === "horno")
      .reduce((sum, s) => sum + s.quantity, 0);
  }, [stock]);

  const stockBodega = useMemo(() => {
    return stock
      .filter((s) => s.location === "bodega_terminado")
      .reduce((sum, s) => sum + s.quantity, 0);
  }, [stock]);

  // Lotes frescos verde (del día de hoy o último turno registrado)
  const producedToday = useMemo(() => {
    const today = getTodayDateString();
    const todayBatches = batches.filter((b) => b.production_date === today);
    if (todayBatches.length > 0) {
      return todayBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
    }
    if (batches.length === 0) return 0;
    const latestDate = batches.reduce(
      (max, b) => (b.production_date > max ? b.production_date : max),
      batches[0].production_date
    );
    return batches
      .filter((b) => b.production_date === latestDate)
      .reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
  }, [batches]);

  // Cuadre exacto de las 4 etapas: Vaciado/Verde + Patio Secado + Hornos + Bodega Terminado
  const stockEnProceso = producedToday + stockPatio + stockHorno;
  const totalStockGlobal = stockEnProceso + stockBodega;

  // Cruce con Pedidos activos pendientes de despacho
  const orderMetrics = useMemo(() => {
    const pendingOrders = orders.filter(
      (o) =>
        o.status !== "cancelado" &&
        o.delivery_status !== "entregado" &&
        o.delivery_status !== "cancelado"
    );
    const committedUnits = pendingOrders.reduce(
      (sum, o) =>
        sum + (o.items || []).reduce((itemSum, it) => itemSum + (it.quantity || 0), 0),
      0
    );
    const availableReal = stockBodega - committedUnits;
    return {
      pendingCount: pendingOrders.length,
      committedUnits,
      availableReal,
    };
  }, [orders, stockBodega]);

  // 2. PRODUCCIÓN POR TIPO DE LADRILLO
  const productionChartData = useMemo(() => {
    return brickTypes
      .map((bt) => {
        const qty = batches
          .filter((b) => b.brick_type_id === bt.id)
          .reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
        return {
          id: bt.id,
          name: bt.name.replace("Ladrillo ", ""),
          fullName: bt.name,
          cantidad: qty,
        };
      })
      .filter((item) => item.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [brickTypes, batches]);

  // 3. VACIADOS DIARIOS POR TURNO (MAÑANA VS TARDE)
  const dailyProductionData = useMemo(() => {
    const map = new Map<string, { fecha: string; dia: string; manana: number; tarde: number; total: number }>();
    const sorted = [...batches].sort((a, b) => a.production_date.localeCompare(b.production_date));

    sorted.forEach((b) => {
      const d = b.production_date;
      if (!map.has(d)) {
        map.set(d, { fecha: d, dia: d.slice(5), manana: 0, tarde: 0, total: 0 });
      }
      const item = map.get(d)!;
      if (b.shift === "mañana") {
        item.manana += b.quantity_produced || 0;
      } else {
        item.tarde += b.quantity_produced || 0;
      }
      item.total += b.quantity_produced || 0;
    });

    return Array.from(map.values()).slice(-8); // últimos 8 días registrados
  }, [batches]);

  // 4. RENDIMIENTO POR MAESTRO MOLDEADOR A DESTAJO
  const operatorStats = useMemo(() => {
    const destajoEmployees = employees.filter((e) => e.contract_type === "destajo");
    return destajoEmployees.map((emp) => {
      const empBatches = batches.filter((b) => b.operator_id === emp.id);
      const totalUnits = empBatches.reduce((acc, b) => acc + (b.quantity_produced || 0), 0);
      const batchCount = empBatches.length || 1;
      const avgPerBatch = Math.round(totalUnits / batchCount);
      const dailyTarget = 3000;
      const targetPct = Math.min(Math.round((avgPerBatch / dailyTarget) * 100), 120);

      return {
        id: emp.id,
        name: emp.full_name,
        totalUnits,
        batchCount,
        avgPerBatch,
        targetPct,
      };
    }).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [employees, batches]);

  // 5. ESTADO DE HORNOS
  const hornosData = [
    {
      id: "horno-1",
      nombre: "Horno Continuo 1",
      capacidad: 10000,
      enCoccion: 9000,
      porcentaje: 90,
      fase: "Cocción Activa (980°C)",
      combustible: "Leña dura Tajibo",
      estadoColor: "emerald",
    },
    {
      id: "horno-2",
      nombre: "Horno de Bóveda 2",
      capacidad: 8000,
      enCoccion: 6000,
      porcentaje: 75,
      fase: "Calentamiento Progresivo",
      combustible: "Leña Curupaú",
      estadoColor: "amber",
    },
    {
      id: "horno-3",
      nombre: "Horno de Descarga 3",
      capacidad: 5000,
      enCoccion: 2000,
      porcentaje: 40,
      fase: "Enfriamiento & Despacho",
      combustible: "Enfriamiento",
      estadoColor: "blue",
    },
  ];

  return (
    <>
      <Header title="Dashboard General de Operaciones & Producción" />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Banner de Bienvenida y Estado de Planta */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Planta Activa
              </span>
              <span className="text-xs text-slate-300">Turno de Operaciones en Marcha</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              Indicadores de Producción & Eficiencia de Fábrica
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Monitoreo en tiempo real de vaciados diarios, ocupación de hornos, patio de secado y stock disponible en bodega.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300 block">Vaciado de Hoy</span>
              <span className="text-2xl font-black text-white">{producedToday.toLocaleString("es-BO")}</span>
              <span className="text-[10px] text-slate-300 block">unid. moldeadas</span>
            </div>
            <div className="w-px h-10 bg-white/20 mx-1" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">Stock Total Planta</span>
              <span className="text-2xl font-black text-white">{totalStockGlobal.toLocaleString("es-BO")}</span>
              <span className="text-[10px] text-slate-300 block">
                En proceso ({stockEnProceso.toLocaleString("es-BO")}) + listo en bodega ({stockBodega.toLocaleString("es-BO")})
              </span>
            </div>
          </div>
        </div>

        {/* 1. TOP CARDS: 4 INDICADORES CLAVE DE PRODUCCIÓN Y OPERACIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Vaciado del Mes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-orange-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Vaciado del Mes
              </span>
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Factory className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {monthlyMolding.total.toLocaleString("es-BO")}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div className="mt-2.5 flex items-center text-xs text-emerald-600 font-semibold gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{monthlyMolding.periodLabel} • {monthlyMolding.count} lotes</span>
            </div>
          </div>

          {/* KPI 2: Disponible Real en Bodega */}
          <div
            className={`bg-white rounded-2xl p-5 border shadow-xs relative overflow-hidden group transition ${
              orderMetrics.availableReal < 0
                ? "border-rose-300 hover:border-rose-500/60"
                : orderMetrics.availableReal <= 5000
                ? "border-amber-300 hover:border-amber-500/60"
                : "border-slate-200/80 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Disponible Real en Bodega
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span
                className={`text-3xl font-black tracking-tight ${
                  orderMetrics.availableReal < 0
                    ? "text-rose-600"
                    : orderMetrics.availableReal <= 5000
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {orderMetrics.availableReal.toLocaleString("es-BO")}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div
              className={`mt-2.5 flex items-center text-xs font-semibold gap-1 ${
                orderMetrics.availableReal < 0
                  ? "text-rose-600"
                  : orderMetrics.availableReal <= 5000
                  ? "text-amber-700"
                  : "text-emerald-600"
              }`}
            >
              {orderMetrics.availableReal <= 5000 ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                Físico: {stockBodega.toLocaleString("es-BO")} • Comprometido: {orderMetrics.committedUnits.toLocaleString("es-BO")}
              </span>
            </div>
          </div>

          {/* KPI 3: Tasa de Merma / Rotura */}
          <div
            className={`bg-white rounded-2xl p-5 border shadow-xs relative overflow-hidden group transition ${
              kilnMetrics.mermaPct > 5
                ? "border-rose-300 hover:border-rose-500/60"
                : "border-slate-200/80 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tasa de Merma / Rotura
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  kilnMetrics.mermaPct > 5
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <FlameKindling className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span
                className={`text-3xl font-black tracking-tight ${
                  kilnMetrics.mermaPct > 5 ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {kilnMetrics.mermaPct}%
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">del mes</span>
            </div>
            <div
              className={`mt-2.5 flex items-center text-xs font-semibold gap-1 ${
                kilnMetrics.mermaPct > 5 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {kilnMetrics.mermaPct > 5 ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {kilnMetrics.merma.toLocaleString("es-BO")} unid. rotas ({kilnMetrics.mermaPct > 5 ? "> 5%" : "≤ 5% meta"})
              </span>
            </div>
          </div>

          {/* KPI 4: Pedidos por Despachar */}
          <div
            className={`bg-white rounded-2xl p-5 border shadow-xs relative overflow-hidden group transition ${
              orderMetrics.committedUnits > stockBodega
                ? "border-amber-300 hover:border-amber-500/60"
                : "border-slate-200/80 hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pedidos por Despachar
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {orderMetrics.committedUnits.toLocaleString("es-BO")}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div
              className={`mt-2.5 flex items-center text-xs font-semibold gap-1 ${
                orderMetrics.committedUnits > stockBodega ? "text-amber-700" : "text-slate-600"
              }`}
            >
              {orderMetrics.committedUnits > stockBodega ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              )}
              <span>
                {orderMetrics.pendingCount} {orderMetrics.pendingCount === 1 ? "pedido activo" : "pedidos activos"}
                {orderMetrics.committedUnits > stockBodega ? " • Supera stock libre" : " • Cubierto en bodega"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. PIPELINE DEL CICLO DE PRODUCCIÓN (EMBUDO DE PLANTA) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Flujo de Etapas del Ciclo Productivo</h3>
              <p className="text-xs text-slate-500">Transición de la arcilla desde el vaciado verde hasta el producto terminado</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Stock Total en Planta: <strong>{totalStockGlobal.toLocaleString("es-BO")} unid.</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {/* Etapa 1: Moldeo Verde */}
            <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 relative">
              <div className="flex items-center justify-between text-xs font-bold text-orange-800 mb-1">
                <span>1. Vaciado / Verde</span>
                <span className="bg-orange-200/80 text-orange-900 px-1.5 py-0.5 rounded text-[10px]">
                  Fresco
                </span>
              </div>
              <div className="text-xl font-black text-orange-950 mt-1">
                {producedToday.toLocaleString("es-BO")} unid.
              </div>
              <p className="text-[11px] text-orange-800/80 mt-1">Moldeado del día en tendales</p>
              <div className="w-full bg-orange-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full"
                  style={{ width: `${Math.round((producedToday / (totalStockGlobal || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Etapa 2: Patio de Secado */}
            <div className="p-4 rounded-xl bg-yellow-50/70 border border-yellow-200 relative">
              <div className="flex items-center justify-between text-xs font-bold text-yellow-800 mb-1">
                <span>2. Patio de Secado</span>
                <span className="bg-yellow-200/80 text-yellow-900 px-1.5 py-0.5 rounded text-[10px]">
                  5-7 días
                </span>
              </div>
              <div className="text-xl font-black text-yellow-950 mt-1">
                {stockPatio.toLocaleString("es-BO")} unid.
              </div>
              <p className="text-[11px] text-yellow-800/80 mt-1">Perdiendo humedad ambiental</p>
              <div className="w-full bg-yellow-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-yellow-500 h-full rounded-full"
                  style={{ width: `${Math.round((stockPatio / (totalStockGlobal || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Etapa 3: Hornos de Quema */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 relative">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-1">
                <span>3. Hornos de Quema</span>
                <span className="bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                  1.000°C
                </span>
              </div>
              <div className="text-xl font-black text-amber-950 mt-1">
                {stockHorno.toLocaleString("es-BO")} unid.
              </div>
              <p className="text-[11px] text-amber-800/80 mt-1">Cocción y sinterizado térmico</p>
              <div className="w-full bg-amber-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${Math.round((stockHorno / (totalStockGlobal || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Etapa 4: Bodega Terminado */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 relative">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                <span>4. Bodega Terminado</span>
                <span className="bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded text-[10px]">
                  Despacho
                </span>
              </div>
              <div className="text-xl font-black text-emerald-950 mt-1">
                {stockBodega.toLocaleString("es-BO")} unid.
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-1">Ladrillo frío seleccionado</p>
              <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.round((stockBodega / (totalStockGlobal || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. GRÁFICOS CENTRALES DE PRODUCCIÓN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Vaciados Diarios por Turno (Mañana vs Tarde) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Vaciados Diarios por Turno</h3>
                <p className="text-xs text-slate-500">Comparativa de piezas producidas en Turno Mañana y Tarde</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-orange-600" />
                  <span className="text-slate-600">Mañana</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="text-slate-600">Tarde</span>
                </div>
              </div>
            </div>

            <div className="h-64">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                  <BarChart data={dailyProductionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="dia" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      formatter={(val, name) => [
                        `${Number(val).toLocaleString("es-BO")} unid.`,
                        name === "manana" ? "Turno Mañana" : "Turno Tarde",
                      ]}
                    />
                    <Bar dataKey="manana" name="manana" fill="#EA580C" radius={[4, 4, 0, 0]} stackId="turnos" />
                    <Bar dataKey="tarde" name="tarde" fill="#FBBF24" radius={[4, 4, 0, 0]} stackId="turnos" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Gráfico 2: Producción por Tipo de Ladrillo */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Producción Acumulada por Tipo de Ladrillo</h3>
                <p className="text-xs text-slate-500">Distribución de unidades vaciadas en el mes</p>
              </div>
              <Boxes className="w-5 h-5 text-orange-600" />
            </div>

            <div className="h-64">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                  <BarChart layout="vertical" data={productionChartData.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" stroke="#64748B" fontSize={11} />
                    <YAxis dataKey="name" type="category" width={120} stroke="#64748B" fontSize={11} />
                    <Tooltip
                      formatter={(val) => [`${Number(val).toLocaleString("es-BO")} unidades`, "Producido"]}
                    />
                    <Bar dataKey="cantidad" fill="#C85A32" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* 4. MONITOREO DE HORNOS & PRODUCTIVIDAD DE MOLDEADORES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Capacidad y Estado de Hornos */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Monitoreo de Hornos en Planta</h3>
                <p className="text-xs text-slate-500">Ocupación térmica y estado actual de quema</p>
              </div>
              <Flame className="w-5 h-5 text-amber-500" />
            </div>

            <div className="space-y-4">
              {hornosData.map((h) => (
                <div key={h.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{h.nombre}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {h.fase}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">
                      <strong className="text-slate-900">{h.enCoccion.toLocaleString("es-BO")}</strong> / {h.capacidad.toLocaleString("es-BO")} unid. ({h.porcentaje}%)
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        h.estadoColor === "emerald"
                          ? "bg-emerald-500"
                          : h.estadoColor === "amber"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${h.porcentaje}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Combustible: <strong className="text-slate-700">{h.combustible}</strong></span>
                    <span>Capacidad disponible: <strong>{(h.capacidad - h.enCoccion).toLocaleString("es-BO")} unid.</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Productividad de Moldeadores */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Rendimiento de Moldeadores</h3>
                  <p className="text-xs text-slate-500">Maestros operarios a destajo</p>
                </div>
                <Award className="w-5 h-5 text-amber-500" />
              </div>

              <div className="space-y-4">
                {operatorStats.map((op, idx) => (
                  <div key={op.id} className="p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{op.name}</span>
                        {idx === 0 && (
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-black">
                            LÍDER
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-orange-700">
                        {op.totalUnits.toLocaleString("es-BO")} unid.
                      </span>
                    </div>

                    <div className="w-full bg-orange-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-orange-600 h-full rounded-full"
                        style={{ width: `${Math.min(op.targetPct, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                      <span>Promedio por turno: <strong>{op.avgPerBatch.toLocaleString("es-BO")} u</strong></span>
                      <span className="font-bold text-emerald-700">{op.targetPct}% cumplimiento</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Meta diaria por operario:</span>
              <strong className="text-slate-800 font-bold">3.000 unid / turno</strong>
            </div>
          </div>
        </div>

        {/* 5. VACIADOS DIARIOS RECIENTES */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Vaciados Diarios Recientes en Planta</h3>
              <p className="text-xs text-slate-500">Registro en tiempo real de moldeo, secado y quema de ladrillos</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total lotes registrados: <strong className="text-slate-800">{batches.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-3">Folio</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Operario Moldeador</th>
                  <th className="p-3">Tipo de Ladrillo</th>
                  <th className="p-3">Turno</th>
                  <th className="p-3">Horno / Ubicación</th>
                  <th className="p-3 text-right">Cantidad Producida</th>
                  <th className="p-3 text-center">Estado de Etapa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.slice(0, 8).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-orange-700">{b.folio_number || "FOL-001"}</td>
                    <td className="p-3 font-mono text-slate-600 font-medium">{b.production_date}</td>
                    <td className="p-3 font-bold text-slate-900">{b.operator?.full_name || "Angel"}</td>
                    <td className="p-3 text-slate-700 font-medium">{b.brick_type?.name}</td>
                    <td className="p-3 capitalize text-slate-600 font-semibold">{b.shift}</td>
                    <td className="p-3 text-slate-600 font-medium">{b.horno || "Patio Principal"}</td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                      {b.quantity_produced.toLocaleString("es-BO")} unid.
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === "terminado"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : b.status === "horno"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : b.status === "secando"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            : "bg-orange-100 text-orange-800 border border-orange-200"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
