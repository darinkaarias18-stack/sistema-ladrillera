"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { PayrollPeriod, PayrollDetail } from "@/types/database.types";
import { useState, useEffect } from "react";
import { DollarSign, CheckCircle2, ChevronRight } from "lucide-react";

export default function PlanillasPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [details, setDetails] = useState<PayrollDetail[]>([]);

  useEffect(() => {
    // Cargar periodos
    const loadedPeriods = store.getPayrollPeriods();
    setPeriods(loadedPeriods);
    if (loadedPeriods.length > 0) {
      setSelectedPeriodId(loadedPeriods[0].id);
    }
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      setDetails(store.getPayrollDetails(selectedPeriodId));
    }
  }, [selectedPeriodId]);

  const handlePay = (detailId: string) => {
    if (!confirm("¿Está seguro de liquidar este pago? Se enviará automáticamente el egreso a Caja General.")) return;

    store.markPayrollAsPaid(detailId);
    
    // Actualizar la vista
    setDetails(store.getPayrollDetails(selectedPeriodId));
  };

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  return (
    <>
      <Header title="Planillas y Nómina" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Selector de Periodo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="font-bold text-slate-700">Periodo de Planilla:</label>
            <select
              value={selectedPeriodId}
              onChange={e => setSelectedPeriodId(e.target.value)}
              className="p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-orange-500 min-w-64"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.start_date} a {p.end_date} ({p.frequency}) - {p.status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          
          {selectedPeriod && (
            <div className="text-sm font-bold px-4 py-2 bg-orange-100 text-orange-800 rounded-lg">
              Estado del Periodo: {selectedPeriod.status.toUpperCase()}
            </div>
          )}
        </div>

        {/* Tabla de Nómina */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="p-4">Empleado</th>
                  <th className="p-4">Total Ganado</th>
                  <th className="p-4 text-red-500">Deducciones/Adelantos</th>
                  <th className="p-4 font-bold text-slate-800">Líquido Pagable</th>
                  <th className="p-4 text-center">Estado / Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {details.map(detail => {
                  const emp = detail.employee;
                  const totalDeductions = detail.deductions + detail.mid_period_advance + detail.personal_advances;
                  
                  return (
                    <tr key={detail.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{emp?.full_name}</p>
                        <p className="text-xs text-slate-500">{emp?.position}</p>
                      </td>
                      <td className="p-4 font-medium text-emerald-600">Bs. {detail.total_earned.toFixed(2)}</td>
                      <td className="p-4 font-medium text-red-500">
                        {totalDeductions > 0 ? `- Bs. ${totalDeductions.toFixed(2)}` : 'Bs. 0.00'}
                      </td>
                      <td className="p-4 font-bold text-slate-900 text-lg">
                        Bs. {detail.net_pay.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        {detail.paid ? (
                          <div className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>PAGADO</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePay(detail.id)}
                            className="bg-slate-900 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1 mx-auto shadow-sm"
                          >
                            <DollarSign className="w-4 h-4" />
                            <span>PAGAR</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {details.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No hay registros en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
