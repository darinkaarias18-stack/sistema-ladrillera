"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { useEffect, useState } from "react";
import { BarChart3, PieChart as PieIcon, TrendingUp, Award, Layers } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function ReportesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [brickTypes, setBrickTypes] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    setBatches(store.getProductionBatches());
    setBrickTypes(store.getBrickTypes());
    setStock(store.getInventoryStock());
    setEmployees(store.getEmployees());
  }, []);

  // Producción por Operario
  const operatorData = employees
    .filter((e) => e.contract_type === "destajo")
    .map((e) => {
      const qty = batches
        .filter((b) => b.operator_id === e.id)
        .reduce((sum, b) => sum + b.quantity_produced, 0);
      return {
        name: e.full_name.split(" ")[0], // primer nombre
        unidades: qty,
      };
    });

  // Distribución de Stock por Ubicación
  const COLORS = ["#F59E0B", "#F97316", "#10B981"];
  const stockPieData = [
    {
      name: "Patio Secado",
      value: stock.filter((s) => s.location === "patio_secado").reduce((sum, s) => sum + s.quantity, 0),
    },
    {
      name: "Horno Quema",
      value: stock.filter((s) => s.location === "horno").reduce((sum, s) => sum + s.quantity, 0),
    },
    {
      name: "Bodega Listo",
      value: stock.filter((s) => s.location === "bodega_terminado").reduce((sum, s) => sum + s.quantity, 0),
    },
  ];

  // Margen estimado por ladrillo
  const marginData = brickTypes.map((bt) => ({
    fullName: bt.name,
    type: bt.name.split(" ")[1] || bt.name,
    precioVenta: bt.sale_price,
    costoEst: bt.estimated_cost || 0,
    margenBruto: (bt.sale_price - (bt.estimated_cost || 0)).toFixed(2),
  }));

  return (
    <>
      <Header title="Reportes Analíticos & Métricas de Fábrica" />

      <div className="p-6 space-y-6">
        {/* Banner de resumen */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Inteligencia de Negocio & Producción</h3>
            <p className="text-xs text-slate-500">
              Analítica consolidada sobre rendimiento de moldeadores, margen de productos y rotación de inventario.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Producción por Operario a Destajo */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Rendimiento por Maestro Moldeador</h4>
                <p className="text-xs text-slate-500">Total unidades vaciadas acumuladas</p>
              </div>
              <Award className="w-5 h-5 text-amber-500" />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operatorData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="unidades" fill="#F97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Distribución de Inventario en Planta */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Distribución de Stock por Etapa</h4>
                <p className="text-xs text-slate-500">Ladrillos en secado, horno y bodega</p>
              </div>
              <PieIcon className="w-5 h-5 text-emerald-500" />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stockPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabla de Margen por Producto */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h4 className="font-bold text-slate-800 text-sm mb-3">Análisis de Margen de Ganancia por Producto</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="pb-3">Nombre del Ladrillo</th>
                  <th className="pb-3">Tipo de Ladrillo</th>
                  <th className="pb-3 text-right">Precio Venta (Bs.)</th>
                  <th className="pb-3 text-right">Costo Estimado (Bs.)</th>
                  <th className="pb-3 text-right">Margen Bruto (Bs.)</th>
                  <th className="pb-3 text-right">Margen %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marginData.map((m, idx) => {
                  const pct = ((Number(m.margenBruto) / m.precioVenta) * 100).toFixed(1);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-900">{m.fullName}</td>
                      <td className="py-3 text-slate-700">{m.type}</td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-700">
                        Bs. {m.precioVenta.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-500">
                        Bs. {m.costoEst.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-700">
                        Bs. {m.margenBruto}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-orange-600">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
