"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { CashLedgerEntry, CashCategory } from "@/types/database.types";
import { useEffect, useState } from "react";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Filter, X } from "lucide-react";

export default function CajaPage() {
  const [entries, setEntries] = useState<CashLedgerEntry[]>([]);
  const [runningBalance, setRunningBalance] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(500);
  const [type, setType] = useState<"ingreso" | "egreso">("egreso");
  const [category, setCategory] = useState<CashCategory>("combustible");

  const loadData = () => {
    setEntries(store.getCashLedger());
    setRunningBalance(store.getCashRunningBalance());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0) return;

    const finalAmount = type === "ingreso" ? amount : -amount;
    store.addCashLedgerEntry({
      movement_date: date,
      description,
      amount: finalAmount,
      category,
    });

    setIsModalOpen(false);
    setDescription("");
    loadData();
  };

  return (
    <>
      <Header title="Libro de Caja General & Flujo de Efectivo" />

      <div className="p-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-orange-400 font-semibold">
              Saldo Actual en Caja General
            </span>
            <h2 className="text-3xl font-extrabold mt-1">
              Bs. {runningBalance.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Refleja el flujo continuo de ventas, pagos de planillas, anticipos y compras operativos.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Movimiento de Caja</span>
          </button>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">Historial de Entradas y Salidas</h4>
            <span className="text-xs text-slate-500">
              Total movimientos: <strong className="text-slate-800">{entries.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Descripción del Movimiento</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5 text-right">Monto (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((item) => {
                  const isIngreso = item.amount > 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono text-slate-600">{item.movement_date}</td>
                      <td className="p-3.5 font-medium text-slate-900">{item.description}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-sm">
                        <span className={isIngreso ? "text-emerald-700" : "text-red-600"}>
                          {isIngreso ? "+" : ""} Bs. {item.amount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Movimiento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Registrar Movimiento de Caja</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo Movimiento</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-bold"
                  >
                    <option value="egreso">Egreso (Salida)</option>
                    <option value="ingreso">Ingreso (Entrada)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CashCategory)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="combustible">Combustible</option>
                  <option value="compra_insumo">Compra Insumos (Arcilla, Leña)</option>
                  <option value="mantenimiento">Mantenimiento de Maquinaria</option>
                  <option value="venta">Ingreso por Venta Especial</option>
                  <option value="anticipo">Anticipo Personal</option>
                  <option value="otro">Otro Gasto Operativo</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción / Concepto *</label>
                <input
                  type="text"
                  placeholder="Ej: Pago de leña para quemar horno B"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monto (Bs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
