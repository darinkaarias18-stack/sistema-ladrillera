"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { useEffect, useState, useMemo } from "react";
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Award,
  DollarSign,
  ShoppingBag,
  Receipt,
  Calendar,
  Flame,
  Fuel,
  Wrench,
  Users,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Filter,
  CheckCircle2,
  Printer,
  ChevronRight,
  ShoppingCart
} from "lucide-react";
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
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";

type ReportTab = "libro" | "ventas" | "gastos" | "compras" | "produccion";
type DateFilter = "all" | "30days" | "month" | "custom";

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("libro");
  const [filterType, setFilterType] = useState<DateFilter>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-10");
  const [customStartDate, setCustomStartDate] = useState<string>("2026-10-01");
  const [customEndDate, setCustomEndDate] = useState<string>("2026-10-17");

  const [batches, setBatches] = useState<any[]>([]);
  const [brickTypes, setBrickTypes] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [cashLedger, setCashLedger] = useState<any[]>([]);

  useEffect(() => {
    setBatches(store.getProductionBatches());
    setBrickTypes(store.getBrickTypes());
    setStock(store.getInventoryStock());
    setEmployees(store.getEmployees());
    setSales(store.getSales());
    setCashLedger(store.getCashLedger());
  }, []);

  // Meses disponibles para selección
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    cashLedger.forEach((e) => {
      if (e.movement_date) set.add(e.movement_date.slice(0, 7));
    });
    sales.forEach((s) => {
      if (s.created_at) set.add(s.created_at.slice(0, 7));
    });
    set.add("2026-10");
    set.add("2026-09");
    set.add("2026-08");
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [cashLedger, sales]);

  const formatMonthName = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const monthNames: Record<string, string> = {
      "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
      "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
      "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
    };
    return `${monthNames[month] || month} ${year}`;
  };

  const filterSummaryText = useMemo(() => {
    if (filterType === "all") return "Todo el Histórico";
    if (filterType === "30days") return "Últimos 30 días";
    if (filterType === "month") return formatMonthName(selectedMonth);
    if (filterType === "custom") {
      if (customStartDate && customEndDate) return `${customStartDate} al ${customEndDate}`;
      if (customStartDate) return `Desde ${customStartDate}`;
      if (customEndDate) return `Hasta ${customEndDate}`;
      return "Rango Personalizado";
    }
    return "Filtro Activo";
  }, [filterType, selectedMonth, customStartDate, customEndDate]);

  // FILTRO POR FECHA (POR MES, PERSONALIZADO, 30 DÍAS O TODO)
  const filteredCashLedger = useMemo(() => {
    return cashLedger.filter((entry) => {
      const d = entry.movement_date;
      if (!d) return true;

      if (filterType === "month") {
        return d.startsWith(selectedMonth);
      }
      if (filterType === "custom") {
        if (customStartDate && d < customStartDate) return false;
        if (customEndDate && d > customEndDate) return false;
        return true;
      }
      if (filterType === "30days") {
        return d >= "2026-09-17";
      }
      return true;
    });
  }, [cashLedger, filterType, selectedMonth, customStartDate, customEndDate]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDate = sale.created_at ? sale.created_at.slice(0, 10) : "";
      if (!saleDate) return true;

      if (filterType === "month") {
        return saleDate.startsWith(selectedMonth);
      }
      if (filterType === "custom") {
        if (customStartDate && saleDate < customStartDate) return false;
        if (customEndDate && saleDate > customEndDate) return false;
        return true;
      }
      if (filterType === "30days") {
        return saleDate >= "2026-09-17";
      }
      return true;
    });
  }, [sales, filterType, selectedMonth, customStartDate, customEndDate]);

  // ==========================================
  // 1. CÁLCULOS DEL LIBRO DE COMPRA Y VENTA
  // ==========================================
  const totalIngresos = useMemo(() => {
    return filteredCashLedger
      .filter((e) => e.amount > 0)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredCashLedger]);

  const totalEgresos = useMemo(() => {
    return filteredCashLedger
      .filter((e) => e.amount < 0)
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
  }, [filteredCashLedger]);

  const saldoNeto = totalIngresos - totalEgresos;
  const margenNetoPct = totalIngresos > 0 ? ((saldoNeto / totalIngresos) * 100).toFixed(1) : "0";

  // Agrupación de flujo de caja por fecha para gráfico
  const cashFlowByDate = useMemo(() => {
    const datesMap = new Map<string, { fecha: string; ingresos: number; egresos: number; saldo: number }>();

    // Ordenar de más antiguo a más reciente
    const sorted = [...filteredCashLedger].sort((a, b) => a.movement_date.localeCompare(b.movement_date));

    sorted.forEach((e) => {
      const d = e.movement_date;
      if (!datesMap.has(d)) {
        datesMap.set(d, { fecha: d.slice(5), ingresos: 0, egresos: 0, saldo: 0 });
      }
      const item = datesMap.get(d)!;
      if (e.amount > 0) {
        item.ingresos += e.amount;
      } else {
        item.egresos += Math.abs(e.amount);
      }
      item.saldo = item.ingresos - item.egresos;
    });

    return Array.from(datesMap.values());
  }, [filteredCashLedger]);

  // ==========================================
  // 2. CÁLCULOS DE VENTAS & DÍA CON MÁS VENTAS
  // ==========================================
  const salesByDay = useMemo(() => {
    const dayMap = new Map<string, { fecha: string; total: number; count: number; unidades: number }>();

    filteredSales.forEach((s) => {
      const date = s.created_at ? s.created_at.slice(0, 10) : "2026-10-10";
      const totalUnits = (s.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);

      if (!dayMap.has(date)) {
        dayMap.set(date, { fecha: date, total: 0, count: 0, unidades: 0 });
      }
      const curr = dayMap.get(date)!;
      curr.total += s.total_amount;
      curr.count += 1;
      curr.unidades += totalUnits;
    });

    return Array.from(dayMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [filteredSales]);

  // Día con mayor venta
  const bestSalesDay = useMemo(() => {
    if (salesByDay.length === 0) return null;
    return salesByDay.reduce((best, curr) => (curr.total > best.total ? curr : best), salesByDay[0]);
  }, [salesByDay]);

  // Ladrillos más vendidos
  const topSellingBricks = useMemo(() => {
    const brickMap = new Map<string, { name: string; unidades: number; monto: number }>();

    filteredSales.forEach((s) => {
      (s.items || []).forEach((item: any) => {
        const bId = item.brick_type_id;
        const bName = item.brick_type?.name || brickTypes.find((bt) => bt.id === bId)?.name || "Ladrillo";
        if (!brickMap.has(bId)) {
          brickMap.set(bId, { name: bName, unidades: 0, monto: 0 });
        }
        const bData = brickMap.get(bId)!;
        bData.unidades += item.quantity || 0;
        bData.monto += (item.quantity || 0) * (item.unit_price || 0);
      });
    });

    return Array.from(brickMap.values()).sort((a, b) => b.unidades - a.unidades);
  }, [filteredSales, brickTypes]);

  // ==========================================
  // 3. CÁLCULOS DE GASTOS Y TIPOS DE GASTOS
  // ==========================================
  const expenseCategoriesConfig: Record<string, { label: string; color: string; icon: any }> = {
    compra_insumo: { label: "Insumos y Materias Primas", color: "#F97316", icon: Flame },
    combustible: { label: "Combustible y Transporte", color: "#EF4444", icon: Fuel },
    mantenimiento: { label: "Mantenimiento y Repuestos", color: "#8B5CF6", icon: Wrench },
    planilla: { label: "Planillas y Sueldos", color: "#3B82F6", icon: Users },
    anticipo: { label: "Anticipos a Personal", color: "#06B6D4", icon: DollarSign },
    otro: { label: "Servicios y Otros Operativos", color: "#64748B", icon: Boxes }
  };

  const expensesData = useMemo(() => {
    const expenseEntries = filteredCashLedger.filter((e) => e.amount < 0);
    const catMap = new Map<string, { category: string; label: string; total: number; count: number; color: string }>();

    expenseEntries.forEach((e) => {
      const cat = e.category || "otro";
      const config = expenseCategoriesConfig[cat] || {
        label: cat,
        color: "#94A3B8",
        icon: Boxes
      };

      if (!catMap.has(cat)) {
        catMap.set(cat, {
          category: cat,
          label: config.label,
          total: 0,
          count: 0,
          color: config.color
        });
      }

      const item = catMap.get(cat)!;
      item.total += Math.abs(e.amount);
      item.count += 1;
    });

    return Array.from(catMap.values()).sort((a, b) => b.total - a.total);
  }, [filteredCashLedger]);

  const topExpenseCategory = expensesData[0] || null;

  // ==========================================
  // 4. COMPRAS - QUÉ ES LO QUE MÁS SE HA COMPRADO
  // ==========================================
  const purchasesData = useMemo(() => {
    const purchaseEntries = filteredCashLedger.filter(
      (e) => e.amount < 0 && (e.category === "compra_insumo" || e.description.toLowerCase().includes("compra"))
    );

    // Agrupar insumos similares (Leña, Arcilla, Tierra, Aditivos, Repuestos)
    const itemMap = new Map<string, { item: string; total: number; count: number; color: string }>();

    purchaseEntries.forEach((e) => {
      const desc = e.description.toLowerCase();
      let itemName = "Otros Insumos de Fábrica";
      let itemColor = "#94A3B8";

      if (desc.includes("leña")) {
        itemName = "Leña dura para cocción hornos";
        itemColor = "#EA580C"; // Naranja oscuro / fuego
      } else if (desc.includes("arcilla")) {
        itemName = "Arcilla seleccionada (Greda y Roja)";
        itemColor = "#D97706"; // Ámbar tierra
      } else if (desc.includes("tierra")) {
        itemName = "Tierra arenosa para mezcla";
        itemColor = "#B45309";
      } else if (desc.includes("aditivo") || desc.includes("desmoldante")) {
        itemName = "Aditivos químicos y desmoldantes";
        itemColor = "#0284C7";
      } else if (desc.includes("repuesto") || desc.includes("cuchilla") || desc.includes("correa")) {
        itemName = "Repuestos y consumibles mecánicos";
        itemColor = "#7C3AED";
      }

      if (!itemMap.has(itemName)) {
        itemMap.set(itemName, { item: itemName, total: 0, count: 0, color: itemColor });
      }

      const curr = itemMap.get(itemName)!;
      curr.total += Math.abs(e.amount);
      curr.count += 1;
    });

    return Array.from(itemMap.values()).sort((a, b) => b.total - a.total);
  }, [filteredCashLedger]);

  const mostPurchasedItem = purchasesData[0] || null;
  const totalPurchasesAmount = purchasesData.reduce((sum, p) => sum + p.total, 0);

  // ==========================================
  // 5. PRODUCCIÓN & RENDIMIENTO
  // ==========================================
  const operatorData = employees
    .filter((e) => e.contract_type === "destajo")
    .map((e) => {
      const qty = batches
        .filter((b) => b.operator_id === e.id)
        .reduce((sum, b) => sum + b.quantity_produced, 0);
      return {
        name: e.full_name.split(" ")[0],
        unidades: qty
      };
    });

  const STOCK_COLORS = ["#F59E0B", "#F97316", "#10B981"];
  const stockPieData = [
    {
      name: "Patio Secado",
      value: stock.filter((s) => s.location === "patio_secado").reduce((sum, s) => sum + s.quantity, 0)
    },
    {
      name: "Horno Quema",
      value: stock.filter((s) => s.location === "horno").reduce((sum, s) => sum + s.quantity, 0)
    },
    {
      name: "Bodega Listo",
      value: stock.filter((s) => s.location === "bodega_terminado").reduce((sum, s) => sum + s.quantity, 0)
    }
  ];

  const marginData = brickTypes.map((bt) => ({
    fullName: bt.name,
    type: bt.name.split(" ")[1] || bt.name,
    precioVenta: bt.sale_price,
    costoEst: bt.estimated_cost || 0,
    margenBruto: (bt.sale_price - (bt.estimated_cost || 0)).toFixed(2)
  }));

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Header title="Reportes Analíticos & Métricas de Fábrica" />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Barra Superior de Control y Filtros */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-700">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  Centro de Inteligencia y Reportes Financieros
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Libro de compra y venta, análisis de ventas pico, ranking de insumos y estructura de costos de INCEGUA S.R.L.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Botones de Modo de Filtro */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
                  }`}
                >
                  Todo
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("30days")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === "30days" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
                  }`}
                >
                  Últimos 30 días
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("month")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === "month"
                      ? "bg-orange-500 text-white shadow-xs font-bold"
                      : "hover:text-slate-900"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Por Mes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("custom")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === "custom"
                      ? "bg-orange-500 text-white shadow-xs font-bold"
                      : "hover:text-slate-900"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Fecha Personalizada</span>
                </button>
              </div>

              {/* Botón Imprimir / Exportar */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>

          {/* Sub-barra de Filtros Dinámicos: Por Mes */}
          {filterType === "month" && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-orange-50/60 p-3.5 rounded-xl border border-orange-200/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-slate-800">Seleccionar Mes del Libro y Reportes:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthName(m)}
                    </option>
                  ))}
                </select>

                <span className="text-xs text-slate-400 font-medium">o elegir en calendario:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs cursor-pointer"
                />
              </div>
              <div className="text-xs text-orange-800 font-semibold bg-white/70 px-3 py-1 rounded-lg border border-orange-200">
                Mostrando: <strong>{formatMonthName(selectedMonth)}</strong> ({filteredCashLedger.length} asientos)
              </div>
            </div>
          )}

          {/* Sub-barra de Filtros Dinámicos: Rango Personalizado */}
          {filterType === "custom" && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800">Filtrar por Rango de Fechas Personalizado:</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Desde:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Hasta:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs cursor-pointer"
                  />
                </div>
                {(customStartDate || customEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate("");
                      setCustomEndDate("");
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline font-semibold cursor-pointer"
                  >
                    Restablecer fechas
                  </button>
                )}
              </div>
              <div className="text-xs text-amber-900 font-semibold bg-white/70 px-3 py-1 rounded-lg border border-amber-200">
                Período: <strong>{customStartDate || "Inicio"}</strong> al <strong>{customEndDate || "Hoy"}</strong> ({filteredCashLedger.length} asientos)
              </div>
            </div>
          )}
        </div>

        {/* Pestañas de Navegación de Reportes */}
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-2 pb-1">
          <button
            onClick={() => setActiveTab("libro")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "libro"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Libro Compra y Venta</span>
          </button>

          <button
            onClick={() => setActiveTab("ventas")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "ventas"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Ventas & Días Récord</span>
          </button>

          <button
            onClick={() => setActiveTab("gastos")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "gastos"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Gastos y Tipos de Gasto</span>
          </button>

          <button
            onClick={() => setActiveTab("compras")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "compras"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Insumos Más Comprados</span>
          </button>

          <button
            onClick={() => setActiveTab("produccion")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "produccion"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Producción & Margen</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: LIBRO DE COMPRA Y VENTA                           */}
        {/* ========================================================= */}
        {activeTab === "libro" && (
          <div className="space-y-6">
            {/* Tarjetas KPI Financieras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Ventas (Ingresos)</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-slate-900">
                    Bs. {totalIngresos.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Facturación acumulada
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Compras & Gastos</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-slate-900">
                    Bs. {totalEgresos.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    Insumos, combustible, planillas y mtto.
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Saldo Neto Operativo</span>
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-emerald-600">
                    Bs. {saldoNeto.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Utilidad neta generada en el período</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Margen Neto %</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-slate-900">{margenNetoPct}%</div>
                  <p className="text-[11px] text-indigo-600 font-semibold mt-1">Rentabilidad sobre ventas</p>
                </div>
              </div>
            </div>

            {/* Gráfico Comparativo: Entradas vs Salidas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Flujo de Caja: Ingresos vs Egresos Diarios</h4>
                  <p className="text-xs text-slate-500">Comparativa cronológica de ventas cobradas vs pagos efectuados</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600">Ingresos (Ventas)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span className="text-slate-600">Egresos (Compras/Gastos)</span>
                  </div>
                </div>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowByDate}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="fecha" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip
                      formatter={(value: any) => [
                        `Bs. ${Number(value).toLocaleString("es-BO", { minimumFractionDigits: 2 })}`
                      ]}
                    />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="egresos" name="Egresos" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: VENTAS & DÍAS RÉCORD                              */}
        {/* ========================================================= */}
        {activeTab === "ventas" && (
          <div className="space-y-6">
            {/* Banner Especial: Día con Mayor Venta */}
            {bestSalesDay && (
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
                  <Award className="w-56 h-56" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                      Récord Histórico de Facturación
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                      Día con Más Ventas: {bestSalesDay.fecha}
                    </h3>
                    <p className="text-white/90 text-sm mt-1 max-w-xl">
                      En esta jornada la fábrica alcanzó su mayor recaudación diaria con pedidos mayoristas a constructoras.
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center min-w-[200px]">
                    <div className="text-xs uppercase tracking-wider text-yellow-100 font-bold">Total Facturado ese Día</div>
                    <div className="text-3xl font-black text-white mt-1">
                      Bs. {bestSalesDay.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-white/80 mt-1 font-medium">
                      {bestSalesDay.unidades.toLocaleString()} unidades despachadas
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gráficos de Ventas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico 1: Ventas por Día */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Cronología de Ventas por Fecha</h4>
                    <p className="text-xs text-slate-500">Monto total vendido por cada jornada</p>
                  </div>
                  <Calendar className="w-5 h-5 text-orange-500" />
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="fecha" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip
                        formatter={(val: any) => [
                          `Bs. ${Number(val).toLocaleString("es-BO", { minimumFractionDigits: 2 })}`,
                          "Ventas"
                        ]}
                      />
                      <Bar dataKey="total" fill="#EA580C" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Ladrillos Más Vendidos */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Top Ladrillos Más Vendidos</h4>
                    <p className="text-xs text-slate-500">Volumen total de piezas entregadas</p>
                  </div>
                  <Award className="w-5 h-5 text-amber-500" />
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topSellingBricks.slice(0, 5).map((b) => ({
                        name: b.name.replace("Ladrillo ", ""),
                        unidades: b.unidades
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                      <XAxis type="number" stroke="#64748B" fontSize={11} />
                      <YAxis dataKey="name" type="category" width={110} stroke="#64748B" fontSize={11} />
                      <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} unidades`, "Vendidos"]} />
                      <Bar dataKey="unidades" fill="#F59E0B" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabla Analítica de Ventas */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Registro Detallado de Ventas</h4>
                  <p className="text-xs text-slate-500">Listado con cliente, unidades y método de pago</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Total Operaciones: <strong className="text-slate-800">{filteredSales.length}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="p-3.5">ID Venta</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Ladrillos / Ítems</th>
                      <th className="p-3.5">Método de Pago</th>
                      <th className="p-3.5 text-right">Total Facturado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.map((sale) => {
                      const isRecordDay = bestSalesDay && sale.created_at?.startsWith(bestSalesDay.fecha);
                      return (
                        <tr key={sale.id} className={`hover:bg-slate-50 transition ${isRecordDay ? "bg-amber-50/40" : ""}`}>
                          <td className="p-3.5 font-mono font-bold text-slate-800">{sale.id}</td>
                          <td className="p-3.5 font-mono text-slate-600">
                            {sale.created_at ? sale.created_at.slice(0, 10) : "-"}
                            {isRecordDay && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-200 text-amber-800">
                                DÍA RÉCORD
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">{sale.customer?.name || "Venta Directa"}</td>
                          <td className="p-3.5 text-slate-600">
                            {(sale.items || [])
                              .map((it: any) => `${it.quantity?.toLocaleString()}x ${it.brick_type?.name || "Ladrillo"}`)
                              .join(", ")}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {sale.payment_method}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                            Bs. {sale.total_amount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GASTOS Y TIPOS DE GASTO                           */}
        {/* ========================================================= */}
        {activeTab === "gastos" && (
          <div className="space-y-6">
            {/* KPI Cards de Gastos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gasto Total Operativo</span>
                <div className="text-2xl font-black text-rose-600 mt-2">
                  Bs. {totalEgresos.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 mt-1">Egresos totales contabilizados</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoría con Mayor Gasto</span>
                <div className="text-xl font-black text-slate-900 mt-2">
                  {topExpenseCategory ? topExpenseCategory.label : "Insumos"}
                </div>
                <p className="text-xs text-orange-600 font-semibold mt-1">
                  Bs. {topExpenseCategory?.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })} acumulados
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cantidad de Pagos/Egresos</span>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {filteredCashLedger.filter((e) => e.amount < 0).length} operaciones
                </div>
                <p className="text-xs text-slate-400 mt-1">Transacciones registradas en caja</p>
              </div>
            </div>

            {/* Gráficos de Gastos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribución Circular */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Distribución de Gastos por Categoría</h4>
                    <p className="text-xs text-slate-500">Porcentaje de costo operativo por área</p>
                  </div>
                  <PieIcon className="w-5 h-5 text-rose-500" />
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="total"
                      >
                        {expensesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [
                          `Bs. ${Number(val).toLocaleString("es-BO", { minimumFractionDigits: 2 })}`,
                          "Monto"
                        ]}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comparativa por Categoría de Gasto */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Montos Acumulados por Tipo de Gasto</h4>
                    <p className="text-xs text-slate-500">Comparativa directa en Bolivianos (Bs.)</p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expensesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="label" stroke="#64748B" fontSize={10} tickFormatter={(t) => t.split(" ")[0]} />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip
                        formatter={(val: any) => [
                          `Bs. ${Number(val).toLocaleString("es-BO", { minimumFractionDigits: 2 })}`,
                          "Total"
                        ]}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {expensesData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabla Detallada de Tipos de Gastos */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">Desglose Consolidado por Tipo de Gasto</h4>
                <p className="text-xs text-slate-500">Incidencia porcentual sobre el total de egresos operativos</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="p-3.5">Tipo / Categoría de Gasto</th>
                      <th className="p-3.5 text-center">N° Operaciones</th>
                      <th className="p-3.5 text-right">Monto Total (Bs.)</th>
                      <th className="p-3.5 text-right">% del Gasto Total</th>
                      <th className="p-3.5 text-right">Promedio por Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expensesData.map((exp) => {
                      const pct = totalEgresos > 0 ? ((exp.total / totalEgresos) * 100).toFixed(1) : "0";
                      const avg = exp.count > 0 ? exp.total / exp.count : 0;
                      return (
                        <tr key={exp.category} className="hover:bg-slate-50 transition">
                          <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: exp.color }} />
                            <span>{exp.label}</span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-semibold text-slate-700">{exp.count}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                            Bs. {exp.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-orange-600">{pct}%</td>
                          <td className="p-3.5 text-right font-mono text-slate-500">
                            Bs. {avg.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: COMPRAS - QUÉ ES LO QUE MÁS SE HA COMPRADO        */}
        {/* ========================================================= */}
        {activeTab === "compras" && (
          <div className="space-y-6">
            {/* Banner del Insumo Más Comprado */}
            {mostPurchasedItem && (
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-black uppercase tracking-wider mb-2">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      Insumo Principal de Producción
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                      Lo que más se ha comprado: {mostPurchasedItem.item}
                    </h3>
                    <p className="text-slate-300 text-sm mt-1 max-w-xl">
                      La leña dura de tajibo, curupaú y cencerro representa el insumo de mayor inversión de la fábrica para el proceso de quema en hornos continuos.
                    </p>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-center min-w-[200px]">
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Monto Acumulado en Compras</div>
                    <div className="text-3xl font-black text-orange-400 mt-1">
                      Bs. {mostPurchasedItem.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-300 mt-1 font-semibold">
                      {((mostPurchasedItem.total / (totalPurchasesAmount || 1)) * 100).toFixed(1)}% del total de compras
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gráfico: Ranking de Insumos Más Comprados */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Ranking de Insumos y Materiales Comprados</h4>
                  <p className="text-xs text-slate-500">Monto total invertido por tipo de material</p>
                </div>
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={purchasesData}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" stroke="#64748B" fontSize={11} />
                    <YAxis dataKey="item" type="category" width={180} stroke="#64748B" fontSize={11} />
                    <Tooltip
                      formatter={(val: any) => [
                        `Bs. ${Number(val).toLocaleString("es-BO", { minimumFractionDigits: 2 })}`,
                        "Monto Comprado"
                      ]}
                    />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                      {purchasesData.map((entry, index) => (
                        <Cell key={`pbar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla Detallada de Compras de Insumos */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Historial de Compras de Insumos</h4>
                  <p className="text-xs text-slate-500">Detalle de compras de leña, arcilla, tierra y aditivos</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Total Compras: <strong className="text-slate-800">{purchasesData.reduce((acc, p) => acc + p.count, 0)}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Insumo / Material</th>
                      <th className="p-3.5">Descripción de la Compra</th>
                      <th className="p-3.5 text-right">Monto Invertido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCashLedger
                      .filter((e) => e.amount < 0 && e.category === "compra_insumo")
                      .map((p) => {
                        const isWood = p.description.toLowerCase().includes("leña");
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition">
                            <td className="p-3.5 font-mono text-slate-600 font-medium">{p.movement_date}</td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isWood
                                    ? "bg-orange-100 text-orange-800 border border-orange-200"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {isWood ? "Leña para Hornos" : "Materia Prima / Insumo"}
                              </span>
                            </td>
                            <td className="p-3.5 font-semibold text-slate-800">{p.description}</td>
                            <td className="p-3.5 text-right font-mono font-black text-rose-600 text-sm">
                              Bs. {Math.abs(p.amount).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: PRODUCCIÓN & PLANTA (EXISTENTE PRESERVADO)         */}
        {/* ========================================================= */}
        {activeTab === "produccion" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rendimiento Moldeadores */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
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

              {/* Distribución Stock */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
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
                          <Cell key={`stock-cell-${index}`} fill={STOCK_COLORS[index % STOCK_COLORS.length]} />
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
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <h4 className="font-bold text-slate-800 text-sm mb-3">Análisis de Margen de Ganancia por Producto</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <th className="pb-3">Nombre del Ladrillo</th>
                      <th className="pb-3">Tipo</th>
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
        )}
      </div>
    </>
  );
}
