"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { PayrollPeriod, PayrollDetail, Employee, PayFrequency } from "@/types/database.types";
import { useEffect, useState, useMemo } from "react";
import { 
  Receipt, 
  Plus, 
  Printer, 
  X, 
  HandCoins, 
  Edit3, 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  Save, 
  Calendar,
  UserPlus,
  Trash2,
  Calculator,
  Lock,
  Info
} from "lucide-react";

export default function PlanillasPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [payrollDetails, setPayrollDetails] = useState<PayrollDetail[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modals state
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isRegisterEmpModalOpen, setIsRegisterEmpModalOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<PayrollDetail | null>(null);
  const [receiptDetail, setReceiptDetail] = useState<PayrollDetail | null>(null);

  // Period Form
  const [freq, setFreq] = useState<PayFrequency>("quincenal");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2026-09-15");

  // Advance Form
  const [advEmpId, setAdvEmpId] = useState("");
  const [advAmount, setAdvAmount] = useState<number | string>("");
  const [advReason, setAdvReason] = useState("Anticipo de sueldo regular");

  // Register Employee to Payroll Form State
  const [regEmpId, setRegEmpId] = useState("");
  const [regBaseSalary, setRegBaseSalary] = useState<number | string>(2750);
  const [regProdBonus, setRegProdBonus] = useState<number | string>(0);
  const [regDeductions, setRegDeductions] = useState<number | string>(0);
  const [regAdvances, setRegAdvances] = useState<number | string>(0);

  // Edit Row Form State: Haber Básico, Bono de Producción, Descuentos y Anticipos editables
  const [editForm, setEditForm] = useState<{
    base_amount: number | string;
    production_bonus: number | string;
    deductions: number | string;
    personal_advances: number | string;
  }>({
    base_amount: 2750,
    production_bonus: 0,
    deductions: 0,
    personal_advances: 0,
  });

  const loadData = () => {
    const pers = store.getPayrollPeriods();
    setPeriods(pers);
    const emps = store.getEmployees().filter((e) => e.active);
    setEmployees(emps);
    if (emps.length > 0 && !advEmpId) {
      setAdvEmpId(emps[0].id);
    }
    if (emps.length > 0 && !regEmpId) {
      setRegEmpId(emps[0].id);
      setRegBaseSalary(emps[0].base_salary || 2750);
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

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("erp_payroll_updated", handleUpdate);
    window.addEventListener("erp_employees_updated", handleUpdate);
    return () => {
      window.removeEventListener("erp_payroll_updated", handleUpdate);
      window.removeEventListener("erp_employees_updated", handleUpdate);
    };
  }, [selectedPeriodId]);

  const activePeriod = periods.find((p) => p.id === selectedPeriodId);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    if (dateStr.includes("/")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
    return dateStr;
  };

  const computeYears = (dateStr?: string) => {
    if (!dateStr) return 0;
    try {
      const d = new Date(dateStr);
      const now = new Date();
      let years = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
        years--;
      }
      return Math.max(0, years);
    } catch {
      return 0;
    }
  };

  const getMonthName = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      return d.toLocaleString("es-BO", { month: "long" }).toUpperCase();
    } catch {
      return "";
    }
  };

  const formatMoney = (val?: number) => {
    if (val === undefined || val === null || val === 0) return "-";
    return val.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Totals calculations matching exactly Excel
  const totals = useMemo(() => {
    return payrollDetails.reduce(
      (acc, pd) => {
        const base = pd.base_amount || 0;
        const ant = pd.antiquity_bonus || 0;
        const front = pd.frontier_bonus || 0;
        const prod = pd.production_bonus || 0;
        const tot = pd.total_earned || 0;
        const desc = pd.deductions || 0;
        const quincena = pd.quincena_amount !== undefined ? pd.quincena_amount : (tot * 0.5);
        const antAdv = pd.personal_advances || 0;
        const liq = pd.net_pay || 0;

        return {
          base: acc.base + base,
          antiquity: acc.antiquity + ant,
          frontier: acc.frontier + front,
          production: acc.production + prod,
          totalEarned: acc.totalEarned + tot,
          deductions: acc.deductions + desc,
          quincena: acc.quincena + quincena,
          advances: acc.advances + antAdv,
          netPay: acc.netPay + liq,
        };
      },
      {
        base: 0,
        antiquity: 0,
        frontier: 0,
        production: 0,
        totalEarned: 0,
        deductions: 0,
        quincena: 0,
        advances: 0,
        netPay: 0,
      }
    );
  }, [payrollDetails]);

  // Edición inline directa en la tabla para Haber Básico, Bono de Producción, Descuentos y Anticipos
  const handleInlineChange = (
    detailId: string, 
    field: "base_amount" | "production_bonus" | "deductions" | "personal_advances", 
    rawValue: string
  ) => {
    const num = rawValue === "" ? 0 : parseFloat(rawValue);
    const validNum = isNaN(num) ? 0 : num;

    setPayrollDetails((prev) =>
      prev.map((pd) => {
        if (pd.id !== detailId) return pd;

        const newBase = field === "base_amount" ? validNum : (pd.base_amount || 0);
        const newProd = field === "production_bonus" ? validNum : (pd.production_bonus || 0);
        const newDesc = field === "deductions" ? validNum : (pd.deductions || 0);
        const newAdv = field === "personal_advances" ? validNum : (pd.personal_advances || 0);

        // Recalcular antigüedad y frontera en base al Haber Básico
        const emp = pd.employee;
        const years = computeYears(emp?.hire_date);
        const antPct = emp?.antiquity_bonus_pct !== undefined ? emp.antiquity_bonus_pct : (years >= 2 ? 5 : 0);
        const newAnt = Number(((newBase * antPct) / 100).toFixed(2));
        const newFront = Number((newBase * 0.20).toFixed(2));

        // Total Ganado descontando deducciones
        const tot = Number((newBase + newAnt + newFront + newProd - newDesc).toFixed(2));
        const quincena = Number((tot * 0.50).toFixed(2));
        const net = Math.max(0, Number((quincena - newAdv).toFixed(2)));

        const updated = {
          ...pd,
          base_amount: newBase,
          antiquity_bonus: newAnt,
          frontier_bonus: newFront,
          production_bonus: newProd,
          deductions: newDesc,
          personal_advances: newAdv,
          total_earned: tot,
          quincena_amount: quincena,
          net_pay: net,
        };

        store.updatePayrollDetail(detailId, {
          base_amount: newBase,
          antiquity_bonus: newAnt,
          frontier_bonus: newFront,
          production_bonus: newProd,
          deductions: newDesc,
          personal_advances: newAdv,
          total_earned: tot,
          quincena_amount: quincena,
          net_pay: net,
        });

        return updated;
      })
    );
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
    setAdvAmount("");
    setIsAdvanceModalOpen(false);
    loadData();
  };

  const openRegisterEmpModal = () => {
    const emps = store.getEmployees().filter((e) => e.active);
    if (emps.length > 0) {
      const first = emps[0];
      setRegEmpId(first.id);
      setRegBaseSalary(first.base_salary || 2750);
      setRegProdBonus(store.calculateEmployeeProductionBonus(first.id));
      setRegDeductions(0);
      setRegAdvances(0);
    }
    setIsRegisterEmpModalOpen(true);
  };

  // Cálculo en vivo para el modal de registrar empleado
  const selectedEmpForReg = employees.find((e) => e.id === regEmpId);
  const regBaseNum = Number(regBaseSalary) || 0;
  const regYears = computeYears(selectedEmpForReg?.hire_date);
  const regAntiquityPct = selectedEmpForReg?.antiquity_bonus_pct !== undefined 
    ? selectedEmpForReg.antiquity_bonus_pct 
    : (regYears >= 2 ? 5 : 0);
  const regAntiquityBonus = Number(((regBaseNum * regAntiquityPct) / 100).toFixed(2));
  const regFrontierBonus = Number((regBaseNum * 0.20).toFixed(2));
  const regProdNum = Number(regProdBonus) || 0;
  const regDescNum = Number(regDeductions) || 0;
  const regTotalEarned = Number((regBaseNum + regAntiquityBonus + regFrontierBonus + regProdNum - regDescNum).toFixed(2));
  const regQuincena = Number((regTotalEarned * 0.50).toFixed(2));
  const regAdvNum = Number(regAdvances) || 0;
  const regNetPay = Math.max(0, Number((regQuincena - regAdvNum).toFixed(2)));

  const handleSaveRegisterEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForReg || !selectedPeriodId) return;

    store.addEmployeeToPayroll({
      period_id: selectedPeriodId,
      employee_id: selectedEmpForReg.id,
      base_amount: regBaseNum,
      antiquity_bonus: regAntiquityBonus,
      frontier_bonus: regFrontierBonus,
      production_bonus: regProdNum,
      total_earned: regTotalEarned,
      deductions: regDescNum,
      quincena_amount: regQuincena,
      personal_advances: regAdvNum,
      net_pay: regNetPay,
    });

    setIsRegisterEmpModalOpen(false);
    loadData();
  };

  // Abrir modal de edición para una fila: Haber Básico, Bono de Producción, Descuentos y Anticipos
  const openEditRow = (pd: PayrollDetail) => {
    setEditingDetail(pd);
    setEditForm({
      base_amount: pd.base_amount || 0,
      production_bonus: pd.production_bonus || 0,
      deductions: pd.deductions || 0,
      personal_advances: pd.personal_advances || 0,
    });
  };

  // Cálculos en vivo para el modal de edición de fila
  const editYears = computeYears(editingDetail?.employee?.hire_date);
  const editAntiquityPct = editingDetail?.employee?.antiquity_bonus_pct !== undefined 
    ? editingDetail.employee.antiquity_bonus_pct 
    : (editYears >= 2 ? 5 : 0);
  const editBaseNum = Number(editForm.base_amount) || 0;
  const editAntiquityBonus = Number(((editBaseNum * editAntiquityPct) / 100).toFixed(2));
  const editFrontierBonus = Number((editBaseNum * 0.20).toFixed(2));
  const editProdBonus = Number(editForm.production_bonus) || 0;
  const editDescNum = Number(editForm.deductions) || 0;
  const editTotalEarned = Number((editBaseNum + editAntiquityBonus + editFrontierBonus + editProdBonus - editDescNum).toFixed(2));
  const editQuincena = Number((editTotalEarned * 0.50).toFixed(2));
  const editAdvNum = Number(editForm.personal_advances) || 0;
  const editNetPay = Math.max(0, Number((editQuincena - editAdvNum).toFixed(2)));

  const handleSaveEditRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDetail) return;

    store.updatePayrollDetail(editingDetail.id, {
      base_amount: editBaseNum,
      antiquity_bonus: editAntiquityBonus,
      frontier_bonus: editFrontierBonus,
      production_bonus: editProdBonus,
      deductions: editDescNum,
      total_earned: editTotalEarned,
      quincena_amount: editQuincena,
      personal_advances: editAdvNum,
      net_pay: editNetPay,
    });

    setEditingDetail(null);
    loadData();
  };

  const handleRemoveEmployee = (detailId: string, empName?: string) => {
    if (!confirm(`¿Desea retirar a "${empName || 'este empleado'}" de esta planilla?`)) return;
    store.removeEmployeeFromPayroll(detailId);
    loadData();
  };

  const handleExportCSV = () => {
    const headers = [
      "Nº",
      "NOMBRES Y APELLIDOS",
      "CARGO",
      "FECHA DE INGRESO",
      "HABER BASICO",
      "BONO POR ANTIGÜEDAD (5%)",
      "BONO FRONTERA (20%)",
      "BONO DE PRODUCCION",
      "TOTAL GANADO",
      "DESCUENTOS",
      "50% QUINCENA",
      "ANTICIPOS",
      "LIQUIDO PAGABLE",
      "FIRMA",
    ];

    const rows = payrollDetails.map((pd, idx) => {
      const quincena = pd.quincena_amount !== undefined ? pd.quincena_amount : (pd.total_earned * 0.5);
      return [
        idx + 1,
        `"${pd.employee?.full_name || ""}"`,
        `"${pd.employee?.position || ""}"`,
        formatDate(pd.employee?.hire_date),
        pd.base_amount.toFixed(2),
        pd.antiquity_bonus > 0 ? pd.antiquity_bonus.toFixed(2) : "-",
        pd.frontier_bonus.toFixed(2),
        pd.production_bonus > 0 ? pd.production_bonus.toFixed(2) : "-",
        pd.total_earned.toFixed(2),
        pd.deductions > 0 ? pd.deductions.toFixed(2) : "-",
        quincena.toFixed(2),
        pd.personal_advances > 0 ? pd.personal_advances.toFixed(2) : "-",
        pd.net_pay > 0 ? pd.net_pay.toFixed(2) : "-",
        "",
      ];
    });

    // Totals row
    rows.push([
      "",
      "TOTAL",
      "",
      "",
      totals.base.toFixed(2),
      totals.antiquity.toFixed(2),
      totals.frontier.toFixed(2),
      totals.production.toFixed(2),
      totals.totalEarned.toFixed(2),
      totals.deductions.toFixed(2),
      totals.quincena.toFixed(2),
      totals.advances.toFixed(2),
      totals.netPay.toFixed(2),
      "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Planilla_${activePeriod?.start_date || "oficial"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Header title="Planilla de Haberes & Sueldos" />

      <div className="p-4 md:p-6 space-y-5 print:p-0 print:space-y-2">
        {/* Banner Superior y Controles */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Planilla Oficial de Sueldos y Bonos</h3>
              <p className="text-xs text-slate-500">
                Formato reglamentario de planta con 14 columnas exactas, bonos de frontera (20%), antigüedad, destajo y deducciones.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Selector de Periodo */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-4 h-4 text-orange-600" />
              <select
                value={selectedPeriodId}
                onChange={(e) => {
                  setSelectedPeriodId(e.target.value);
                  setPayrollDetails(store.getPayrollDetails(e.target.value));
                }}
                className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-hidden"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === "period-oficial"
                      ? "Planilla Oficial Planta (01/09 al 15/09)"
                      : `Planilla ${p.frequency.toUpperCase()} (${formatDate(p.start_date)} al ${formatDate(p.end_date)})`}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition cursor-pointer focus:ring-2 focus:ring-orange-500"
              title="Crear nuevo periodo de planilla"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Periodo</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition cursor-pointer"
              title="Descargar en formato Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition cursor-pointer"
              title="Imprimir planilla en formato horizontal"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Planilla</span>
            </button>
          </div>
        </div>

        {/* Encabezado Oficial Imprimible */}
        <div className="hidden print:block text-center pb-2 border-b border-slate-300">
          <h2 className="font-black text-lg text-slate-900 tracking-wide uppercase">INCEGUA S.R.L.</h2>
          <p className="text-xs font-bold text-slate-700 uppercase">
            PLANILLA DE HABERES, BONOS Y LÍQUIDO PAGABLE DE PERSONAL
          </p>
          {activePeriod && (
            <p className="text-[11px] text-slate-600">
              Periodo correspondiente: {formatDate(activePeriod.start_date)} al {formatDate(activePeriod.end_date)} — Frecuencia: {activePeriod.frequency.toUpperCase()}
            </p>
          )}
        </div>

        {/* Tabla Oficial con las 14 columnas exactas + Columna de Opciones */}
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-900 text-white border-b-2 border-slate-700 font-bold uppercase select-none">
                  <th className="py-2.5 px-2 text-center border border-slate-700 w-10">Nº</th>
                  <th className="py-2.5 px-3 text-left border border-slate-700 min-w-44">NOMBRES Y APELLIDOS</th>
                  <th className="py-2.5 px-2 text-left border border-slate-700 min-w-28">CARGO</th>
                  <th className="py-2.5 px-2 text-center border border-slate-700 min-w-24">FECHA DE INGRESO</th>
                  <th className="py-2.5 px-2 text-right border border-slate-700 min-w-24">HABER BASICO ✎</th>
                  <th className="py-2.5 px-2 text-right border border-slate-700 min-w-24">
                    BONO POR ANTIGÜEDAD (5%)
                  </th>
                  <th className="py-2.5 px-2 text-right border border-slate-700 min-w-24">
                    BONO FRONTERA (20%)
                  </th>
                  <th className="py-2.5 px-2 text-right border border-slate-700 min-w-28 bg-orange-950/30 text-orange-200">
                    BONO DE PRODUCCION ✎
                  </th>
                  <th className="py-2.5 px-2 text-right border border-slate-700 min-w-24">TOTAL GANADO</th>
                  <th className="py-2.5 px-2 text-right border border-slate-700 min-w-28 bg-red-950/40 text-red-200">
                    DESCUENTOS ✎
                  </th>
                  <th className="py-2.5 px-2 text-right border border-slate-700 min-w-24">50% QUINCENA</th>
                  <th className="py-2.5 px-2 text-right border border-slate-700 min-w-28 bg-amber-950/40 text-amber-200">
                    ANTICIPOS ✎
                  </th>
                  <th className="py-2.5 px-2 text-right border border-slate-700 min-w-28 bg-slate-800 text-slate-100 font-black">
                    LIQUIDO PAGABLE
                  </th>
                  <th className="py-2.5 px-3 text-center border border-slate-700 min-w-24">FIRMA</th>
                  {/* OPCION PARA EDITAR AL LADO DE CADA FILA (STICKY A LA DERECHA) */}
                  <th className="py-2.5 px-3 text-center border border-slate-700 min-w-32 bg-slate-900 sticky right-0 z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.3)] print:hidden">
                    OPCIÓN EDITAR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payrollDetails.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="p-8 text-center text-slate-400 text-xs">
                      No hay registros cargados en esta planilla. Los trabajadores se incorporan automáticamente desde la sección <strong>Nómina</strong>.
                    </td>
                  </tr>
                ) : (
                  payrollDetails.map((pd, index) => {
                    const quincena = pd.quincena_amount !== undefined ? pd.quincena_amount : (pd.total_earned * 0.5);
                    const isLiquidZero = !pd.net_pay || pd.net_pay === 0;

                    return (
                      <tr
                        key={pd.id}
                        className={`hover:bg-orange-50/25 transition-colors group ${index % 2 === 1 ? "bg-slate-50/50" : "bg-white"}`}
                      >
                        {/* 1. Nº */}
                        <td className="py-2 px-2 text-center border border-slate-300 font-mono text-slate-500">
                          {index + 1}
                        </td>

                        {/* 2. NOMBRES Y APELLIDOS */}
                        <td className="py-2 px-3 border border-slate-300 font-semibold text-slate-900 whitespace-nowrap">
                          {pd.employee?.full_name}
                        </td>

                        {/* 3. CARGO */}
                        <td className="py-2 px-2 border border-slate-300 text-slate-700">
                          {pd.employee?.position}
                        </td>

                        {/* 4. FECHA DE INGRESO (Copiada de Nómina) */}
                        <td className="py-2 px-2 text-center border border-slate-300 font-mono text-slate-700">
                          {formatDate(pd.employee?.hire_date)}
                        </td>

                        {/* 5. HABER BASICO (Editable directamente) */}
                        <td className="py-1 px-1.5 text-right border border-slate-300 font-mono text-slate-800">
                          <div className="print:hidden flex items-center justify-end">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pd.base_amount === 0 ? "" : pd.base_amount}
                              placeholder="0.00"
                              onChange={(e) => handleInlineChange(pd.id, "base_amount", e.target.value)}
                              className="w-20 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-orange-500 font-mono text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-orange-500 text-slate-800 transition"
                              title="Haga clic para editar Haber Básico"
                            />
                          </div>
                          <span className="hidden print:inline">{formatMoney(pd.base_amount)}</span>
                        </td>

                        {/* 6. BONO POR ANTIGÜEDAD (5%) (Calculado auto) */}
                        <td className="py-2 px-2 text-right border border-slate-300 font-mono text-slate-800">
                          {formatMoney(pd.antiquity_bonus)}
                        </td>

                        {/* 7. BONO FRONTERA (20%) (Calculado auto) */}
                        <td className="py-2 px-2 text-right border border-slate-300 font-mono text-slate-800">
                          {formatMoney(pd.frontier_bonus)}
                        </td>

                        {/* 8. BONO DE PRODUCCION (Campo Editable Directamente en la Celda) */}
                        <td className="py-1 px-1.5 text-right border border-slate-300 font-mono text-slate-800">
                          <div className="print:hidden flex items-center justify-end">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pd.production_bonus === 0 ? "" : pd.production_bonus}
                              placeholder="0.00"
                              onChange={(e) => handleInlineChange(pd.id, "production_bonus", e.target.value)}
                              className="w-20 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-orange-500 font-mono text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-orange-500 text-slate-800 transition font-semibold"
                              title="Haga clic para editar Bono de Producción"
                            />
                          </div>
                          <span className="hidden print:inline">{formatMoney(pd.production_bonus)}</span>
                        </td>

                        {/* 9. TOTAL GANADO (Calculado auto) */}
                        <td className="py-2 px-2 text-right border border-slate-300 font-mono font-bold text-slate-900 bg-slate-50/40">
                          {formatMoney(pd.total_earned)}
                        </td>

                        {/* 10. DESCUENTOS (Campo Editable Directamente en la Celda) */}
                        <td className="py-1 px-1.5 text-right border border-slate-300 font-mono text-red-600 bg-red-50/15">
                          <div className="print:hidden flex items-center justify-end">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pd.deductions === 0 ? "" : pd.deductions}
                              placeholder="-"
                              onChange={(e) => handleInlineChange(pd.id, "deductions", e.target.value)}
                              className="w-20 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-red-400 font-mono text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-red-400 text-red-600 transition"
                              title="Haga clic para editar Descuentos"
                            />
                          </div>
                          <span className="hidden print:inline">{formatMoney(pd.deductions)}</span>
                        </td>

                        {/* 11. 50% QUINCENA (Calculado auto) */}
                        <td className="py-2 px-2 text-right border border-slate-300 font-mono text-slate-800">
                          {formatMoney(quincena)}
                        </td>

                        {/* 12. ANTICIPOS (Campo Editable Directamente en la Celda) */}
                        <td className="py-1 px-1.5 text-right border border-slate-300 font-mono text-amber-700 bg-amber-50/15">
                          <div className="print:hidden flex items-center justify-end">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pd.personal_advances === 0 ? "" : pd.personal_advances}
                              placeholder="-"
                              onChange={(e) => handleInlineChange(pd.id, "personal_advances", e.target.value)}
                              className="w-20 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-amber-500 font-mono text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-amber-500 text-amber-700 transition"
                              title="Haga clic para editar Anticipos"
                            />
                          </div>
                          <span className="hidden print:inline">{formatMoney(pd.personal_advances)}</span>
                        </td>

                        {/* 13. LIQUIDO PAGABLE (Calculado auto) */}
                        <td
                          className={`py-2 px-2 text-right border border-slate-300 font-mono font-bold ${
                            isLiquidZero ? "text-slate-400" : "text-slate-900 bg-emerald-50/30"
                          }`}
                        >
                          {formatMoney(pd.net_pay)}
                        </td>

                        {/* 14. FIRMA */}
                        <td className="py-2 px-3 border border-slate-300 text-center text-[10px] text-slate-400 min-h-8">
                          {pd.signed ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="print:hidden">Firmado</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 italic print:text-transparent print:border-b print:border-dotted print:border-slate-400 print:w-20 print:inline-block">
                              —
                            </span>
                          )}
                        </td>

                        {/* 15. OPCION PARA EDITAR AL LADO DE CADA FILA (STICKY DERECHA) */}
                        <td className="py-1.5 px-3 text-center border border-slate-300 sticky right-0 bg-white group-hover:bg-orange-50/40 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] print:hidden whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => openEditRow(pd)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer focus:ring-2 focus:ring-orange-500"
                              title="Editar Haber Básico, Descuentos y Anticipos"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => setReceiptDetail(pd)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md transition cursor-pointer"
                              title="Ver Recibo Individual"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveEmployee(pd.id, pd.employee?.full_name)}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition cursor-pointer"
                              title="Retirar de esta planilla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* FILA DE TOTALES EXACTA (AMARILLO COMO EN EL EXCEL) */}
                {payrollDetails.length > 0 && (
                  <tr className="bg-[#fffb8f] border-t-2 border-b-2 border-slate-500 font-bold text-slate-950 font-mono select-none">
                    <td className="py-2.5 px-2 text-center border border-slate-400"></td>
                    <td
                      colSpan={3}
                      className="py-2.5 px-3 border border-slate-400 text-center font-sans tracking-wider font-extrabold"
                    >
                      TOTAL
                    </td>
                    <td className="py-2.5 px-2 text-right border border-slate-400">{formatMoney(totals.base)}</td>
                    <td className="py-2.5 px-2 text-right border border-slate-400">{formatMoney(totals.antiquity)}</td>
                    <td className="py-2.5 px-2 text-right border border-slate-400">{formatMoney(totals.frontier)}</td>
                    <td className="py-2.5 px-2 text-right border border-slate-400">{formatMoney(totals.production)}</td>
                    <td className="py-2.5 px-2 text-right border border-slate-400">{formatMoney(totals.totalEarned)}</td>
                    <td className="py-2.5 px-2 text-right border border-slate-400 text-red-700">{formatMoney(totals.deductions)}</td>
                    <td className="py-2.5 px-2 text-right border border-slate-400">{formatMoney(totals.quincena)}</td>
                    <td className="py-2.5 px-2 text-right border border-slate-400 text-amber-800">{formatMoney(totals.advances)}</td>
                    {/* Celda seleccionada con fórmula =SUMA(N7:N17) */}
                    <td className="py-2.5 px-2 text-right border-2 border-orange-500 bg-[#fff566] text-black font-black text-xs shadow-inner">
                      {formatMoney(totals.netPay)}
                    </td>
                    <td className="py-2.5 px-2 text-center border border-slate-400"></td>
                    <td className="py-2.5 px-2 text-center border border-slate-400 sticky right-0 bg-[#fffb8f] z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] print:hidden"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Firmas de Autorización al Imprimir */}
        <div className="hidden print:grid grid-cols-3 gap-8 pt-12 text-center text-xs">
          <div className="border-t border-slate-800 pt-1 font-semibold text-slate-800">
            Elaborado por: RRHH / Planillas
          </div>
          <div className="border-t border-slate-800 pt-1 font-semibold text-slate-800">
            Revisado por: Gerente Producción
          </div>
          <div className="border-t border-slate-800 pt-1 font-semibold text-slate-800">
            Aprobado por: Gerencia General
          </div>
        </div>
      </div>

      {/* MODAL REGISTRAR EMPLEADO A LA PLANILLA */}
      {isRegisterEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Registrar Empleado a la Planilla</h3>
                  <p className="text-[11px] text-slate-300">
                    Copia la fecha de ingreso de nómina y calcula automáticamente los bonos legales y total ganado.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsRegisterEmpModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRegisterEmployee} className="p-6 space-y-4 text-xs">
              {/* Selector de Empleado de Nómina */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Seleccionar Empleado (de la sección Nómina) *
                </label>
                <select
                  value={regEmpId}
                  onChange={(e) => {
                    setRegEmpId(e.target.value);
                    const emp = employees.find((x) => x.id === e.target.value);
                    if (emp) {
                      setRegBaseSalary(emp.base_salary || 2750);
                      setRegProdBonus(store.calculateEmployeeProductionBonus(emp.id));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {employees.map((e) => {
                    const alreadyIn = payrollDetails.some((pd) => pd.employee_id === e.id);
                    return (
                      <option key={e.id} value={e.id}>
                        {e.full_name} — {e.position} ({e.contract_type.toUpperCase()}) {alreadyIn ? "• [Ya en planilla]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Fila de Datos Copiados Automáticamente de Nómina */}
              {selectedEmpForReg && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-500">Cargo en Nómina:</span>
                    <strong className="text-slate-900 text-xs">{selectedEmpForReg.position}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-500">Fecha de Ingreso (Nómina):</span>
                    <strong className="text-orange-700 font-mono text-xs">
                      {formatDate(selectedEmpForReg.hire_date)}
                    </strong>
                    <span className="block text-[10px] text-slate-500">
                      Antigüedad: {regYears} {regYears === 1 ? "año" : "años"} ({regAntiquityPct}% bono)
                    </span>
                  </div>
                </div>
              )}

              {/* Haber Básico y Bono de Producción (Campos Editables) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Haber Básico (Bs.) * <span className="text-[10px] font-normal text-orange-600 font-semibold">(Editable)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={regBaseSalary}
                    onChange={(e) => setRegBaseSalary(e.target.value)}
                    placeholder="2750.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 font-mono focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Bono Producción (Bs.) <span className="text-[10px] font-normal text-orange-600 font-semibold">(Editable)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={regProdBonus}
                    onChange={(e) => setRegProdBonus(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 font-mono focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Bloque de Campos Calculados Automáticamente */}
              <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center space-x-1.5 text-amber-950 font-bold text-xs">
                  <Calculator className="w-4 h-4 text-orange-600" />
                  <span>Columnas Calculadas Automáticamente:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Bono Antigüedad ({regAntiquityPct}%):</span>
                    <strong className="text-slate-900 font-mono">Bs. {regAntiquityBonus.toFixed(2)}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Bono Frontera (20%):</span>
                    <strong className="text-slate-900 font-mono">Bs. {regFrontierBonus.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                  <span className="font-bold text-slate-800 text-xs">Total Ganado Calculado:</span>
                  <span className="font-mono font-extrabold text-base text-slate-900">
                    Bs. {regTotalEarned.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-600">
                  <span>50% Quincena (Calculado):</span>
                  <span className="font-mono font-semibold">Bs. {regQuincena.toFixed(2)}</span>
                </div>
              </div>

              {/* Campos Editables: Descuentos y Anticipos */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Descuentos (Bs.) <span className="text-[10px] font-normal text-slate-500">(Editable)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={regDeductions}
                    onChange={(e) => setRegDeductions(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-red-600 focus:ring-2 focus:ring-red-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Anticipos (Bs.) <span className="text-[10px] font-normal text-slate-500">(Editable)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={regAdvances}
                    onChange={(e) => setRegAdvances(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-amber-700 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Líquido Pagable Resultante */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex justify-between items-center">
                <span className="font-bold text-emerald-900 text-xs">Líquido Pagable Resultante:</span>
                <span className="font-mono font-black text-base text-emerald-950">
                  Bs. {regNetPay.toFixed(2)}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterEmpModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold rounded-lg shadow-sm flex items-center space-x-2 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Registrar en Planilla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR FILA DE PLANILLA (SOLO HABER BASICO, DESCUENTOS Y ANTICIPOS) */}
      {editingDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Editar Fila: {editingDetail.employee?.full_name}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Cargo: {editingDetail.employee?.position} | Ingreso en Nómina: {formatDate(editingDetail.employee?.hire_date)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingDetail(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRow} className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-[11px] flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Puede modificar <strong>Haber Básico</strong>, <strong>Bono de Producción</strong>, <strong>Descuentos</strong> y <strong>Anticipos</strong>. Los bonos legales de antigüedad y frontera se recalculan automáticamente.
                </span>
              </div>

              {/* 1 Y 2. HABER BASICO Y BONO DE PRODUCCION (CAMPOS EDITABLES) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    1. Haber Básico (Bs.) * <span className="text-[10px] font-normal text-orange-600 font-semibold">(Editable)</span>
                  </label>
                  <input
                    id="edit-modal-base-salary"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editForm.base_amount}
                    onChange={(e) => setEditForm({ ...editForm, base_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    2. Bono Producción (Bs.) <span className="text-[10px] font-normal text-orange-600 font-semibold">(Editable)</span>
                  </label>
                  <input
                    id="edit-modal-prod-bonus"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.production_bonus}
                    onChange={(e) => setEditForm({ ...editForm, production_bonus: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* BONOS Y TOTAL GANADO (CALCULADOS AUTOMÁTICAMENTE - NO EDITABLES) */}
              <div className="border border-slate-200 bg-slate-50/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Campos Calculados Automáticamente:</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Bono Antigüedad ({editAntiquityPct}%):</span>
                    <strong className="text-slate-900 font-mono">Bs. {editAntiquityBonus.toFixed(2)}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Bono Frontera (20%):</span>
                    <strong className="text-slate-900 font-mono">Bs. {editFrontierBonus.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800 text-xs">Total Ganado Calculado:</span>
                  <span className="font-mono font-extrabold text-base text-slate-900">
                    Bs. {editTotalEarned.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-600">
                  <span>50% Quincena (Calculado):</span>
                  <span className="font-mono font-semibold">Bs. {editQuincena.toFixed(2)}</span>
                </div>
              </div>

              {/* 3 Y 4. DESCUENTOS Y ANTICIPOS (CAMPOS EDITABLES) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    3. Descuentos (Bs.) <span className="text-[10px] font-normal text-red-600 font-semibold">(Editable)</span>
                  </label>
                  <input
                    id="edit-modal-deductions"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.deductions}
                    onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-red-600 focus:ring-2 focus:ring-red-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    4. Anticipos (Bs.) <span className="text-[10px] font-normal text-amber-700 font-semibold">(Editable)</span>
                  </label>
                  <input
                    id="edit-modal-advances"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.personal_advances}
                    onChange={(e) => setEditForm({ ...editForm, personal_advances: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-amber-700 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* RESULTADO LÍQUIDO PAGABLE (CALCULADO AUTOMÁTICAMENTE) */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex justify-between items-center">
                <span className="font-bold text-emerald-950 text-xs">Líquido Pagable Resultante:</span>
                <span className="font-mono font-black text-base text-emerald-950">
                  Bs. {editNetPay.toFixed(2)}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingDetail(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-edit-row"
                  type="submit"
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold rounded-lg shadow-sm flex items-center space-x-2 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ANTICIPO */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-xs">
                  <HandCoins className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Entregar Anticipo / Vale de Salario</h3>
              </div>
              <button 
                onClick={() => setIsAdvanceModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdvance} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Empleado Beneficiario *</label>
                <select
                  value={advEmpId}
                  onChange={(e) => setAdvEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                  step="0.01"
                  required
                  value={advAmount}
                  onChange={(e) => setAdvAmount(e.target.value)}
                  placeholder="Ej: 350.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-amber-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo o Justificación</label>
                <input
                  type="text"
                  value={advReason}
                  onChange={(e) => setAdvReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <p className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900">
                Este anticipo se descontará automáticamente en la columna ANTICIPOS y registrará el egreso correspondiente en Caja General.
              </p>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Registrar Anticipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GENERAR NUEVO PERIODO */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Generar Nuevo Periodo de Planilla</h3>
              </div>
              <button 
                onClick={() => setIsPeriodModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Frecuencia de Planilla</label>
                <select
                  value={freq}
                  onChange={(e) => setFreq(e.target.value as PayFrequency)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="quincenal">Quincenal (Personal de Planta / Fábrica)</option>
                  <option value="semanal">Semanal (Operarios de Producción a Destajo)</option>
                  <option value="mensual">Mensual (Personal Administrativo y Fijo)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha Inicio *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha Fin *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Se creará el periodo y podrá registrar a los trabajadores con el botón <strong>"+ Registrar Empleado a Planilla"</strong>.
              </p>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Generar Planilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECIBO INDIVIDUAL DE PAGO */}
      {receiptDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:pt-12 print:items-start print:bg-white">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden print:shadow-none print:border-none print:w-full">
            <div className="p-6 space-y-4 text-xs font-mono print:p-0">
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="font-bold text-slate-900 text-base font-sans uppercase">
                  RECIBO DE PAGO DE SUELDO & BONOS
                </h2>
                <p className="text-slate-500 text-[11px]">INCEGUA S.R.L. - Planta Industrial</p>
                {activePeriod && (
                  <p className="text-slate-700 font-bold mt-1 font-sans text-[11px]">
                    Periodo: {getMonthName(activePeriod.start_date)} ({formatDate(activePeriod.start_date)} al {formatDate(activePeriod.end_date)})
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  Trabajador: <strong className="text-slate-900">{receiptDetail.employee?.full_name}</strong>
                </div>
                <div>
                  CI: <strong className="text-slate-900">{receiptDetail.employee?.document_id || "-"}</strong>
                </div>
                <div>
                  Cargo: <span>{receiptDetail.employee?.position}</span>
                </div>
                <div>
                  Fecha Ingreso: <span>{formatDate(receiptDetail.employee?.hire_date)}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50 text-[11px]">
                <div className="flex justify-between">
                  <span>Haber Básico:</span>
                  <span>Bs. {receiptDetail.base_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bono por Antigüedad (5%):</span>
                  <span>Bs. {receiptDetail.antiquity_bonus.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bono Frontera (20%):</span>
                  <span>Bs. {receiptDetail.frontier_bonus.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-800">
                  <span>Bono de Producción (Destajo):</span>
                  <span>Bs. {receiptDetail.production_bonus.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1 font-bold">
                  <span>TOTAL GANADO:</span>
                  <span>Bs. {receiptDetail.total_earned.toFixed(2)}</span>
                </div>
                {receiptDetail.deductions > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuentos:</span>
                    <span>- Bs. {receiptDetail.deductions.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>50% Quincena:</span>
                  <span>
                    Bs.{" "}
                    {(
                      receiptDetail.quincena_amount !== undefined
                        ? receiptDetail.quincena_amount
                        : receiptDetail.total_earned * 0.5
                    ).toFixed(2)}
                  </span>
                </div>
                {receiptDetail.personal_advances > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Anticipos (Vales):</span>
                    <span>- Bs. {receiptDetail.personal_advances.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-slate-400 pt-1 font-bold text-sm text-emerald-950 font-sans">
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
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition cursor-pointer"
              >
                Cerrar Recibo
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-xs shadow-sm transition flex items-center space-x-2 cursor-pointer focus:ring-2 focus:ring-orange-500"
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
