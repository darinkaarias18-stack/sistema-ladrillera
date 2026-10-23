"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import {
  PatioDespacho,
  PatioDespachoEstado,
  PatioTipoRetiro,
  BrickType,
  Customer,
  Employee,
  ProductionBatch
} from "@/types/database.types";
import { getTodayDateString } from "@/lib/dates";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Warehouse,
  Truck,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  User,
  Phone,
  Printer,
  X,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  MessageCircle,
  PackageCheck,
  TimerReset,
  Boxes,
  Flame,
  TrendingUp,
  Sparkles,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  ChevronRight
} from "lucide-react";

const BAHIAS_CONFIG = [
  { id: "Bahía 1", name: "Bahía 1 - Ladrillo 6H Principal", capacityDesc: "Camiones de alto tonelaje (10k - 20k unid)" },
  { id: "Bahía 2", name: "Bahía 2 - Ladrillos 25CM & Especiales", capacityDesc: "Plataformas medias y volquetas (5k - 10k unid)" },
  { id: "Bahía 3", name: "Bahía 3 - Carga Paletizada / Rápida", capacityDesc: "Carga rápida con montacargas" },
  { id: "Bahía 4", name: "Bahía 4 - Retiros Menores / Camionetas", capacityDesc: "Retiros menores (1k - 4k unid)" },
];

// Stock base inicial antes de los vaciados registrados en el sistema
const INITIAL_BASE_STOCKS: Record<string, number> = {
  "brick-1": 15000, // Ladrillo 6H Normal 1ra
  "brick-2": 4500,  // Ladrillo 6H Normal 2da
  "brick-3": 12000, // Ladrillo 6H 25CM 1ra
  "brick-4": 3500,  // Ladrillo 6H 25CM 2da
  "brick-5": 5000,  // Ladrillo 6H Cuadrado 1ra
  "brick-6": 2000,  // Ladrillo 6H Cuadrado 2da
  "brick-7": 1500,  // Ladrillo 6H Cuadrado Partido
  "brick-8": 1000,  // Ladrillo Grande Rep de Hornos
  "brick-9": 6000,  // Ladrillo 2H 1ra
  "brick-10": 2500, // Ladrillo 2H 2da
  "brick-11": 3000, // Adobitos Máquina
  "brick-12": 2000, // Adobitos Manual
  "brick-13": 2500, // Piso o Tojo
  "brick-14": 1500, // Bota Agua Casa
  "brick-15": 1200, // Celosías Estrella
  "brick-16": 1800, // Trabas
  "brick-17": 4000, // Tejas
};

export default function PatioEntregasPage() {
  const [despachos, setDespachos] = useState<PatioDespacho[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filtros de Despachos
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<string>("todos");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  // Control del Balance de Stock (Alimentado de Vaciados)
  const [stockViewMode, setStockViewMode] = useState<"acumulado" | "fecha">("acumulado");
  const [selectedStockDate, setSelectedStockDate] = useState<string>(getTodayDateString());
  const [brickSearchTerm, setBrickSearchTerm] = useState("");

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [printDespacho, setPrintDespacho] = useState<PatioDespacho | null>(null);

  // Formulario de Nuevo Despacho
  const [formData, setFormData] = useState({
    fecha: getTodayDateString(),
    hora_ingreso: "08:30",
    cliente_id: "",
    cliente_nombre: "",
    placa_camion: "",
    chofer_nombre: "",
    chofer_telefono: "",
    tipo_retiro: "cliente_recojo" as PatioTipoRetiro,
    bahia_carga: "Bahía 1",
    cuadrilla_estibadores: "Carlos Rivera & Cuadrilla de Patio",
    encargado_patio: "Darinka Arias (Encargada de Patio)",
    notes: "",
    estado: "en_carguio" as PatioDespachoEstado,
  });

  // Ítems a despachar en el modal
  const [selectedItems, setSelectedItems] = useState<{ brick_type_id: string; brick_name: string; cantidad: number }[]>([]);

  const loadData = () => {
    setDespachos(store.getPatioDespachos());
    setBatches(store.getProductionBatches());
    const bricks = store.getBrickTypes().filter((b) => b.active);
    setBrickTypes(bricks);
    setCustomers(store.getCustomers());
    setEmployees(store.getEmployees().filter((e) => e.active));

    if (bricks.length > 0 && selectedItems.length === 0) {
      setSelectedItems([{ brick_type_id: bricks[0].id, brick_name: bricks[0].name, cantidad: 4000 }]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fechas disponibles con actividad de vaciados o despachos
  const availableStockDates = useMemo(() => {
    const datesSet = new Set<string>();
    datesSet.add(getTodayDateString());
    batches.forEach((b) => {
      if (b.production_date) datesSet.add(b.production_date);
    });
    despachos.forEach((d) => {
      if (d.fecha) datesSet.add(d.fecha);
    });
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [batches, despachos]);

  // =========================================================================
  // CÁLCULO DE STOCK ANTERIOR Y ACTUALIZADO POR TIPO DE LADRILLO & TOTALES
  // (Alimentado directamente de la sección de Vaciados y Despachos de Patio)
  // =========================================================================
  const stockSummaryPerBrick = useMemo(() => {
    return brickTypes.map((bt) => {
      const baseStock = INITIAL_BASE_STOCKS[bt.id] ?? 2500;

      if (stockViewMode === "acumulado") {
        // 1. Vaciados totales producidos para este ladrillo (alimentado de /produccion)
        const dayBatches = batches.filter((b) => b.brick_type_id === bt.id);
        const vaciadosIngreso = dayBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
        const vaciadosCount = dayBatches.length;

        // 2. Salidas totales despachadas en patio para este ladrillo
        const despachosSalida = despachos
          .filter((d) => d.estado === "despachado")
          .reduce((sum, d) => {
            const item = (d.items || []).find((i) => i.brick_type_id === bt.id);
            return sum + (item ? item.cantidad : 0);
          }, 0);

        // 3. Stock Anterior e Inventario Actualizado
        const stockAnterior = baseStock;
        const stockActualizado = Math.max(0, stockAnterior + vaciadosIngreso - despachosSalida);

        return {
          brick: bt,
          stockAnterior,
          vaciadosIngreso,
          vaciadosCount,
          despachosSalida,
          stockActualizado,
        };
      } else {
        // Modo por fecha seleccionada
        const targetDate = selectedStockDate;

        // Vaciados anteriores a la fecha seleccionada
        const prevBatches = batches.filter(
          (b) => b.brick_type_id === bt.id && b.production_date < targetDate
        );
        const prevVaciados = prevBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);

        // Despachos anteriores a la fecha seleccionada
        const prevDespachos = despachos
          .filter((d) => d.estado === "despachado" && d.fecha < targetDate)
          .reduce((sum, d) => {
            const item = (d.items || []).find((i) => i.brick_type_id === bt.id);
            return sum + (item ? item.cantidad : 0);
          }, 0);

        // Stock anterior antes de iniciar el día seleccionado
        const stockAnterior = Math.max(0, baseStock + prevVaciados - prevDespachos);

        // Vaciados del día
        const dayBatches = batches.filter(
          (b) => b.brick_type_id === bt.id && b.production_date === targetDate
        );
        const vaciadosIngreso = dayBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
        const vaciadosCount = dayBatches.length;

        // Despachos del día
        const despachosSalida = despachos
          .filter((d) => d.estado === "despachado" && d.fecha === targetDate)
          .reduce((sum, d) => {
            const item = (d.items || []).find((i) => i.brick_type_id === bt.id);
            return sum + (item ? item.cantidad : 0);
          }, 0);

        const stockActualizado = Math.max(0, stockAnterior + vaciadosIngreso - despachosSalida);

        return {
          brick: bt,
          stockAnterior,
          vaciadosIngreso,
          vaciadosCount,
          despachosSalida,
          stockActualizado,
        };
      }
    });
  }, [brickTypes, batches, despachos, stockViewMode, selectedStockDate]);

  // Totales globales consolidados (Fórmula: Stock Anterior + Vaciados - Despachos = Stock Actualizado)
  const totalStockSummary = useMemo(() => {
    return stockSummaryPerBrick.reduce(
      (acc, curr) => ({
        stockAnterior: acc.stockAnterior + curr.stockAnterior,
        vaciadosIngreso: acc.vaciadosIngreso + curr.vaciadosIngreso,
        despachosSalida: acc.despachosSalida + curr.despachosSalida,
        stockActualizado: acc.stockActualizado + curr.stockActualizado,
      }),
      { stockAnterior: 0, vaciadosIngreso: 0, despachosSalida: 0, stockActualizado: 0 }
    );
  }, [stockSummaryPerBrick]);

  // Lista filtrada de tipos de ladrillos en la tabla de stock
  const filteredStockRows = useMemo(() => {
    if (!brickSearchTerm.trim()) return stockSummaryPerBrick;
    const q = brickSearchTerm.toLowerCase();
    return stockSummaryPerBrick.filter((row) =>
      row.brick.name.toLowerCase().includes(q) ||
      (row.brick.dimensions && row.brick.dimensions.toLowerCase().includes(q))
    );
  }, [stockSummaryPerBrick, brickSearchTerm]);

  // Métricas operativas secundarias
  const operationalStats = useMemo(() => {
    const today = getTodayDateString();
    const hoyDespachos = despachos.filter((d) => d.fecha === today);
    const completadosHoy = hoyDespachos.filter((d) => d.estado === "despachado");
    const enCarguio = despachos.filter((d) => d.estado === "en_carguio");
    const unidadesHoy = completadosHoy.reduce((sum, d) => sum + d.total_unidades, 0);

    return {
      camionesEnPatio: enCarguio.length,
      despachadosHoyCount: completadosHoy.length,
      unidadesDespachadasHoy: unidadesHoy,
    };
  }, [despachos]);

  // Bahías con camión asignado en tiempo real
  const bahiasStatus = useMemo(() => {
    return BAHIAS_CONFIG.map((b) => {
      const active = despachos.find(
        (d) => d.bahia_carga.includes(b.id) && d.estado === "en_carguio"
      );
      return {
        ...b,
        currentDespacho: active || null,
      };
    });
  }, [despachos]);

  // Filtrado de la tabla de despachos
  const filteredDespachos = useMemo(() => {
    return despachos.filter((d) => {
      if (selectedEstadoFilter !== "todos" && d.estado !== selectedEstadoFilter) return false;
      if (selectedDateFilter && d.fecha !== selectedDateFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchPlaca = d.placa_camion.toLowerCase().includes(q);
        const matchChofer = d.chofer_nombre.toLowerCase().includes(q);
        const matchCliente = d.cliente_nombre.toLowerCase().includes(q);
        const matchFolio = d.folio.toLowerCase().includes(q);
        if (!matchPlaca && !matchChofer && !matchCliente && !matchFolio) return false;
      }
      return true;
    });
  }, [despachos, selectedEstadoFilter, selectedDateFilter, searchTerm]);

  // Abrir modal con bahía y/o tipo de ladrillo preasignado
  const handleOpenNewModal = (bahiaId?: string, preselectedBrickId?: string) => {
    setFormData((prev) => ({
      ...prev,
      fecha: getTodayDateString(),
      hora_ingreso: new Date().toTimeString().substring(0, 5),
      bahia_carga: bahiaId || "Bahía 1",
    }));

    if (preselectedBrickId) {
      const chosen = brickTypes.find((b) => b.id === preselectedBrickId);
      if (chosen) {
        setSelectedItems([{ brick_type_id: chosen.id, brick_name: chosen.name, cantidad: 4000 }]);
      }
    } else if (brickTypes.length > 0 && selectedItems.length === 0) {
      setSelectedItems([{ brick_type_id: brickTypes[0].id, brick_name: brickTypes[0].name, cantidad: 4000 }]);
    }

    setIsNewModalOpen(true);
  };

  // Agregar fila de ítem en despacho
  const handleAddItemRow = () => {
    if (brickTypes.length > 0) {
      setSelectedItems([
        ...selectedItems,
        { brick_type_id: brickTypes[0].id, brick_name: brickTypes[0].name, cantidad: 1000 },
      ]);
    }
  };

  const handleRemoveItemRow = (idx: number) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== idx));
    }
  };

  // Guardar Despacho
  const handleSaveDespacho = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_nombre.trim() || !formData.placa_camion.trim() || !formData.chofer_nombre.trim()) {
      alert("Por favor ingrese el cliente, placa del camión y nombre del chofer.");
      return;
    }

    const totalUnidades = selectedItems.reduce((sum, item) => sum + Number(item.cantidad), 0);
    if (totalUnidades <= 0) {
      alert("La cantidad de ladrillos a despachar debe ser mayor a 0.");
      return;
    }

    store.addPatioDespacho({
      fecha: formData.fecha,
      hora_ingreso: formData.hora_ingreso,
      cliente_id: formData.cliente_id || undefined,
      cliente_nombre: formData.cliente_nombre,
      placa_camion: formData.placa_camion,
      chofer_nombre: formData.chofer_nombre,
      chofer_telefono: formData.chofer_telefono,
      tipo_retiro: formData.tipo_retiro,
      bahia_carga: formData.bahia_carga,
      items: selectedItems.map((item) => ({
        ...item,
        cantidad: Number(item.cantidad),
      })),
      total_unidades: totalUnidades,
      cuadrilla_estibadores: formData.cuadrilla_estibadores,
      estado: formData.estado,
      encargado_patio: formData.encargado_patio,
      notes: formData.notes,
    });

    setIsNewModalOpen(false);
    loadData();
  };

  // Finalizar y despachar camión
  const handleFinalizarDespacho = (despachoId: string) => {
    const horaSalida = new Date().toTimeString().substring(0, 5);
    store.updatePatioDespachoEstado(despachoId, "despachado", horaSalida);
    loadData();
  };

  // WhatsApp de Salida de Patio
  const sendWhatsAppTicket = (d: PatioDespacho) => {
    let msg = `*PASE DE SALIDA DE PATIO - INCEGUA S.R.L.*\n\n`;
    msg += `*Folio:* ${d.folio}\n`;
    msg += `*Fecha/Hora:* ${d.fecha} - ${d.hora_ingreso} a ${d.hora_salida || "En curso"}\n`;
    msg += `*Cliente:* ${d.cliente_nombre}\n`;
    msg += `*Camión / Placa:* ${d.placa_camion}\n`;
    msg += `*Chofer:* ${d.chofer_nombre}\n`;
    msg += `*Bahía:* ${d.bahia_carga}\n`;
    msg += `*Total Despachado:* ${d.total_unidades.toLocaleString()} ladrillos\n\n`;
    msg += `*Detalle Cargado:*\n`;
    d.items.forEach((item) => {
      msg += `- ${item.cantidad.toLocaleString()} x ${item.brick_name}\n`;
    });
    if (d.cuadrilla_estibadores) msg += `\n*Estibadores:* ${d.cuadrilla_estibadores}\n`;
    msg += `*Encargado de Patio:* ${d.encargado_patio}\n`;

    const phone = d.chofer_telefono?.replace(/\D/g, "") || "59169370911";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
      <Header title="Producción • Patio de Entregas" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Banner Superior Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <Truck className="w-64 h-64 text-white" />
          </div>

          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-indigo-200">
              <Warehouse className="w-3.5 h-3.5 text-indigo-300" />
              <span>Operaciones de Despacho & Plataformas de Carga</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Patio de Entregas & Control de Bahías
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Gestiona el ingreso y salida de camiones en fábrica, asignación de bahías de carguío y balance de stock sincronizado en tiempo real con los vaciados de producción.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <Link
              href="/produccion"
              className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-xs"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Ver Vaciados de Planta</span>
            </Link>

            <button
              onClick={() => handleOpenNewModal()}
              className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all transform active:scale-95 text-xs"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Despacho en Patio</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            PANEL DE ECUACIÓN DE INVENTARIO: STOCK ANTERIOR, VACIADOS Y ACTUALIZADO
            ========================================================================= */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                <span>Balance de Inventario en Patio (Total General de Planta)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Ecuación de stock en tiempo real: <span className="font-semibold text-slate-700">Stock Anterior + Vaciados Producidos - Despachos = Stock Actualizado</span>
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs font-semibold">
              <button
                onClick={() => setStockViewMode("acumulado")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  stockViewMode === "acumulado"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                🌐 Acumulado Total
              </button>
              <button
                onClick={() => setStockViewMode("fecha")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  stockViewMode === "fecha"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                📅 Balance por Fecha
              </button>
            </div>
          </div>

          {/* Tarjetas Matemáticas Enlazadas (Stock Anterior + Vaciados - Despachos = Stock Actualizado) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. STOCK ANTERIOR */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Stock Anterior
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 font-mono mt-2">
                  {totalStockSummary.stockAnterior.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-400 font-sans">unid</span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <span>Inventario base en patio/bodega</span>
              </p>
            </div>

            {/* 2. (+) INGRESOS POR VACIADOS */}
            <div className="bg-gradient-to-br from-orange-50/70 to-amber-50/50 p-5 rounded-2xl border border-orange-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100 px-2 py-0.5 rounded-md border border-orange-200">
                    (+) Ingreso por Vaciados
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-orange-700 font-mono mt-2">
                  +{totalStockSummary.vaciadosIngreso.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-orange-900/60 font-sans">unid</span>
                </h3>
              </div>
              <p className="text-[11px] text-orange-800 font-semibold mt-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>Alimentado de Vaciados ({batches.length} lotes)</span>
              </p>
            </div>

            {/* 3. (-) SALIDAS POR DESPACHOS */}
            <div className="bg-gradient-to-br from-rose-50/70 to-red-50/40 p-5 rounded-2xl border border-rose-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                    (-) Salidas por Despacho
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-xs">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-rose-700 font-mono mt-2">
                  -{totalStockSummary.despachosSalida.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-rose-900/60 font-sans">unid</span>
                </h3>
              </div>
              <p className="text-[11px] text-rose-800 font-semibold mt-2 flex items-center gap-1">
                <span>Cargas entregadas en camión</span>
              </p>
            </div>

            {/* 4. (=) STOCK ACTUALIZADO DISPONIBLE */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl border-2 border-emerald-400 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
                    (=) Stock Actualizado
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-emerald-800 font-mono mt-2">
                  {totalStockSummary.stockActualizado.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-emerald-900/60 font-sans">unid</span>
                </h3>
              </div>
              <p className="text-[11px] text-emerald-800 font-bold mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Disponible en Patio para Entrega Inmediata</span>
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TABLA DETALLADA: BALANCE DE STOCK EN PATIO POR TIPO DE LADRILLO
            ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-base font-extrabold text-slate-800">
                  Balance de Stock en Patio por Tipo de Ladrillo
                </h3>
                <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full border border-orange-200">
                  Alimentado de Vaciados
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {stockViewMode === "acumulado"
                  ? "Visualizando inventario acumulado global por tipo de producto cerámico."
                  : `Visualizando balance correspondiente a la fecha: ${selectedStockDate}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Selector de Fecha si está en modo fecha */}
              {stockViewMode === "fecha" && (
                <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-600">Fecha:</span>
                  <select
                    value={selectedStockDate}
                    onChange={(e) => setSelectedStockDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-hidden text-xs"
                  >
                    {availableStockDates.map((d) => (
                      <option key={d} value={d}>
                        {d} {d === getTodayDateString() ? "(Hoy)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Buscador de Ladrillo */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar ladrillo..."
                  value={brickSearchTerm}
                  onChange={(e) => setBrickSearchTerm(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg w-44 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <button
                onClick={loadData}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Refrescar balance"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-200">
                  <th className="py-3 px-4">Tipo de Ladrillo & Especificaciones</th>
                  <th className="py-3 px-4 text-right">Stock Anterior</th>
                  <th className="py-3 px-4 text-right text-orange-700 bg-orange-50/30">
                    (+) Vaciados Producidos
                  </th>
                  <th className="py-3 px-4 text-right text-rose-700 bg-rose-50/20">
                    (-) Salidas Patio
                  </th>
                  <th className="py-3 px-4 text-right text-emerald-800 bg-emerald-50/40">
                    (=) Stock Actualizado
                  </th>
                  <th className="py-3 px-4 text-center">Nivel de Stock</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStockRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No se encontraron tipos de ladrillo con el filtro ingresado.
                    </td>
                  </tr>
                ) : (
                  filteredStockRows.map((row) => {
                    const isOptimal = row.stockActualizado >= 10000;
                    const isLow = row.stockActualizado < 3000;

                    return (
                      <tr key={row.brick.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Nombre y dimensiones */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <Boxes className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-800 block text-xs">
                                {row.brick.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {row.brick.dimensions || "Dimensiones estándar"} • Bs. {row.brick.sale_price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Stock Anterior */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-600 text-xs">
                          {row.stockAnterior.toLocaleString()}{" "}
                          <span className="text-[10px] font-normal text-slate-400">unid</span>
                        </td>

                        {/* (+) Vaciados Producidos */}
                        <td className="py-3.5 px-4 text-right bg-orange-50/30">
                          <span className="inline-flex items-center font-mono font-black text-orange-700 text-xs">
                            +{row.vaciadosIngreso.toLocaleString()}{" "}
                            <span className="text-[10px] font-normal text-orange-800/60 ml-0.5">unid</span>
                          </span>
                          {row.vaciadosCount > 0 && (
                            <span className="block text-[10px] text-orange-600/80 font-semibold">
                              {row.vaciadosCount} vaciado{row.vaciadosCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </td>

                        {/* (-) Salidas Patio */}
                        <td className="py-3.5 px-4 text-right bg-rose-50/20">
                          <span className="inline-flex items-center font-mono font-black text-rose-700 text-xs">
                            {row.despachosSalida > 0 ? `-${row.despachosSalida.toLocaleString()}` : "0"}{" "}
                            <span className="text-[10px] font-normal text-rose-800/60 ml-0.5">unid</span>
                          </span>
                        </td>

                        {/* (=) Stock Actualizado */}
                        <td className="py-3.5 px-4 text-right bg-emerald-50/40">
                          <span className="inline-flex items-center font-mono font-black text-emerald-800 text-sm">
                            {row.stockActualizado.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 ml-1">unid</span>
                        </td>

                        {/* Estado / Nivel de Stock */}
                        <td className="py-3.5 px-4 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle className="w-3 h-3 mr-1 text-rose-600" /> Stock Bajo
                            </span>
                          ) : isOptimal ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Stock Óptimo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              Stock Normal
                            </span>
                          )}
                        </td>

                        {/* Acción Rápida */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenNewModal(undefined, row.brick.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold transition-colors shadow-2xs cursor-pointer"
                            title="Despachar este ladrillo a un camión"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Despachar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Fila de Totales de la Tabla */}
              <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-4 uppercase text-[11px] font-black">
                    TOTAL PLANTA ({filteredStockRows.length} tipos):
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-700 text-xs">
                    {totalStockSummary.stockAnterior.toLocaleString()} unid
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-orange-700 text-xs bg-orange-100/50">
                    +{totalStockSummary.vaciadosIngreso.toLocaleString()} unid
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-xs bg-rose-100/40">
                    -{totalStockSummary.despachosSalida.toLocaleString()} unid
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-900 text-sm bg-emerald-100/60">
                    {totalStockSummary.stockActualizado.toLocaleString()} unid
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-center text-xs text-slate-500 font-semibold">
                    Balance cuadra 100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* =========================================================================
            BAHÍAS DE CARGA EN PATIO (GRID DE 4 BAHÍAS)
            ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-indigo-600" />
                <span>Bahías de Carguío en Patio</span>
              </h2>
              <p className="text-xs text-slate-500">
                Disponibilidad y estado de las plataformas de estibado en planta.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="font-semibold text-slate-600">
                Camiones en Patio: <strong className="text-amber-700 font-bold">{operationalStats.camionesEnPatio}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-slate-600">
                Despachados Hoy: <strong className="text-emerald-700 font-bold">{operationalStats.despachadosHoyCount}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {bahiasStatus.map((b) => {
              const d = b.currentDespacho;
              const isOccupied = d !== null;

              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 ${
                    isOccupied
                      ? "bg-gradient-to-b from-amber-50/80 to-white border-amber-300 shadow-md ring-1 ring-amber-200"
                      : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{b.name}</h4>
                        <p className="text-[10px] text-slate-400">{b.capacityDesc}</p>
                      </div>
                      {isOccupied ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white animate-pulse">
                          En Carguío
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Libre
                        </span>
                      )}
                    </div>

                    {isOccupied ? (
                      <div className="bg-white/90 p-3 rounded-xl border border-amber-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-mono font-bold text-slate-700">
                          <span>{d.folio}</span>
                          <span className="text-[10px] font-sans text-slate-400">Ingreso: {d.hora_ingreso}</span>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px]">Cliente:</p>
                          <p className="font-bold text-slate-800 truncate">{d.cliente_nombre}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px]">Camión / Placa:</p>
                          <p className="font-semibold text-slate-700 truncate">{d.placa_camion}</p>
                        </div>
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Carga:</span>
                          <span className="font-black text-orange-600 font-mono">
                            {d.total_unidades.toLocaleString()} unid
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 flex flex-col items-center justify-center text-center space-y-1">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60" />
                        <p className="text-xs font-bold text-slate-600">Bahía Disponible</p>
                        <p className="text-[10px] text-slate-400">Lista para recibir camión</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3">
                    {isOccupied ? (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleFinalizarDespacho(d.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Dar Salida</span>
                        </button>
                        <button
                          onClick={() => setPrintDespacho(d)}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Imprimir Vale de Salida"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenNewModal(b.id)}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Asignar Camión</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            BITÁCORA Y REGISTRO HISTÓRICO DE DESPACHOS
            ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                <span>Bitácora de Salidas y Entregas en Patio</span>
              </h3>
              <p className="text-xs text-slate-500">
                Registro de camiones, placas, conteo de piezas entregadas y pases de garita.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Buscador */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar placa, cliente, chofer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg w-52 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Filtro Estado */}
              <select
                value={selectedEstadoFilter}
                onChange={(e) => setSelectedEstadoFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="todos">Todos los Estados</option>
                <option value="en_carguio">En Carguío</option>
                <option value="despachado">Despachados / Salieron</option>
              </select>

              {/* Filtro Fecha */}
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700"
              />
              {selectedDateFilter && (
                <button
                  onClick={() => setSelectedDateFilter("")}
                  className="text-xs text-slate-400 hover:text-slate-600"
                  title="Limpiar fecha"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <th className="py-3 px-4">Folio / Fecha</th>
                  <th className="py-3 px-4">Horas (In / Out)</th>
                  <th className="py-3 px-4">Camión & Placa</th>
                  <th className="py-3 px-4">Chofer / Modalidad</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Bahía</th>
                  <th className="py-3 px-4 text-right">Total Ladrillos</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDespachos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No se encontraron registros de despachos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredDespachos.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800">{d.folio}</span>
                        <span className="block text-slate-400 text-[10px]">{d.fecha}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <div><span className="text-slate-400 text-[10px]">IN:</span> {d.hora_ingreso}</div>
                        {d.hora_salida ? (
                          <div><span className="text-slate-400 text-[10px]">OUT:</span> {d.hora_salida}</div>
                        ) : (
                          <span className="text-amber-600 font-bold text-[10px]">En patio</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {d.placa_camion}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <p className="font-semibold">{d.chofer_nombre}</p>
                        <span className="text-[10px] text-slate-400">
                          {d.tipo_retiro === "cliente_recojo" ? "Recojo en Fábrica" : "Transporte de Planta"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[180px] truncate">
                        {d.cliente_nombre}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                          {d.bahia_carga}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-orange-600 text-sm">
                          {d.total_unidades.toLocaleString()}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {d.items.map((i) => `${i.cantidad} ${i.brick_name}`).join(", ").slice(0, 30)}...
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {d.estado === "en_carguio" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 mr-1" /> En Carguío
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Despachado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {d.estado === "en_carguio" && (
                            <button
                              onClick={() => handleFinalizarDespacho(d.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                              title="Confirmar salida"
                            >
                              Dar Salida
                            </button>
                          )}
                          <button
                            onClick={() => sendWhatsAppTicket(d)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Enviar WhatsApp de Despacho"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPrintDespacho(d)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Imprimir Pase de Garita"
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

      {/* =========================================================================
          MODAL 1: REGISTRAR NUEVO DESPACHO EN PATIO
          ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-indigo-300" />
                <h3 className="font-extrabold text-base">Registrar Nuevo Despacho en Patio</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDespacho} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de Ingreso *</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hora de Ingreso *</label>
                  <input
                    type="time"
                    value={formData.hora_ingreso}
                    onChange={(e) => setFormData({ ...formData, hora_ingreso: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Modalidad de Retiro *</label>
                  <select
                    value={formData.tipo_retiro}
                    onChange={(e) => setFormData({ ...formData, tipo_retiro: e.target.value as PatioTipoRetiro })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold"
                  >
                    <option value="cliente_recojo">Recojo de Cliente (En Fábrica)</option>
                    <option value="transporte_planta">Transporte Propio de Planta</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bahía de Carga Asignada *</label>
                  <select
                    value={formData.bahia_carga}
                    onChange={(e) => setFormData({ ...formData, bahia_carga: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-indigo-900"
                  >
                    {BAHIAS_CONFIG.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Datos del Vehículo y Chofer
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Placa & Modelo de Camión *</label>
                    <input
                      type="text"
                      placeholder="Ej. 2489-PLX (Volvo F12)"
                      value={formData.placa_camion}
                      onChange={(e) => setFormData({ ...formData, placa_camion: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nombre del Chofer *</label>
                    <input
                      type="text"
                      placeholder="Nombre y apellido"
                      value={formData.chofer_nombre}
                      onChange={(e) => setFormData({ ...formData, chofer_nombre: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Celular Chofer (WhatsApp)</label>
                    <input
                      type="text"
                      placeholder="Ej. 712-34567"
                      value={formData.chofer_telefono}
                      onChange={(e) => setFormData({ ...formData, chofer_telefono: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Cliente / Destinatario *</label>
                    <input
                      type="text"
                      placeholder="Nombre del cliente o constructora"
                      value={formData.cliente_nombre}
                      onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Ladrillos a Cargar */}
              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-orange-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-orange-600" />
                    <span>Ladrillos a Cargar en Plataforma</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[11px] font-bold text-orange-700 hover:text-orange-900 bg-white border border-orange-200 px-2 py-0.5 rounded shadow-2xs cursor-pointer"
                  >
                    + Agregar Tipo
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedItems.map((item, idx) => {
                    // Buscar stock actual disponible para mostrar en el selector
                    const brickStock = stockSummaryPerBrick.find((s) => s.brick.id === item.brick_type_id);

                    return (
                      <div key={idx} className="flex items-center space-x-2">
                        <select
                          value={item.brick_type_id}
                          onChange={(e) => {
                            const chosen = brickTypes.find((b) => b.id === e.target.value);
                            const next = [...selectedItems];
                            next[idx] = {
                              ...next[idx],
                              brick_type_id: e.target.value,
                              brick_name: chosen?.name || "",
                            };
                            setSelectedItems(next);
                          }}
                          className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                        >
                          {brickTypes.map((b) => {
                            const stockInfo = stockSummaryPerBrick.find((s) => s.brick.id === b.id);
                            return (
                              <option key={b.id} value={b.id}>
                                {b.name} (Disp: {stockInfo?.stockActualizado.toLocaleString() || 0} unid)
                              </option>
                            );
                          })}
                        </select>

                        <div className="w-28">
                          <input
                            type="number"
                            min={1}
                            placeholder="Cantidad"
                            value={item.cantidad}
                            onChange={(e) => {
                              const next = [...selectedItems];
                              next[idx].cantidad = Number(e.target.value);
                              setSelectedItems(next);
                            }}
                            className="w-full bg-white border border-orange-300 rounded-lg p-2 font-mono font-bold text-xs text-orange-700"
                          />
                        </div>

                        {selectedItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-orange-200/80 flex items-center justify-between text-xs font-bold text-orange-900">
                  <span>Total Carga Camión:</span>
                  <span className="font-mono text-sm">
                    {selectedItems.reduce((s, i) => s + (Number(i.cantidad) || 0), 0).toLocaleString()} unidades
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cuadrilla de Estibadores</label>
                  <input
                    type="text"
                    value={formData.cuadrilla_estibadores}
                    onChange={(e) => setFormData({ ...formData, cuadrilla_estibadores: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estado Inicial</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as PatioDespachoEstado })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="en_carguio">En Carguío (Camión en Patio)</option>
                    <option value="despachado">Despachado Directo (Salida Inmediata)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones / Precinto</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  placeholder="Instrucciones especiales de amarre, número de precinto o factura asociada..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md cursor-pointer"
                >
                  Registrar Entrada a Bahía
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: PASE OFICIAL DE SALIDA DE PATIO (LISTO PARA IMPRIMIR)
          ========================================================================= */}
      {printDespacho && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-300 relative space-y-6">
            <button
              onClick={() => setPrintDespacho(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-slate-900">INCEGUA S.R.L.</h2>
                <p className="text-xs text-slate-500">CONTROL DE PLANTA & PATIO DE ENTREGAS</p>
                <p className="text-xs font-bold text-indigo-700 mt-1 uppercase">
                  VALE OFICIAL DE SALIDA DE PATIO & PASE DE GARITA
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded border border-slate-300">
                  {printDespacho.folio}
                </span>
                <p className="text-xs text-slate-500 mt-1 font-bold">{printDespacho.bahia_carga}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p><span className="font-bold text-slate-600">Fecha:</span> {printDespacho.fecha}</p>
                <p><span className="font-bold text-slate-600">Hora Ingreso:</span> {printDespacho.hora_ingreso}</p>
                <p><span className="font-bold text-slate-600">Hora Salida:</span> {printDespacho.hora_salida || "En curso"}</p>
                <p><span className="font-bold text-slate-600">Modalidad:</span> {printDespacho.tipo_retiro === "cliente_recojo" ? "Recojo de Cliente" : "Transporte de Planta"}</p>
              </div>
              <div className="space-y-1">
                <p><span className="font-bold text-slate-600">Cliente:</span> {printDespacho.cliente_nombre}</p>
                <p><span className="font-bold text-slate-600">Camión:</span> {printDespacho.placa_camion}</p>
                <p><span className="font-bold text-slate-600">Chofer:</span> {printDespacho.chofer_nombre}</p>
                <p><span className="font-bold text-slate-600">Teléfono:</span> {printDespacho.chofer_telefono || "No registrado"}</p>
              </div>
            </div>

            {/* Detalle de Ladrillos */}
            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2">Descripción del Producto</th>
                    <th className="p-2 text-right">Cantidad (Unidades)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printDespacho.items.map((item, i) => (
                    <tr key={i}>
                      <td className="p-2 font-medium text-slate-800">{item.brick_name}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">{item.cantidad.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold text-slate-900">
                    <td className="p-2 text-right">TOTAL CARGA:</td>
                    <td className="p-2 text-right font-mono text-sm">{printDespacho.total_unidades.toLocaleString()} unidades</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {printDespacho.notes && (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded">
                Obs: {printDespacho.notes}
              </p>
            )}

            {/* Firmas de Control */}
            <div className="pt-10 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-800">{printDespacho.chofer_nombre}</p>
                <p className="text-slate-400 text-[10px]">Chofer (Recibí Conforme)</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-800">{printDespacho.cuadrilla_estibadores || "Operario Carga"}</p>
                <p className="text-slate-400 text-[10px]">Responsable de Estiba</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-800">{printDespacho.encargado_patio}</p>
                <p className="text-slate-400 text-[10px]">Encargado de Patio / Garita</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Pase de Garita</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
