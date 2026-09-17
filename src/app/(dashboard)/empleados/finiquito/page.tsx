"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { Employee, SettlementReason, EmployeeSettlement } from "@/types/database.types";
import { useState, useEffect, useMemo } from "react";
import { differenceInMonths, parseISO, differenceInYears, differenceInDays } from "date-fns";
import { getTodayDateString } from "@/lib/dates";
import { Calculator, Save, AlertCircle, FileText, Printer, X } from "lucide-react";

export default function FiniquitoPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [reason, setReason] = useState<SettlementReason>("renuncia");
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [settlements, setSettlements] = useState<EmployeeSettlement[]>([]);
  const [printSettlement, setPrintSettlement] = useState<EmployeeSettlement | null>(null);

  useEffect(() => {
    setEmployees(store.getEmployees().filter(e => e.active));
    setSettlements(store.getSettlements());
  }, []);

  const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);

  const calculations = useMemo(() => {
    if (!selectedEmployee) return null;

    const baseSalary = selectedEmployee.base_salary;
    const hireDate = parseISO(selectedEmployee.hire_date);
    const today = new Date();
    
    const totalMonths = differenceInMonths(today, hireDate);
    const years = differenceInYears(today, hireDate);
    const months = totalMonths % 12;
    // Rough estimation of remaining days
    const days = differenceInDays(today, new Date(today.getFullYear(), today.getMonth(), 1));
    
    // Simplistic Bolivian calculation (Just a mock for now, 1 salary per year of service for severance)
    let severancePay = 0;
    if (reason === 'despido' || (reason === 'renuncia' && years >= 0)) {
      // Indemnización: 1 sueldo por año. Plus duodécimas.
      severancePay = (baseSalary * years) + ((baseSalary / 12) * months) + ((baseSalary / 360) * days);
    }
    
    // Aguinaldo proporcional (Navidad)
    const currentYearMonths = today.getMonth() + 1; // Jan is 0
    const christmasBonus = (baseSalary / 12) * currentYearMonths;

    // Vacaciones (15 días por año aprox, digamos que se le debe 1 año de vacaciones si no las tomó)
    const vacationPay = baseSalary / 2; // Media docena (15 días)

    const totalAmount = severancePay + christmasBonus + vacationPay - otherDeductions;

    return {
      timeString: `${years} años, ${months} meses, ${days} días`,
      totalMonths,
      baseSalary,
      severancePay,
      vacationPay,
      christmasBonus,
      totalAmount
    };
  }, [selectedEmployee, reason, otherDeductions]);

  const handleSave = () => {
    if (!selectedEmployee || !calculations) return;

    if (!confirm(`¿Está seguro de procesar el finiquito para ${selectedEmployee.full_name}? El empleado quedará inactivo en el sistema.`)) {
      return;
    }

    const newSettlement = store.addSettlement({
      employee_id: selectedEmployee.id,
      settlement_date: getTodayDateString(),
      reason,
      base_salary: calculations.baseSalary,
      time_worked_months: calculations.totalMonths,
      severance_pay: calculations.severancePay,
      vacation_pay: calculations.vacationPay,
      christmas_bonus_pay: calculations.christmasBonus,
      other_deductions: otherDeductions,
      total_amount: calculations.totalAmount,
      notes
    });

    setSettlements(prev => [...prev, newSettlement]);
    setEmployees(store.getEmployees().filter(e => e.active));
    setSelectedEmpId("");
    setOtherDeductions(0);
    setNotes("");
    
    // Show preview modal
    setPrintSettlement(newSettlement);
  };

  const handlePrint = (settlement: EmployeeSettlement) => {
    setPrintSettlement(settlement);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <>
      <div className="print:hidden">
        <Header title="Cálculo de Finiquito" />

        <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel Izquierdo: Formulario de Selección */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-orange-500" />
                <span>Datos del Finiquito</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Empleado a Retirar
                  </label>
                  <select
                    value={selectedEmpId}
                    onChange={e => setSelectedEmpId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-slate-50"
                  >
                    <option value="">Seleccione un empleado...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.position})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEmployee && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Motivo de Salida
                      </label>
                      <select
                        value={reason}
                        onChange={e => setReason(e.target.value as SettlementReason)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-slate-50"
                      >
                        <option value="renuncia">Renuncia Voluntaria</option>
                        <option value="despido">Despido Injustificado</option>
                        <option value="fin_contrato">Fin de Contrato</option>
                        <option value="otro">Otro Motivo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Otras Deducciones (Bs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={otherDeductions}
                        onChange={e => setOtherDeductions(Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Notas u Observaciones
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-slate-50 resize-none h-24"
                        placeholder="Detalles sobre el retiro..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Panel Derecho: Previsualización de Cálculos */}
          <div className="lg:col-span-2">
            {selectedEmployee && calculations ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{selectedEmployee.full_name}</h3>
                    <p className="text-slate-400 text-sm mt-1">CI: {selectedEmployee.document_id} • Cargo: {selectedEmployee.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Sueldo Base</p>
                    <p className="text-2xl font-bold text-emerald-400">Bs. {calculations.baseSalary.toFixed(2)}</p>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50">
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-500 uppercase">Tiempo de Servicio</p>
                      <p className="text-slate-800 font-semibold mt-1">{calculations.timeString}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Total Meses: {calculations.totalMonths}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Indemnización (Desahucio/Años):</span>
                        <span className="font-semibold">Bs. {calculations.severancePay.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Aguinaldo Proporcional:</span>
                        <span className="font-semibold">Bs. {calculations.christmasBonus.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Vacaciones No Gozadas:</span>
                        <span className="font-semibold">Bs. {calculations.vacationPay.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-slate-200 my-2"></div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Deducciones Pendientes:</span>
                        <span className="font-semibold text-red-500">- Bs. {otherDeductions.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 border-t border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase">Total a Pagar (Líquido)</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">Bs. {calculations.totalAmount.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={handleSave}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-orange-600/20 transition-all flex items-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>Procesar y Previsualizar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <FileText className="w-16 h-16 mb-4 text-slate-300" />
                <p className="font-semibold text-slate-600">Ningún empleado seleccionado</p>
                <p className="text-sm mt-2 max-w-sm">Selecciona un empleado de la lista para previsualizar los cálculos de su finiquito y liquidación.</p>
              </div>
            )}
          </div>
        </div>

        {/* Historial de Finiquitos Recientes */}
        {settlements.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">Finiquitos Procesados (Historial)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">CI</th>
                    <th className="p-4">Motivo</th>
                    <th className="p-4 text-right">Total Pagado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlements.map(set => (
                    <tr key={set.id}>
                      <td className="p-4 font-medium text-slate-700">{set.settlement_date}</td>
                      <td className="p-4 font-mono text-slate-500">
                        {store.getEmployees().find(e => e.id === set.employee_id)?.document_id || set.employee_id}
                      </td>
                      <td className="p-4 uppercase text-[10px] font-bold text-slate-600">{set.reason}</td>
                      <td className="p-4 text-right font-bold text-slate-800">Bs. {set.total_amount.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handlePrint(set)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Imprimir Recibo"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Modal de Previsualización para Impresión */}
      {printSettlement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
          <div className="bg-white text-black w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
            
            {/* Cabecera del Modal (oculta al imprimir) */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print:hidden rounded-t-2xl flex-shrink-0">
              <h2 className="font-bold text-slate-800 text-lg">Vista Previa del Documento</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => window.print()}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir PDF</span>
                </button>
                <button
                  onClick={() => setPrintSettlement(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Contenido del Recibo */}
            <div className="p-12 print:p-0 bg-white relative overflow-y-auto flex-1 rounded-b-2xl print:overflow-visible print:rounded-none">
              {/* Decorative Header Banner */}
              <div className="absolute top-0 left-0 w-full h-3 bg-orange-600 print:bg-black"></div>

              <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-slate-200 print:border-black mt-4">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">INCEGUA S.R.L.</h1>
                  <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wide">Fábrica de Cerámica y Ladrillos</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-slate-800">DOCUMENTO DE FINIQUITO</h2>
                  <p className="text-sm text-slate-500 mt-1">Fecha: <span className="font-semibold text-slate-700">{printSettlement.settlement_date}</span></p>
                  <p className="text-sm text-slate-500">Folio: <span className="font-semibold text-slate-700 font-mono">FIN-{printSettlement.id.slice(-6).toUpperCase()}</span></p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 print:bg-transparent p-6 rounded-xl border border-slate-100 print:border-none print:p-0">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Datos del Trabajador</p>
                  <p className="text-lg font-bold text-slate-800">ID: {printSettlement.employee_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Detalles del Retiro</p>
                  <p className="font-medium text-slate-700">Motivo: <span className="font-bold uppercase text-slate-900">{printSettlement.reason}</span></p>
                  <p className="font-medium text-slate-700">Tiempo Computable: <span className="font-bold text-slate-900">{printSettlement.time_worked_months} Meses</span></p>
                </div>
              </div>

              <div className="mb-12">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-orange-500 pl-3 print:border-black">Liquidación de Beneficios Sociales</h3>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-y-2 border-slate-300 print:border-black bg-slate-50 print:bg-transparent">
                      <th className="py-3 px-4 font-bold text-sm text-slate-700 uppercase tracking-wider">Concepto</th>
                      <th className="py-3 px-4 font-bold text-sm text-slate-700 uppercase tracking-wider text-right w-48">Monto (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 print:divide-black">
                    <tr>
                      <td className="py-4 px-4 text-slate-700">Indemnización por Años de Servicio</td>
                      <td className="py-4 px-4 text-right font-medium text-slate-900">{printSettlement.severance_pay.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-slate-700">Aguinaldo Proporcional (Duodécimas)</td>
                      <td className="py-4 px-4 text-right font-medium text-slate-900">{printSettlement.christmas_bonus_pay.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-slate-700">Vacaciones No Gozadas</td>
                      <td className="py-4 px-4 text-right font-medium text-slate-900">{printSettlement.vacation_pay.toFixed(2)}</td>
                    </tr>
                    {printSettlement.other_deductions > 0 && (
                      <tr className="bg-red-50/50 print:bg-transparent">
                        <td className="py-4 px-4 text-red-600 font-medium flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>Otras Deducciones / Préstamos</span>
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-red-600">- {printSettlement.other_deductions.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-800 print:border-black bg-slate-100 print:bg-transparent">
                      <td className="py-5 px-4 font-black text-lg text-slate-800 uppercase text-right tracking-widest">Total Líquido a Pagar</td>
                      <td className="py-5 px-4 text-right font-black text-xl text-slate-900 border-l border-slate-300 print:border-black">
                        Bs. {printSettlement.total_amount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {printSettlement.notes && (
                <div className="mb-12 p-4 bg-slate-50 print:bg-transparent rounded-lg border border-slate-200 print:border-none">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Observaciones Especiales</p>
                  <p className="text-sm text-slate-700 italic leading-relaxed">{printSettlement.notes}</p>
                </div>
              )}

              <div className="mt-32 grid grid-cols-2 gap-16 text-center">
                <div className="px-8">
                  <div className="border-t-2 border-slate-300 print:border-black pt-3">
                    <p className="font-bold text-sm text-slate-800 uppercase">INCEGUA S.R.L.</p>
                    <p className="text-xs text-slate-500 mt-1">Firma y Sello Empresa</p>
                  </div>
                </div>
                <div className="px-8">
                  <div className="border-t-2 border-slate-300 print:border-black pt-3">
                    <p className="font-bold text-sm text-slate-800 uppercase">Conformidad del Empleado</p>
                    <p className="text-xs text-slate-500 mt-1">C.I.: _____________________</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
