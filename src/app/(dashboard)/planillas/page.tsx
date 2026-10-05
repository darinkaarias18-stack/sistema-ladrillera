"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { PayrollPeriod, PayrollDetail, Employee, PayFrequency } from "@/types/database.types";
import { useEffect, useState } from "react";
import { Receipt, Plus, DollarSign, CheckCircle2, User, Printer, Calendar, X, HandCoins } from "lucide-react";

export default function PlanillasPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [payrollDetails, setPayrollDetails] = useState<PayrollDetail[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modals state
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [receiptDetail, setReceiptDetail] = useState<PayrollDetail | null>(null);

  // Period Form
  const [freq, setFreq] = useState<PayFrequency>("semanal");
  const [startDate, setStartDate] = useState("2026-08-24");
  const [endDate, setEndDate] = useState("2026-08-30");

  // Advance Form
  const [advEmpId, setAdvEmpId] = useState("");
  const [advAmount, setAdvAmount] = useState<number | string>("");
  const [advReason, setAdvReason] = useState("Anticipo semanal regular");

  const loadData = () => {
    const pers = store.getPayrollPeriods();
    setPeriods(pers);
    const emps = store.getEmployees().filter((e) => e.active);
    setEmployees(emps);
    if (emps.length > 0 && !advEmpId) {
      setAdvEmpId(emps[0].id);
    }

    if (pers.length > 0) {
      const activeId = selectedPeriodId || pers[0].id;
      setSelectedPeriodId(activeId);
      const details = store.getPayrollDetails(activeId);
      setPayrollDetails(details);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriodId]);

  const activePeriod = periods.find((p) => p.id === selectedPeriodId);
  
  const getMonthName = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      // Ajuste de zona horaria simple
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      return d.toLocaleString("es-BO", { month: "long" }).toUpperCase();
    } catch {
      return "";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    const period = store.createPayrollPeriod(freq, startDate, endDate);
    setSelectedPeriodId(period.id);
    setIsPeriodModalOpen(false);
    loadData();
  };

  const handleCreateAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(advAmount);
    if (!advEmpId || isNaN(amountNum) || amountNum <= 0) return;
    store.addEmployeeAdvance({
      employee_id: advEmpId,
      period_id: selectedPeriodId || undefined,
      amount: amountNum,
      advance_date: new Date().toISOString().split("T")[0],
      reason: advReason,
    });
    setIsAdvanceModalOpen(false);
    loadData();
  };

  const getTodayDateString = () => new Date().toISOString().split("T")[0];

  const handlePayPayroll = (detailId: string) => {
    if (!confirm("¿Está seguro de pagar a este empleado?")) return;
    
    store.markPayrollAsPaid(detailId);
    
    loadData();
  };

  return (
    <>
      <Header title="Gestión de Planillas & Nómina de Pago" />

      <div className="p-6 space-y-6">
        {/* Banner con selector de periodo */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Cálculo & Liquidación de Salarios</h3>
              <p className="text-xs text-slate-500">
                Planillas automatizadas para personal a destajo (por millar) y mensual (salario básico + bonos).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <select
              value={selectedPeriodId}
              onChange={(e) => {
                setSelectedPeriodId(e.target.value);
                setPayrollDetails(store.getPayrollDetails(e.target.value));
              }}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  Planilla {p.frequency.toUpperCase()} ({formatDate(p.start_date)} al {formatDate(p.end_date)})
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsAdvanceModalOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-lg font-semibold text-xs border border-slate-300 transition"
            >
              <HandCoins className="w-4 h-4 text-orange-600" />
              <span>Registrar Anticipo</span>
            </button>

            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2 rounded-lg font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Periodo</span>
            </button>
          </div>
        </div>

        {/* Tabla de Detalle de Planilla */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">
              {activePeriod 
                ? `Detalle de Trabajadores del Periodo ${getMonthName(activePeriod.start_date)} (${formatDate(activePeriod.start_date)} al ${formatDate(activePeriod.end_date)})`
                : "Detalle de Trabajadores"}
            </h4>
            <span className="text-xs text-slate-500">
              Registros: <strong className="text-slate-800">{payrollDetails.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3.5">Empleado</th>
                  <th className="p-3.5 text-right">Haber Básico</th>
                  <th className="p-3.5 text-right">Bono Producción (Destajo)</th>
                  <th className="p-3.5 text-right">Otros Bonos</th>
                  <th className="p-3.5 text-right">Total Ganado</th>
                  <th className="p-3.5 text-right">Anticipos</th>
                  <th className="p-3.5 text-right">Descuentos</th>
                  <th className="p-3.5 text-right">Líquido Pagable</th>
                  <th className="p-3.5 text-center">Estado / Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollDetails.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      No hay empleados incluidos en este periodo.
                    </td>
                  </tr>
                ) : (
                  payrollDetails.map((pd) => (
                    <tr key={pd.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">
                        {pd.employee?.full_name}
                        <span className="block text-[10px] font-normal text-slate-500">
                          {pd.employee?.position} ({pd.employee?.contract_type})
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">Bs. {pd.base_amount.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-700">
                        Bs. {pd.production_bonus.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        Bs. {(pd.antiquity_bonus + pd.frontier_bonus).toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        Bs. {pd.total_earned.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-orange-600">
                        {pd.mid_period_advance + pd.personal_advances > 0 
                          ? `- Bs. ${(pd.mid_period_advance + pd.personal_advances).toFixed(2)}` 
                          : "Bs. 0.00"}
                      </td>
                      <td className="p-3.5 text-right font-mono text-red-600">
                        {pd.deductions > 0 
                          ? `- Bs. ${pd.deductions.toFixed(2)}` 
                          : "Bs. 0.00"}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-800 text-sm">
                        Bs. {pd.net_pay.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {pd.paid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pagado</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePayPayroll(pd.id)}
                              className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold rounded-md shadow-xs transition"
                            >
                              Pagar
                            </button>
                          )}

                          <button
                            onClick={() => setReceiptDetail(pd)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-200"
                            title="Ver Recibo"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Generar Nuevo Periodo */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Generar Nuevo Periodo de Planilla</h3>
              <button onClick={() => setIsPeriodModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Frecuencia de Pago</label>
                <select
                  value={freq}
                  onChange={(e) => setFreq(e.target.value as PayFrequency)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="semanal">Semanal (Operarios a Destajo)</option>
                  <option value="mensual">Mensual (Personal Fijo)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha Inicio *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha Fin *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                El sistema incluirá automáticamente a todos los empleados activos de la frecuencia seleccionada y calculará sus vaciados producidos.
              </p>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  Generar Periodo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Anticipo */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Entregar Anticipo a Empleado</h3>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdvance} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Empleado Beneficiario *</label>
                <select
                  value={advEmpId}
                  onChange={(e) => setAdvEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monto del Anticipo (Bs.) *</label>
                <input
                  type="number"
                  value={advAmount}
                  onChange={(e) => setAdvAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-orange-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo o Justificación</label>
                <input
                  type="text"
                  value={advReason}
                  onChange={(e) => setAdvReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  Registrar & Descontar en Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recibo de Pago Individual */}
      {receiptDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:pt-12 print:items-start print:bg-white">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden print:shadow-none print:border-none print:w-full">
            <div className="p-6 space-y-4 text-xs font-mono print:p-0">
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="font-bold text-slate-900 text-base font-sans uppercase">RECIBO DE PAGO DE SALARIOS</h2>
                <p className="text-slate-500 text-[11px]">INCEGUA S.R.L.</p>
                {activePeriod && (
                  <p className="text-slate-700 font-bold mt-2 font-sans text-[11px]">
                    Periodo: {getMonthName(activePeriod.start_date)} ({formatDate(activePeriod.start_date)} al {formatDate(activePeriod.end_date)})
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Trabajador: <strong className="text-slate-900">{receiptDetail.employee?.full_name}</strong></div>
                <div>CI: <strong className="text-slate-900">{receiptDetail.employee?.document_id}</strong></div>
                <div>Cargo: <span>{receiptDetail.employee?.position}</span></div>
                <div>Modalidad: <span className="uppercase">{receiptDetail.employee?.contract_type}</span></div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 space-y-1 bg-slate-50 text-[11px]">
                <div className="flex justify-between">
                  <span>Haber Básico:</span>
                  <span>Bs. {receiptDetail.base_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-800">
                  <span>Bono Producción (Destajo):</span>
                  <span>Bs. {receiptDetail.production_bonus.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bono Antigüedad + Frontera:</span>
                  <span>Bs. {(receiptDetail.antiquity_bonus + receiptDetail.frontier_bonus).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1 font-bold">
                  <span>TOTAL GANADO:</span>
                  <span>Bs. {receiptDetail.total_earned.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Descuentos / Anticipos:</span>
                  <span>- Bs. {(receiptDetail.mid_period_advance + receiptDetail.personal_advances).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1 font-bold text-sm text-emerald-900 font-sans">
                  <span>LÍQUIDO PAGABLE:</span>
                  <span>Bs. {receiptDetail.net_pay.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-8 flex justify-around text-center text-[10px]">
                <div className="border-t border-slate-400 w-36 pt-1">Firma Empleador</div>
                <div className="border-t border-slate-400 w-36 pt-1">Firma Trabajador (Conforme)</div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 print:hidden">
              <button
                onClick={() => setReceiptDetail(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition"
              >
                Cerrar Recibo
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-xs shadow-sm transition flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
