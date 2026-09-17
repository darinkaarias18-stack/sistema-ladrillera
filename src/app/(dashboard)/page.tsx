"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { useEffect, useState } from "react";
import { Factory, DollarSign, Boxes, Wallet, ArrowUpRight, TrendingUp, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function DashboardPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [brickTypes, setBrickTypes] = useState<any[]>([]);

  useEffect(() => {
    setBatches(store.getProductionBatches());
    setSales(store.getSales());
    setStock(store.getInventoryStock());
    setCashBalance(store.getCashRunningBalance());
    setBrickTypes(store.getBrickTypes());
  }, []);

  // Métricas
  const totalProduced = batches.reduce((sum, b) => sum + b.quantity_produced, 0);
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalStockBodega = stock
    .filter((s) => s.location === "bodega_terminado")
    .reduce((sum, s) => sum + s.quantity, 0);

  // Datos para gráfico de producción por tipo de ladrillo
  const productionChartData = brickTypes.map((bt) => {
    const qty = batches
      .filter((b) => b.brick_type_id === bt.id)
      .reduce((sum, b) => sum + b.quantity_produced, 0);
    return {
      name: bt.name.split(" ")[1] || bt.name,
      cantidad: qty,
    };
  });

  // Datos mock de tendencia semanal
  const cashTrendData = [
    { dia: "Lun", ingresos: 4500, egresos: 1200 },
    { dia: "Mar", ingresos: 9000, egresos: 150 },
    { dia: "Mié", ingresos: 2100, egresos: 450 },
    { dia: "Jue", ingresos: 4200, egresos: 0 },
    { dia: "Vie", ingresos: 6800, egresos: 2090 },
    { dia: "Sáb", ingresos: 3100, egresos: 800 },
  ];

  return (
    <>
      <Header title="Dashboard General de Operaciones" />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Producción Total */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Producción del Mes
              </span>
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Factory className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {totalProduced.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1">unidades</span>
            </div>
            <div className="mt-2 flex items-center text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>+12.4% vs mes anterior</span>
            </div>
          </div>

          {/* Card 2: Ventas Totales */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ventas Acumuladas
              </span>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                Bs. {totalSalesAmount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-2 flex items-center text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              <span>{sales.length} transacciones registradas</span>
            </div>
          </div>

          {/* Card 3: Stock en Bodega */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Stock Listo (Bodega)
              </span>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {totalStockBodega.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1">unidades</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Disponible para despacho inmediato
            </div>
          </div>

          {/* Card 4: Saldo en Caja */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Saldo Caja General
              </span>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl font-bold ${cashBalance >= 0 ? "text-slate-900" : "text-red-600"}`}>
                Bs. {cashBalance.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Saldo Neto de Operaciones
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Producción por Ladrillo */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800 text-base">Producción por Tipo de Ladrillo</h3>
              <p className="text-xs text-slate-500">Unidades producidas en el periodo actual</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      borderRadius: "8px",
                      color: "#FFF",
                      border: "none",
                    }}
                  />
                  <Bar dataKey="cantidad" fill="#C85A32" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Flujo de Caja */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800 text-base">Flujo de Caja Semanal (Ingresos vs Egresos)</h3>
              <p className="text-xs text-slate-500">Comportamiento diario de la caja general</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="dia" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="ingresos" stroke="#10B981" fill="#D1FAE5" />
                  <Area type="monotone" dataKey="egresos" stroke="#EF4444" fill="#FEE2E2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Resumen de Producción Reciente & Alerta Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Batches Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Vaciados Diarios Recientes</h3>
                <p className="text-xs text-slate-500">Últimos registros de moldeo y quema</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                    <th className="pb-3">Fecha</th>
                    <th className="pb-3">Operario</th>
                    <th className="pb-3">Tipo Ladrillo</th>
                    <th className="pb-3 text-right">Cantidad</th>
                    <th className="pb-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-700">{b.production_date}</td>
                      <td className="py-3 font-semibold text-slate-900">{b.operator?.full_name || "Angel"}</td>
                      <td className="py-3 text-slate-600">{b.brick_type?.name}</td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {b.quantity_produced.toLocaleString()}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            b.status === "terminado"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "horno"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
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

          {/* Stock por Ubicación */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-base">Estado del Stock</h3>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-xs font-semibold text-amber-800 uppercase block">
                  Patio de Secado
                </span>
                <span className="text-xl font-bold text-amber-950">
                  {stock
                    .filter((s) => s.location === "patio_secado")
                    .reduce((sum, s) => sum + s.quantity, 0)
                    .toLocaleString()}{" "}
                  unid.
                </span>
                <p className="text-[11px] text-amber-700 mt-0.5">Ladrillo verde en proceso</p>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-xs font-semibold text-orange-800 uppercase block">
                  Horno de Quema
                </span>
                <span className="text-xl font-bold text-orange-950">
                  {stock
                    .filter((s) => s.location === "horno")
                    .reduce((sum, s) => sum + s.quantity, 0)
                    .toLocaleString()}{" "}
                  unid.
                </span>
                <p className="text-[11px] text-orange-700 mt-0.5">En proceso de cocción</p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800 uppercase block">
                  Bodega Terminado
                </span>
                <span className="text-xl font-bold text-emerald-950">
                  {totalStockBodega.toLocaleString()} unid.
                </span>
                <p className="text-[11px] text-emerald-700 mt-0.5">Listo para carga y despacho</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
