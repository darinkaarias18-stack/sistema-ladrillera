"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { useEffect, useState, useMemo } from "react";
import {
  Factory,
  Flame,
  Layers,
  Boxes,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  SunMedium,
  Zap,
  ThermometerSun,
  ShieldCheck,
  ChevronRight,
  PackageCheck,
  Filter
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function DashboardPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [brickTypes, setBrickTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    setBatches(store.getProductionBatches());
    setStock(store.getInventoryStock());
    setBrickTypes(store.getBrickTypes());
    setEmployees(store.getEmployees());
    setSales(store.getSales());
  }, []);

  // 1. MÉTRICAS CLAVE DE PRODUCCIÓN
  const totalProduced = useMemo(() => {
    return batches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
  }, [batches]);

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

  const totalStockGlobal = stockPatio + stockHorno + stockBodega;

  // Lotes frescos verde (del día de hoy)
  const todayDateStr = "2026-10-17";
  const producedToday = useMemo(() => {
    return batches
      .filter((b) => b.production_date === todayDateStr)
      .reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
  }, [batches]);

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
              <span className="text-2xl font-black text-white">{producedToday.toLocaleString()}</span>
              <span className="text-[10px] text-slate-300 block">unid. moldeadas</span>
            </div>
            <div className="w-px h-10 bg-white/20 mx-1" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">Stock Total Planta</span>
              <span className="text-2xl font-black text-white">{totalStockGlobal.toLocaleString()}</span>
              <span className="text-[10px] text-slate-300 block">en proceso y listo</span>
            </div>
          </div>
        </div>

        {/* 1. TOP CARDS: 4 INDICADORES CLAVE DE PRODUCCIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Producción Total Vaciada */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-orange-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Producción del Mes
              </span>
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Factory className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {totalProduced.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div className="mt-2.5 flex items-center text-xs text-emerald-600 font-semibold gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.5% vs meta mensual</span>
            </div>
          </div>

          {/* KPI 2: Hornos en Quema */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                En Quema (Hornos)
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-amber-900 tracking-tight">
                {stockHorno.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div className="mt-2.5 flex items-center text-xs text-amber-700 font-semibold gap-1">
              <ThermometerSun className="w-3.5 h-3.5" />
              <span>3 hornos en cocción activa</span>
            </div>
          </div>

          {/* KPI 3: Patio de Secado */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-yellow-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Patio de Secado
              </span>
              <div className="w-9 h-9 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center">
                <SunMedium className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {stockPatio.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div className="mt-2.5 flex items-center text-xs text-slate-500 font-medium gap-1">
              <Clock className="w-3.5 h-3.5 text-yellow-600" />
              <span>Ladrillo verde en deshidratación</span>
            </div>
          </div>

          {/* KPI 4: Stock Listo Bodega */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Bodega Terminado
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-emerald-700 tracking-tight">
                {stockBodega.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div className="mt-2.5 flex items-center text-xs text-emerald-600 font-semibold gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Listo para despacho inmediato</span>
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
              Capacidad Total: <strong>{totalStockGlobal.toLocaleString()} unid.</strong>
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
                {producedToday.toLocaleString()} unid.
              </div>
              <p className="text-[11px] text-orange-800/80 mt-1">Moldeado del día en tendales</p>
              <div className="w-full bg-orange-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: "100%" }} />
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
                {stockPatio.toLocaleString()} unid.
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
                {stockHorno.toLocaleString()} unid.
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
                {stockBodega.toLocaleString()} unid.
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyProductionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="dia" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${Number(val).toLocaleString()} unid.`,
                      name === "manana" ? "Turno Mañana" : "Turno Tarde",
                    ]}
                  />
                  <Bar dataKey="manana" name="manana" fill="#EA580C" radius={[4, 4, 0, 0]} stackId="turnos" />
                  <Bar dataKey="tarde" name="tarde" fill="#FBBF24" radius={[4, 4, 0, 0]} stackId="turnos" />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={productionChartData.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" stroke="#64748B" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={120} stroke="#64748B" fontSize={11} />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} unidades`, "Producido"]}
                  />
                  <Bar dataKey="cantidad" fill="#C85A32" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
                    <div className="text-xs text-slate-600 font-semibold" suppressHydrationWarning>
                      <strong className="text-slate-900">{h.enCoccion.toLocaleString()}</strong> / {h.capacidad.toLocaleString()} unid. ({h.porcentaje}%)
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
                    <span>Capacidad disponible: <strong>{(h.capacidad - h.enCoccion).toLocaleString()} unid.</strong></span>
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
                        {op.totalUnits.toLocaleString()} unid.
                      </span>
                    </div>

                    <div className="w-full bg-orange-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-orange-600 h-full rounded-full"
                        style={{ width: `${Math.min(op.targetPct, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                      <span>Promedio por turno: <strong>{op.avgPerBatch.toLocaleString()} u</strong></span>
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
                      {b.quantity_produced.toLocaleString()} unid.
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
