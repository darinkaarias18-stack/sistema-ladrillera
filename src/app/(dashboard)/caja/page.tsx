"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { CashLedgerEntry, CashCategory } from "@/types/database.types";
import { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  Plus,
  TrendingUp,
  Truck,
  Users,
  HandCoins,
  Receipt,
  Search,
  Filter,
  X,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";

export type MovementGroupKey = "todos" | "venta" | "compra_materiales" | "pago_salarios" | "anticipos" | "otros";

interface CategoryMeta {
  group: MovementGroupKey;
  label: string;
  badgeLabel: string;
  badgeClass: string;
  rowBorderClass: string;
  rowBgClass: string;
  rowHoverClass: string;
  dotColor: string;
  icon: typeof TrendingUp;
}

export function getMovementCategoryMeta(entry: CashLedgerEntry): CategoryMeta {
  const desc = (entry.description || "").toLowerCase();
  const cat = (entry.category || "").toLowerCase();
  const refType = (entry.reference_type || "").toLowerCase();

  // 1. VENTAS (Ingresos)
  if (
    cat === "venta" ||
    entry.amount > 0 ||
    refType === "sale" ||
    desc.includes("venta") ||
    desc.includes("cobro venta")
  ) {
    return {
      group: "venta",
      label: "Venta (Ingreso)",
      badgeLabel: "Venta",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20",
      rowBorderClass: "border-l-4 border-l-emerald-500",
      rowBgClass: "bg-emerald-50/30",
      rowHoverClass: "hover:bg-emerald-50/70",
      dotColor: "bg-emerald-500",
      icon: TrendingUp,
    };
  }

  // 2. ANTICIPOS (Personal) - Se verifica antes de salarios para evitar falsos positivos
  if (
    cat === "anticipo" ||
    refType === "employee_advances" ||
    desc.includes("anticipo") ||
    desc.includes("adelanto") ||
    desc.includes("vale")
  ) {
    return {
      group: "anticipos",
      label: "Anticipo de Sueldo",
      badgeLabel: "Anticipo",
      badgeClass: "bg-purple-100 text-purple-800 border-purple-300 ring-1 ring-purple-500/20",
      rowBorderClass: "border-l-4 border-l-purple-500",
      rowBgClass: "bg-purple-50/30",
      rowHoverClass: "hover:bg-purple-50/70",
      dotColor: "bg-purple-500",
      icon: HandCoins,
    };
  }

  // 3. PAGO DE SALARIOS (Planillas, Sueldos, Finiquitos)
  if (
    cat === "planilla" ||
    refType === "payroll_details" ||
    desc.includes("planilla") ||
    desc.includes("salario") ||
    desc.includes("sueldo") ||
    desc.includes("quincena personal") ||
    desc.includes("liquidación") ||
    desc.includes("finiquito")
  ) {
    return {
      group: "pago_salarios",
      label: "Pago de Salarios",
      badgeLabel: "Pago Salario",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-500/20",
      rowBorderClass: "border-l-4 border-l-blue-500",
      rowBgClass: "bg-blue-50/30",
      rowHoverClass: "hover:bg-blue-50/70",
      dotColor: "bg-blue-500",
      icon: Users,
    };
  }

  // 4. COMPRAS DE MATERIALES (Insumos, Leña, Arcilla, Combustibles, Mantenimiento)
  if (
    cat === "compra_insumo" ||
    cat === "combustible" ||
    cat === "mantenimiento" ||
    desc.includes("compra") ||
    desc.includes("leña") ||
    desc.includes("arcilla") ||
    desc.includes("diesel") ||
    desc.includes("combustible") ||
    desc.includes("gasolina") ||
    desc.includes("repuesto") ||
    desc.includes("mantenimiento") ||
    desc.includes("aditivo") ||
    desc.includes("tierra") ||
    desc.includes("arena")
  ) {
    return {
      group: "compra_materiales",
      label: "Compra de Materiales",
      badgeLabel: "Compra Material",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-500/20",
      rowBorderClass: "border-l-4 border-l-amber-500",
      rowBgClass: "bg-amber-50/30",
      rowHoverClass: "hover:bg-amber-50/70",
      dotColor: "bg-amber-500",
      icon: Truck,
    };
  }

  // 5. OTROS GASTOS OPERATIVOS
  return {
    group: "otros",
    label: "Otros Gastos",
    badgeLabel: "Gasto Operativo",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 ring-1 ring-slate-500/20",
    rowBorderClass: "border-l-4 border-l-slate-400",
    rowBgClass: "bg-slate-50/30",
    rowHoverClass: "hover:bg-slate-100/70",
    dotColor: "bg-slate-400",
    icon: Receipt,
  };
}

export default function CajaPage() {
  const [entries, setEntries] = useState<CashLedgerEntry[]>([]);
  const [runningBalance, setRunningBalance] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<MovementGroupKey>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const boliviaDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
  const [date, setDate] = useState(boliviaDate);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(500);
  const [type, setType] = useState<"ingreso" | "egreso">("egreso");
  const [category, setCategory] = useState<CashCategory>("compra_insumo");

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

  // Calcula saldos acumulados cronológicos sobre la lista completa ordenada
  const chronologicalEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => {
        const dateCompare = a.movement_date.localeCompare(b.movement_date);
        if (dateCompare !== 0) return dateCompare;
        return (a.created_at || "").localeCompare(b.created_at || "");
      })
      .reduce((acc, current) => {
        const lastBalance = acc.length > 0 ? acc[acc.length - 1].saldo : 0;
        const meta = getMovementCategoryMeta(current);
        acc.push({
          ...current,
          saldo: lastBalance + current.amount,
          meta,
        });
        return acc;
      }, [] as (CashLedgerEntry & { saldo: number; meta: CategoryMeta })[]);
  }, [entries]);

  // Totales y contadores calculados por cada tipo clave
  const metrics = useMemo(() => {
    let totalVentas = 0;
    let countVentas = 0;
    let totalCompras = 0;
    let countCompras = 0;
    let totalSalarios = 0;
    let countSalarios = 0;
    let totalAnticipos = 0;
    let countAnticipos = 0;
    let totalOtros = 0;
    let countOtros = 0;

    chronologicalEntries.forEach((item) => {
      if (item.meta.group === "venta") {
        totalVentas += item.amount;
        countVentas++;
      } else if (item.meta.group === "compra_materiales") {
        totalCompras += Math.abs(item.amount);
        countCompras++;
      } else if (item.meta.group === "pago_salarios") {
        totalSalarios += Math.abs(item.amount);
        countSalarios++;
      } else if (item.meta.group === "anticipos") {
        totalAnticipos += Math.abs(item.amount);
        countAnticipos++;
      } else {
        totalOtros += Math.abs(item.amount);
        countOtros++;
      }
    });

    return {
      ventas: { total: totalVentas, count: countVentas },
      compras: { total: totalCompras, count: countCompras },
      salarios: { total: totalSalarios, count: countSalarios },
      anticipos: { total: totalAnticipos, count: countAnticipos },
      otros: { total: totalOtros, count: countOtros },
    };
  }, [chronologicalEntries]);

  // Filtro activo aplicado a la tabla
  const filteredEntries = useMemo(() => {
    return chronologicalEntries.filter((item) => {
      // Filtro por categoría seleccionada
      if (selectedGroup !== "todos" && item.meta.group !== selectedGroup) {
        return false;
      }
      // Filtro por término de búsqueda
      if (searchTerm.trim() !== "") {
        const q = searchTerm.toLowerCase();
        const folio = (item.reference_id || item.id).toLowerCase();
        const desc = item.description.toLowerCase();
        const catLabel = item.meta.label.toLowerCase();
        return folio.includes(q) || desc.includes(q) || catLabel.includes(q);
      }
      return true;
    });
  }, [chronologicalEntries, selectedGroup, searchTerm]);

  return (
    <>
      <Header title="Libro de Compra y Venta" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Banner Principal de Saldo */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-slate-700/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs uppercase tracking-wider text-orange-400 font-bold">
                Saldo Disponible en Caja General
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight">
              Bs. {runningBalance.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Flujo oficial de caja: ventas cobradas, compras de materia prima, leña, combustible, pagos de planillas y anticipos.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Movimiento</span>
          </button>
        </div>

        {/* 4 Tarjetas de Resumen Distinguidas por Color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Ventas */}
          <button
            onClick={() => setSelectedGroup(selectedGroup === "venta" ? "todos" : "venta")}
            className={`text-left p-4 rounded-xl border transition-all shadow-xs ${
              selectedGroup === "venta"
                ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.02]"
                : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Ventas
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-950 mt-2 font-mono">
              +Bs. {metrics.ventas.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-700/80 mt-1 flex items-center justify-between">
              <span>{metrics.ventas.count} cobros registrados</span>
              <span className="font-semibold text-[10px] uppercase">Ingreso</span>
            </p>
          </button>

          {/* Card 2: Compras de Materiales */}
          <button
            onClick={() => setSelectedGroup(selectedGroup === "compra_materiales" ? "todos" : "compra_materiales")}
            className={`text-left p-4 rounded-xl border transition-all shadow-xs ${
              selectedGroup === "compra_materiales"
                ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/30 scale-[1.02]"
                : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Compras Materiales
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-950 mt-2 font-mono">
              -Bs. {metrics.compras.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-amber-800/80 mt-1 flex items-center justify-between">
              <span>{metrics.compras.count} compras (Leña, arcilla, diesel)</span>
              <span className="font-semibold text-[10px] uppercase">Egreso</span>
            </p>
          </button>

          {/* Card 3: Pago de Salarios */}
          <button
            onClick={() => setSelectedGroup(selectedGroup === "pago_salarios" ? "todos" : "pago_salarios")}
            className={`text-left p-4 rounded-xl border transition-all shadow-xs ${
              selectedGroup === "pago_salarios"
                ? "bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/30 scale-[1.02]"
                : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Pago de Salarios
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-blue-950 mt-2 font-mono">
              -Bs. {metrics.salarios.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-blue-800/80 mt-1 flex items-center justify-between">
              <span>{metrics.salarios.count} liquidaciones de planilla</span>
              <span className="font-semibold text-[10px] uppercase">Egreso</span>
            </p>
          </button>

          {/* Card 4: Anticipos */}
          <button
            onClick={() => setSelectedGroup(selectedGroup === "anticipos" ? "todos" : "anticipos")}
            className={`text-left p-4 rounded-xl border transition-all shadow-xs ${
              selectedGroup === "anticipos"
                ? "bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]"
                : "bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Anticipos de Sueldo
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800">
                <HandCoins className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-purple-950 mt-2 font-mono">
              -Bs. {metrics.anticipos.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-purple-800/80 mt-1 flex items-center justify-between">
              <span>{metrics.anticipos.count} adelantos otorgados</span>
              <span className="font-semibold text-[10px] uppercase">Egreso</span>
            </p>
          </button>
        </div>

        {/* Tabla Principal y Filtros de Categorías */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Barra de Filtros por Botones / Pestañas */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Botones de Pestañas */}
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setSelectedGroup("todos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedGroup === "todos"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Todos ({chronologicalEntries.length})</span>
              </button>

              <button
                onClick={() => setSelectedGroup("venta")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedGroup === "venta"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Ventas ({metrics.ventas.count})</span>
              </button>

              <button
                onClick={() => setSelectedGroup("compra_materiales")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedGroup === "compra_materiales"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Compras de Materiales ({metrics.compras.count})</span>
              </button>

              <button
                onClick={() => setSelectedGroup("pago_salarios")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedGroup === "pago_salarios"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-blue-50 text-blue-900 border border-blue-300 hover:bg-blue-100"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pago de Salarios ({metrics.salarios.count})</span>
              </button>

              <button
                onClick={() => setSelectedGroup("anticipos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedGroup === "anticipos"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-purple-50 text-purple-900 border border-purple-300 hover:bg-purple-100"
                }`}
              >
                <HandCoins className="w-3.5 h-3.5" />
                <span>Anticipos ({metrics.anticipos.count})</span>
              </button>

              {metrics.otros.count > 0 && (
                <button
                  onClick={() => setSelectedGroup("otros")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedGroup === "otros"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Otros Gastos ({metrics.otros.count})</span>
                </button>
              )}
            </div>

            {/* Buscador */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por concepto o folio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Movimientos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-5">Fecha</th>
                  <th className="p-3.5">Distinción / Tipo</th>
                  <th className="p-3.5">Recibo / Folio</th>
                  <th className="p-3.5 min-w-[280px]">Descripción / Concepto</th>
                  <th className="p-3.5 text-right">Debe (Ingreso)</th>
                  <th className="p-3.5 text-right">Haber (Egreso)</th>
                  <th className="p-3.5 text-right pr-5">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Filter className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">
                          No se encontraron movimientos para los filtros seleccionados
                        </p>
                        <button
                          onClick={() => {
                            setSelectedGroup("todos");
                            setSearchTerm("");
                          }}
                          className="text-orange-600 hover:underline font-bold text-xs"
                        >
                          Restablecer todos los filtros
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((item) => {
                    const isIngreso = item.amount > 0;
                    const debe = isIngreso ? item.amount : null;
                    const haber = !isIngreso ? Math.abs(item.amount) : null;
                    const IconComp = item.meta.icon;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${item.meta.rowBorderClass} ${item.meta.rowHoverClass}`}
                      >
                        {/* Fecha */}
                        <td className="p-3.5 pl-5 font-mono text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.movement_date}</span>
                          </div>
                        </td>

                        {/* Distinción / Tipo con Color Específico */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${item.meta.badgeClass}`}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                            <span>{item.meta.badgeLabel}</span>
                          </span>
                        </td>

                        {/* Recibo / Folio */}
                        <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-[11px] text-slate-700 border border-slate-200">
                            {item.reference_id
                              ? item.reference_id.slice(-6).toUpperCase()
                              : item.id.slice(-6).toUpperCase()}
                          </span>
                        </td>

                        {/* Descripción */}
                        <td className="p-3.5 font-medium text-slate-900">
                          <span>{item.description}</span>
                        </td>

                        {/* Debe (Ingreso en Verde) */}
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {debe ? (
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                              +Bs. {debe.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Haber (Egreso en Rojo) */}
                        <td className="p-3.5 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                          {haber ? (
                            <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md border border-rose-200">
                              -Bs. {haber.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Saldo Acumulado */}
                        <td className="p-3.5 text-right pr-5 font-mono font-black text-slate-900 whitespace-nowrap">
                          Bs. {item.saldo.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pie de tabla con leyenda y conteo */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center flex-wrap gap-4">
              <span className="font-semibold text-slate-700">Leyenda de Colores:</span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Ventas
              </span>
              <span className="flex items-center gap-1.5 text-amber-900 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Compras Materiales
              </span>
              <span className="flex items-center gap-1.5 text-blue-900 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Pago de Salarios
              </span>
              <span className="flex items-center gap-1.5 text-purple-900 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Anticipos
              </span>
            </div>

            <span className="text-slate-600">
              Mostrando <strong className="text-slate-800">{filteredEntries.length}</strong> de{" "}
              <strong className="text-slate-800">{entries.length}</strong> movimientos
            </span>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Movimiento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">Registrar Movimiento en Libro de Caja</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Flujo</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newType = e.target.value as "ingreso" | "egreso";
                      setType(newType);
                      if (newType === "ingreso") {
                        setCategory("venta");
                      } else if (category === "venta") {
                        setCategory("compra_insumo");
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-bold transition ${
                      type === "ingreso"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-rose-50 text-rose-800 border-rose-300"
                    }`}
                  >
                    <option value="egreso">Egreso (Salida / Pago)</option>
                    <option value="ingreso">Ingreso (Entrada / Venta)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Distinción / Categoría *</label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as CashCategory;
                    setCategory(newCat);
                    if (newCat === "venta") {
                      setType("ingreso");
                    } else {
                      setType("egreso");
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-orange-500"
                >
                  <optgroup label="🟢 INGRESOS">
                    <option value="venta">🟢 Venta de Ladrillos / Cobro de Cliente</option>
                  </optgroup>
                  <optgroup label="🟠 COMPRAS DE MATERIALES E INSUMOS (EGRESOS)">
                    <option value="compra_insumo">🟠 Compra de Materiales (Leña, Arcilla, Arena, Tierra)</option>
                    <option value="combustible">🟠 Combustible y Lubricantes (Diesel, Gasolina)</option>
                    <option value="mantenimiento">🟠 Mantenimiento de Maquinaria y Repuestos</option>
                  </optgroup>
                  <optgroup label="🔵 NÓMINA Y PERSONAL (EGRESOS)">
                    <option value="planilla">🔵 Pago de Salarios / Planilla Quincenal o Mensual</option>
                    <option value="anticipo">🟣 Anticipo de Sueldo al Personal</option>
                  </optgroup>
                  <optgroup label="⚪ OTROS GASTOS">
                    <option value="otro">⚪ Otros Gastos Operativos (CRE Luz, Agua, Fletes)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción / Concepto Detallado *</label>
                <input
                  type="text"
                  placeholder="Ej: Compra de 4 volquetas de arcilla roja para molienda"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto en Bolivianos (Bs.) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Bs.</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-base font-black text-slate-900 focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-lg shadow-md transition"
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
