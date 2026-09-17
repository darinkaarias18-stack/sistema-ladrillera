"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { ProductionBatch, BrickType, Employee } from "@/types/database.types";
import React, { useEffect, useState, useRef, Fragment } from "react";
import { Factory, Plus, Flame, CheckCircle, Calendar, Layers, Layers3, RefreshCw, X, Printer, FileText, FileSpreadsheet, Filter, PackageCheck, FlaskConical, ChevronDown, ChevronRight, Hash, Clock, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productionBatchSchema, ProductionBatchInput } from "@/lib/validations/production.schema";
import { getTodayDateString } from "@/lib/dates";

function parseInsumos(notes?: string) {
  if (!notes) {
    return {
      arcillaM3: "15 m³",
      aguaLitros: "500 L",
      combustibleKg: "120 kg",
      aserrinKg: "40 kg",
      aditivosKg: "5 kg",
      userNotes: "",
    };
  }

  let userNotes = notes;
  let insumosPart = notes;

  if (notes.includes("] • ")) {
    const parts = notes.split("] • ");
    insumosPart = parts[0];
    userNotes = parts.slice(1).join("] • ");
  } else if (notes.startsWith("[INSUMOS:") || notes.startsWith("INSUMOS:")) {
    userNotes = "";
  }

  const arcilla = insumosPart.match(/Arcilla:\s*([^,\]]+)/i)?.[1]?.trim() || "15 m³";
  const agua = insumosPart.match(/Agua:\s*([^,\]]+)/i)?.[1]?.trim() || "500 L";
  const combustible = insumosPart.match(/Combustible:\s*([^,\]]+)/i)?.[1]?.trim() || "120 kg";
  const aserrin = insumosPart.match(/Aserrín:\s*([^,\]]+)/i)?.[1]?.trim() || "40 kg";
  const aditivos = insumosPart.match(/Aditivos:\s*([^,\]]+)/i)?.[1]?.trim() || "5 kg";

  return {
    arcillaM3: arcilla.endsWith("m³") ? arcilla : `${arcilla} m³`,
    aguaLitros: agua.endsWith("L") ? agua : `${agua} L`,
    combustibleKg: combustible.endsWith("kg") ? combustible : `${combustible} kg`,
    aserrinKg: aserrin.endsWith("kg") ? aserrin : `${aserrin} kg`,
    aditivosKg: aditivos.endsWith("kg") ? aditivos : `${aditivos} kg`,
    userNotes,
  };
}

export default function ProduccionPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Estado para controlar la fila expandida por número de vaciado / fecha
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  // Estado para las cantidades producidas por cada tipo de ladrillo (Ingreso masivo por día)
  const [brickQuantities, setBrickQuantities] = useState<Record<string, number>>({});

  // Estado estructurado para Insumos Utilizados en la Producción
  const [insumos, setInsumos] = useState({
    arcillaM3: 15,
    aguaLitros: 500,
    combustibleKg: 120,
    aserrinKg: 40,
    aditivosKg: 5,
  });

  // Filtros de tabla
  const [selectedHornoFilter, setSelectedHornoFilter] = useState<string>("todos");
  const [selectedBrickTypeFilter, setSelectedBrickTypeFilter] = useState<string>("todos");

  const firstInputRef = useRef<HTMLElement | null>(null);

  const {
    register: registerBatch,
    handleSubmit: handleSubmitBatch,
    reset: resetBatch,
    formState: { errors: batchErrors },
  } = useForm<ProductionBatchInput>({
    resolver: zodResolver(productionBatchSchema),
    defaultValues: {
      productionDate: getTodayDateString(),
      brickTypeId: "multi-entry",
      operatorId: "",
      shift: "mañana",
      quantityProduced: 0,
      status: "terminado",
      folioNumber: "",
      horno: "Horno 1",
      horaVaciado: "",
      sectorAsignado: "",
      crewIds: [],
      notes: "",
    },
  });

  const loadData = () => {
    setBatches(store.getProductionBatches());
    const loadedTypes = store.getBrickTypes();
    setBrickTypes(loadedTypes);
    setEmployees(store.getEmployees().filter((e) => e.active));

    // Inicializar mapa de cantidades por tipo de ladrillo
    const initialQty: Record<string, number> = {};
    loadedTypes.forEach((bt, idx) => {
      initialQty[bt.id] = idx === 0 ? 2500 : idx === 1 ? 1800 : 0;
    });
    setBrickQuantities(initialQty);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isBatchModalOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isBatchModalOpen]);

  const handleQuantityChange = (brickTypeId: string, rawValue: string) => {
    if (rawValue === "") {
      setBrickQuantities((prev) => ({ ...prev, [brickTypeId]: 0 }));
      return;
    }
    const parsed = parseInt(rawValue, 10);
    const finalVal = isNaN(parsed) ? 0 : Math.max(0, Math.floor(parsed));
    setBrickQuantities((prev) => ({
      ...prev,
      [brickTypeId]: finalVal,
    }));
  };

  const totalDayQuantity = Object.values(brickQuantities).reduce((acc, curr) => acc + (curr || 0), 0);

  const onSubmitBatch = (data: ProductionBatchInput) => {
    const itemsToSave = Object.entries(brickQuantities).filter(([_, qty]) => qty > 0);

    if (itemsToSave.length === 0) {
      alert("Por favor ingrese una cantidad mayor a cero para al menos un tipo de ladrillo.");
      return;
    }

    // Formatear texto de insumos consumidos
    const insumosText = `Arcilla: ${insumos.arcillaM3}m³, Agua: ${insumos.aguaLitros}L, Combustible: ${insumos.combustibleKg}kg, Aserrín: ${insumos.aserrinKg}kg, Aditivos: ${insumos.aditivosKg}kg`;
    const fullNotes = data.notes
      ? `[INSUMOS: ${insumosText}] • ${data.notes}`
      : `INSUMOS: ${insumosText}`;

    const todayStr = getTodayDateString();

    // Guardar todos los tipos de ladrillo ingresados en una sola transacción/acción
    itemsToSave.forEach(([brickTypeId, qty]) => {
      store.upsertProductionBatch({
        production_date: todayStr,
        brick_type_id: brickTypeId,
        operator_id: data.operatorId,
        shift: data.shift,
        quantity_produced: qty,
        status: data.status,
        folio_number: data.folioNumber || undefined,
        horno: data.horno || "Horno 1",
        hora_vaciado: data.horaVaciado || undefined,
        sector_asignado: data.sectorAsignado || undefined,
        notes: fullNotes,
      });
    });

    setIsBatchModalOpen(false);
    resetBatch();
    loadData();
  };

  const handlePrintPhysicalSheet = () => {
    window.print();
  };

  const { ref: folioRef, ...folioRegister } = registerBatch("folioNumber");

  // Filtrado de lotes
  const filteredBatches = batches.filter((b) => {
    const matchHorno = selectedHornoFilter === "todos" || b.horno === selectedHornoFilter;
    const matchBrick = selectedBrickTypeFilter === "todos" || b.brick_type_id === selectedBrickTypeFilter;
    return matchHorno && matchBrick;
  });

  // Calcular el total de piezas de toda la jornada / vaciado correspondiente al folio o grupo
  const getVaciadoTotalQuantity = (batch: ProductionBatch) => {
    if (batch.folio_number) {
      return batches
        .filter((item) => item.folio_number === batch.folio_number)
        .reduce((acc, item) => acc + item.quantity_produced, 0);
    }
    return batches
      .filter(
        (item) =>
          item.production_date === batch.production_date &&
          item.operator_id === batch.operator_id &&
          item.shift === batch.shift &&
          item.horno === batch.horno
      )
      .reduce((acc, item) => acc + item.quantity_produced, 0);
  };

  // Cálculo de totales por Horno (únicamente Horno 1, Horno 2, Horno 3)
  const hornosList = ["Horno 1", "Horno 2", "Horno 3"];
  const totalProductionByHorno = hornosList.map((h) => {
    const qty = batches
      .filter((b) => (b.horno || "Horno 1") === h)
      .reduce((acc, curr) => acc + curr.quantity_produced, 0);
    return { horno: h, quantity: qty };
  });

  const handleOpenBatchModal = () => {
    const nextFolio = store.getNextFolioNumber();
    const initialQty: Record<string, number> = {};
    brickTypes.forEach((bt, idx) => {
      initialQty[bt.id] = idx === 0 ? 2500 : idx === 1 ? 1800 : 0;
    });
    setBrickQuantities(initialQty);
    setInsumos({
      arcillaM3: 15,
      aguaLitros: 500,
      combustibleKg: 120,
      aserrinKg: 40,
      aditivosKg: 5,
    });

    resetBatch({
      productionDate: getTodayDateString(),
      brickTypeId: brickTypes.length > 0 ? brickTypes[0].id : "multi-entry",
      operatorId: employees.length > 0 ? employees[0].id : "",
      shift: "mañana",
      quantityProduced: 0,
      status: "terminado",
      folioNumber: nextFolio,
      horno: "Horno 1",
      horaVaciado: "",
      sectorAsignado: "",
      crewIds: [],
      notes: "",
    });
    setIsBatchModalOpen(true);
  };

  return (
    <>
      <Header title="Producción & Registro de Vaciados Diarios por Horno" />

      <div className="p-6 space-y-6 print:hidden">
        {/* Bar de Acciones */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Control de Moldeo & Vaciado en Planta</h3>
            <p className="text-xs text-slate-500">
              Ingreso rápido de la producción diaria completa por **Horno**, **Día**, **Insumos** y **Todos los Ladrillos**.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg font-semibold text-xs transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>Imprimir Hoja de Control Físico</span>
            </button>

            <button
              onClick={handleOpenBatchModal}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Producción Diaria</span>
            </button>
          </div>
        </div>

        {/* Resumen de Producción por Horno (Horno 1, Horno 2, Horno 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {totalProductionByHorno.map((item) => (
            <div key={item.horno} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-tight">{item.horno}</span>
                <span className="text-lg font-mono font-bold text-slate-900">{item.quantity.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">unid.</span></span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                <Flame className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Matriz de Vaciados Registrados con Filtros por Horno y Tipo de Ladrillo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Historial de Vaciados Registrados por Día y Horno</h4>
              <p className="text-xs text-slate-500">Lotes de vaciado clasificados por tipo de ladrillo, fecha, horno e insumos utilizados.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-600">Horno:</span>
                <select
                  value={selectedHornoFilter}
                  onChange={(e) => setSelectedHornoFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none text-xs"
                >
                  <option value="todos">Todos los Hornos</option>
                  {hornosList.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
                <span className="font-semibold text-slate-600">Ladrillo:</span>
                <select
                  value={selectedBrickTypeFilter}
                  onChange={(e) => setSelectedBrickTypeFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none text-xs"
                >
                  <option value="todos">Todos los Tipos</option>
                  {brickTypes.map((bt) => (
                    <option key={bt.id} value={bt.id}>{bt.name}</option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                Registros: {filteredBatches.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3.5 w-10 text-center"></th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Horno Asignado</th>
                  <th className="p-3.5">N° Form.</th>
                  <th className="p-3.5">Responsable</th>
                  <th className="p-3.5">Tipo de Ladrillo</th>
                  <th className="p-3.5">Turno</th>
                  <th className="p-3.5 text-right">Cantidad Producida</th>
                  <th className="p-3.5 text-center">Estado Lote</th>
                  <th className="p-3.5">Insumos & Observaciones</th>
                  <th className="p-3.5 text-right bg-orange-100/70 text-orange-950 font-extrabold">Total Vaciado Jornada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-slate-400">
                      No se encontraron vaciados registrados con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b, index) => {
                    const totalVaciadoJornada = getVaciadoTotalQuantity(b);
                    const rowKey = b.id;
                    const isExpanded = expandedRowKey === rowKey;

                    // Filtrar todos los vaciados realizados en esa misma fecha
                    const vaciadosSameDate = batches.filter(
                      (item) => item.production_date === b.production_date
                    );

                    return (
                      <React.Fragment key={`${b.id}-${index}`}>
                        <tr
                          onClick={() => setExpandedRowKey(isExpanded ? null : rowKey)}
                          className={`cursor-pointer transition-colors select-none ${
                            isExpanded ? "bg-orange-50/80 font-medium border-l-4 border-l-orange-500" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRowKey(isExpanded ? null : rowKey);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-100/50 transition cursor-pointer"
                              title="Hacer clic para ver detalle por vaciado"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-orange-600 font-bold" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-900 flex items-center space-x-1">
                            <span>{b.production_date}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded bg-orange-50 border border-orange-200 text-orange-900 font-bold text-[11px] inline-flex items-center space-x-1">
                              <Flame className="w-3 h-3 text-orange-600 shrink-0" />
                              <span>{b.horno || "Horno 1"}</span>
                            </span>
                          </td>
                          <td className="p-3.5 font-mono">
                            {b.folio_number ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px]">
                                {b.folio_number.replace("FOL-", "")}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">{b.operator?.full_name || "Angel"}</td>
                          <td className="p-3.5 text-slate-800 font-semibold">{b.brick_type?.name}</td>
                          <td className="p-3.5 capitalize text-slate-600">{b.shift}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                            {b.quantity_produced.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">unid.</span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                              b.status === 'terminado' 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}>
                              {b.status === 'terminado' ? 'TERMINADO' : 'EN PROCESO'}
                            </span>
                          </td>
                          <td className="p-3.5 max-w-xs truncate">
                            {b.notes ? (
                              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-950 text-[11px] font-medium inline-flex items-center">
                                <FlaskConical className="w-3 h-3 text-blue-600 shrink-0 mr-1" />
                                <span className="truncate">{b.notes}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-orange-950 text-sm bg-orange-50/40">
                            <span className="inline-flex items-center space-x-1 bg-orange-500/10 text-orange-950 px-2 py-1 rounded-md border border-orange-300 font-black">
                              <span>{totalVaciadoJornada.toLocaleString()}</span>
                              <span className="text-[10px] font-semibold text-orange-800">unid.</span>
                            </span>
                          </td>
                        </tr>

                        {/* Panel Acordeón Desplegable con Detalle por Número de Vaciado */}
                        {isExpanded && (
                          <tr className="bg-slate-950 text-white animate-in fade-in zoom-in-95 duration-150">
                            <td colSpan={11} className="p-4 md:p-5 bg-slate-900 border-y-2 border-orange-500 shadow-inner">
                              <div className="space-y-4">
                                {/* Encabezado del Panel de Desglose */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold shrink-0">
                                      <Hash className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                        <span className="font-extrabold text-white text-sm">
                                          DESGLOSE DE VACIADOS REALIZADOS — FECHA {b.production_date}
                                        </span>
                                        <span className="bg-orange-500/20 text-orange-400 text-[10px] font-mono px-2 py-0.5 rounded border border-orange-500/30">
                                          {vaciadosSameDate.length} Vaciado{vaciadosSameDate.length > 1 ? "s" : ""} registrado{vaciadosSameDate.length > 1 ? "s" : ""} en esta fecha
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400 mt-0.5">
                                        Detalle por número de vaciado, lote, insumos de materia prima y operarios a cargo.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                                    <span className="text-slate-400 text-xs font-semibold">Total Producido el Día:</span>
                                    <span className="font-mono text-orange-400 font-black text-sm">
                                      {totalVaciadoJornada.toLocaleString()} unid.
                                    </span>
                                  </div>
                                </div>

                                {/* Tarjetas por Número de Vaciado */}
                                <div className="grid grid-cols-1 gap-3">
                                  {vaciadosSameDate.map((vItem, idx) => {
                                    const parsed = parseInsumos(vItem.notes);
                                    return (
                                      <div
                                        key={vItem.id}
                                        className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 space-y-3 hover:border-orange-500/40 transition shadow-sm"
                                      >
                                        {/* Fila Superior: Vaciado N°, Folio, Horno, Turno, Estado */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                                          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                                            <span className="px-2.5 py-1 rounded bg-orange-600 text-white font-mono font-black text-xs uppercase shadow-xs">
                                              VACIADO N° {idx + 1}
                                            </span>
                                            {vItem.folio_number && (
                                              <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 font-mono font-bold text-xs border border-slate-600">
                                                {vItem.folio_number}
                                              </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded bg-orange-950/70 text-orange-300 border border-orange-800/50 text-xs font-bold flex items-center space-x-1">
                                              <Flame className="w-3.5 h-3.5 text-orange-400 mr-1 inline" />
                                              <span>{vItem.horno || "Horno 1"}</span>
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-slate-700/70 text-slate-300 text-xs font-medium capitalize flex items-center">
                                              <Clock className="w-3 h-3 text-slate-400 mr-1 inline" />
                                              <span>Turno {vItem.shift}</span>
                                            </span>
                                          </div>

                                          <div className="flex items-center space-x-2">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-700">
                                              {vItem.status || "TERMINADO"}
                                            </span>
                                            <span className="font-mono font-black text-orange-400 text-sm bg-slate-950 px-3 py-1 rounded-lg border border-slate-700">
                                              {vItem.quantity_produced.toLocaleString()} <span className="text-xs font-normal text-slate-400">unid.</span>
                                            </span>
                                          </div>
                                        </div>

                                        {/* Información de Maestro y Ladrillo */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                          <div className="flex items-center space-x-2.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                            <User className="w-4 h-4 text-orange-400 shrink-0" />
                                            <div>
                                              <span className="text-slate-400 text-[10px] block font-semibold">MAESTRO MOLDEADOR / OPERARIO</span>
                                              <span className="font-bold text-white text-xs">{vItem.operator?.full_name || "Angel (Maestro Moldeador)"}</span>
                                            </div>
                                          </div>

                                          <div className="flex items-center space-x-2.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                            <Layers className="w-4 h-4 text-orange-400 shrink-0" />
                                            <div>
                                              <span className="text-slate-400 text-[10px] block font-semibold">TIPO DE LADRILLO MOLDEADO</span>
                                              <span className="font-bold text-white text-xs">{vItem.brick_type?.name || "Ladrillo 6H Normal de 1ra"}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Insumos & Mezcla consumidos en este vaciado */}
                                        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                                          <span className="text-[11px] font-bold text-orange-300 uppercase tracking-wider flex items-center space-x-1.5">
                                            <FlaskConical className="w-3.5 h-3.5 text-orange-400 mr-1 inline" />
                                            <span>Insumos & Mezcla Utilizada para este Vaciado:</span>
                                          </span>

                                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                                            <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                                              <span className="text-[10px] text-slate-400 block">Arcilla</span>
                                              <span className="font-mono font-bold text-amber-300">{parsed.arcillaM3}</span>
                                            </div>
                                            <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                                              <span className="text-[10px] text-slate-400 block">Agua</span>
                                              <span className="font-mono font-bold text-cyan-300">{parsed.aguaLitros}</span>
                                            </div>
                                            <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                                              <span className="text-[10px] text-slate-400 block">Combustible</span>
                                              <span className="font-mono font-bold text-orange-300">{parsed.combustibleKg}</span>
                                            </div>
                                            <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                                              <span className="text-[10px] text-slate-400 block">Aserrín</span>
                                              <span className="font-mono font-bold text-emerald-300">{parsed.aserrinKg}</span>
                                            </div>
                                            <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                                              <span className="text-[10px] text-slate-400 block">Aditivos</span>
                                              <span className="font-mono font-bold text-purple-300">{parsed.aditivosKg}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Observaciones */}
                                        {parsed.userNotes && (
                                          <div className="text-xs bg-slate-900/40 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                                            <span className="font-bold text-slate-400 mr-1">Observaciones / Novedades:</span>
                                            <span>{parsed.userNotes}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Registrar Producción Diaria (Ingreso Múltiple de Una Sola Vez con Insumos Estructurados) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 md:p-6 overflow-y-auto print:hidden">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl my-auto overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div>
                <h3 className="font-bold text-sm flex items-center space-x-2">
                  <PackageCheck className="w-5 h-5 text-orange-400" />
                  <span>Registrar Producción Completa del Día & Insumos</span>
                </h3>
                <p className="text-[11px] text-slate-300">Ingresa la cantidad producida de cada tipo de ladrillo y los insumos utilizados</p>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBatch(onSubmitBatch)} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  💡 <strong>Ingreso Multiproducto & Insumos:</strong> Ingresa las cantidades producidas por ladrillo y los insumos consumidos. Usa <kbd className="bg-white border border-amber-300 px-1 py-0.5 rounded font-mono font-bold">TAB</kbd> para avanzar.
                </span>
              </div>

              {/* Datos generales de la jornada / planilla */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>N° Folio Autogenerado</span>
                    <span className="text-[10px] text-slate-600 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">🔒 Inalterable</span>
                  </label>
                  <input
                    {...folioRegister}
                    readOnly
                    type="text"
                    placeholder="Ej. FOL-00105"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-700 bg-slate-100 cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Fecha de Vaciado *</label>
                    <span className="text-[10px] font-extrabold bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                      🔒 Hoy (Inalterable)
                    </span>
                  </div>
                  <input
                    {...registerBatch("productionDate")}
                    readOnly
                    tabIndex={-1}
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 bg-slate-100 cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Horno Asignado / Destino *</label>
                  <select
                    {...registerBatch("horno")}
                    ref={(e) => {
                      registerBatch("horno").ref(e);
                      firstInputRef.current = e as HTMLElement | null;
                    }}
                    tabIndex={1}
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm font-bold bg-orange-50/50 text-orange-950 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="Horno 1">🔥 Horno 1</option>
                    <option value="Horno 2">🔥 Horno 2</option>
                    <option value="Horno 3">🔥 Horno 3</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsable *</label>
                  <select
                    {...registerBatch("operatorId")}
                    tabIndex={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">-- Seleccionar Operario --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name}
                      </option>
                    ))}
                  </select>
                  {batchErrors.operatorId && <p className="text-red-500 mt-1">{batchErrors.operatorId.message}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Turno de Trabajo *</label>
                  <select
                    {...registerBatch("shift")}
                    tabIndex={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="mañana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="extra">Extra</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora de Vaciado</label>
                  <input
                    {...registerBatch("horaVaciado")}
                    type="time"
                    tabIndex={5}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sector Asignado</label>
                  <input
                    {...registerBatch("sectorAsignado")}
                    type="text"
                    placeholder="Ej. Patio 1, Cancha A..."
                    tabIndex={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado</label>
                  <select
                    {...registerBatch("status")}
                    tabIndex={7}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="terminado">Terminado</option>
                    <option value="en_proceso">En proceso</option>
                  </select>
                </div>
              </div>

              {/* Matriz Principal: Captura por cada Tipo de Ladrillo */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase">🧱 Matriz de Producción por Tipo de Ladrillo</span>
                  <span className="text-[11px] text-slate-600 font-semibold">Total Tipos: {brickTypes.length}</span>
                </div>

                <div className="divide-y divide-slate-200 bg-white max-h-56 overflow-y-auto">
                  {brickTypes.map((bt, index) => (
                    <div key={bt.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 text-xs block truncate">{bt.name}</span>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {bt.dimensions || "Estándar"} {bt.weight_kg ? `• ${bt.weight_kg} kg` : ""}
                        </span>
                      </div>

                      <div className="w-44 flex items-center space-x-2 shrink-0">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          tabIndex={6 + index}
                          value={brickQuantities[bt.id] === 0 ? "" : brickQuantities[bt.id]}
                          onChange={(e) => handleQuantityChange(bt.id, e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono font-bold text-right text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-500">unid.</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total general acumulado en vivo */}
                <div className="bg-orange-50 px-4 py-3 border-t border-orange-200 flex items-center justify-between text-orange-950 font-bold">
                  <span>TOTAL PRODUCCIÓN DE LA JORNADA:</span>
                  <span className="font-mono text-base text-orange-700 font-extrabold">
                    {totalDayQuantity.toLocaleString()} unidades
                  </span>
                </div>
              </div>

              {/* Registro Estructurado de Insumos y Materiales Consumidos */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase flex items-center">
                    <FlaskConical className="w-4 h-4 text-orange-600 mr-1.5" />
                    <span>Insumos & Mezcla Utilizada para la Producción</span>
                  </span>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">Consumo de Materia Prima</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Arcilla / Tierra</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        tabIndex={6 + brickTypes.length}
                        value={insumos.arcillaM3}
                        onChange={(e) => setInsumos((prev) => ({ ...prev, arcillaM3: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-right"
                      />
                      <span className="text-[10px] text-slate-600 font-bold">m³</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Agua</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="10"
                        min="0"
                        tabIndex={7 + brickTypes.length}
                        value={insumos.aguaLitros}
                        onChange={(e) => setInsumos((prev) => ({ ...prev, aguaLitros: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-right"
                      />
                      <span className="text-[10px] text-slate-600 font-bold">Litros</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Leña / Combustible</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="5"
                        min="0"
                        tabIndex={8 + brickTypes.length}
                        value={insumos.combustibleKg}
                        onChange={(e) => setInsumos((prev) => ({ ...prev, combustibleKg: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-right"
                      />
                      <span className="text-[10px] text-slate-600 font-bold">kg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Aserrín / Bagazo</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="5"
                        min="0"
                        tabIndex={9 + brickTypes.length}
                        value={insumos.aserrinKg}
                        onChange={(e) => setInsumos((prev) => ({ ...prev, aserrinKg: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-right"
                      />
                      <span className="text-[10px] text-slate-600 font-bold">kg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Aditivos / Otros</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        tabIndex={10 + brickTypes.length}
                        value={insumos.aditivosKg}
                        onChange={(e) => setInsumos((prev) => ({ ...prev, aditivosKg: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-right"
                      />
                      <span className="text-[10px] text-slate-600 font-bold">kg</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones & Novedades Adicionales</label>
                <textarea
                  {...registerBatch("notes")}
                  tabIndex={11 + brickTypes.length}
                  rows={2}
                  placeholder="Detalles sobre clima, patio asignado o novedades del turno..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  tabIndex={13 + brickTypes.length}
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  tabIndex={12 + brickTypes.length}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-md cursor-pointer text-xs"
                >
                  Guardar Producción & Insumos del Día
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Vista de Impresión de Hoja Físico de Planta */}
      {isPrintModalOpen && (
        <div className="printable-modal-overlay fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 md:p-6 overflow-y-auto print:p-0 print:static print:bg-white print:backdrop-blur-none">
          <div className="printable-modal-card bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl my-auto overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:border-none print:max-w-none print:w-full print:max-h-none">
            {/* Cabecera del modal para pantalla */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0 print:hidden">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">Vista Previa - Hoja de Control Físico de Planta</h3>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrintPhysicalSheet}
                  className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Descargar PDF</span>
                </button>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Documento Físico Imprimible */}
            <div className="printable-sheet p-8 space-y-6 text-slate-900 bg-white font-sans text-xs overflow-y-auto flex-1 print:p-3 print:space-y-3 print:text-black print:overflow-visible">
              {/* Encabezado oficial */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="font-black text-xl text-slate-900 uppercase tracking-tight">INCEGUA S.R.L.</h1>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Sistema de Operaciones & Producción en Planta</p>
                  <p className="text-[11px] text-slate-500">Planilla de Control Diario de Vaciado & Consumo de Insumos</p>
                </div>
                <div className="text-right border border-slate-900 p-2.5 rounded-lg bg-slate-50">
                  <span className="block text-[10px] font-bold uppercase text-slate-500">N° Folio / Control</span>
                  <span className="font-mono font-bold text-base text-slate-900">{store.getNextFolioNumber()}</span>
                </div>
              </div>

              {/* Formulario en blanco con campos de control */}
              <div className="grid grid-cols-4 gap-4 border border-slate-300 rounded-lg p-4 bg-slate-50/50 print:break-inside-avoid">
                <div>
                  <span className="block font-bold text-slate-700 text-[11px]">Fecha de Vaciado:</span>
                  <span className="block mt-2 border-b border-dashed border-slate-400 pb-1 text-slate-500 font-mono">______ / ______ / 2026</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-700 text-[11px]">Hora de Vaciado:</span>
                  <span className="block mt-2 border-b border-dashed border-slate-400 pb-1 text-slate-500 font-mono">____ : ____ hrs</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-700 text-[11px]">Horno Asignado / Destino:</span>
                  <span className="block mt-2 font-medium text-slate-800 font-bold">[  ] Horno 1   [  ] Horno 2   [  ] Horno 3</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-700 text-[11px]">Turno de Trabajo:</span>
                  <span className="block mt-2 font-medium text-slate-600">[  ] Mañana   [  ] Tarde   [  ] Extra</span>
                </div>
              </div>

              {/* Sección principal de datos */}
              <div className="space-y-4 print:space-y-2 border border-slate-300 rounded-lg p-4 print:p-2">
                <div className="grid grid-cols-2 gap-4 print:break-inside-avoid">
                  <div>
                    <label className="block font-bold text-slate-800 uppercase text-[11px] mb-1">1. Responsable:</label>
                    <div className="border border-slate-400 h-9 rounded px-3 flex items-center text-slate-400">
                      ______________________________________________________
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 uppercase text-[11px] mb-1">2. Sector Asignado:</label>
                    <div className="border border-slate-400 h-9 rounded px-3 flex items-center text-slate-400">
                      ______________________________________________________
                    </div>
                  </div>
                </div>

                {/* Registro de Insumos y Mezcla en la planilla física */}
                <div className="print:break-inside-avoid">
                  <label className="block font-bold text-slate-800 uppercase text-[11px] mb-1">3. Insumos & Mezcla Utilizada:</label>
                  <div className="border border-slate-400 p-2.5 rounded text-slate-700 text-[11px] bg-slate-50">
                    <div className="grid grid-cols-2 gap-2">
                      <div>• Arcilla / Tierra (m³): <strong>_________________</strong></div>
                      <div>• Agua (Litros): <strong>_________________</strong></div>
                      <div>• Leña / Combustible (kg): <strong>_________________</strong></div>
                      <div>• Aserrín / Bagazo (kg): <strong>_________________</strong></div>
                      <div className="col-span-2">• Aditivos / Otros (kg): <strong>_________________</strong></div>
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                <div className="print:break-inside-avoid mt-4">
                  <label className="block font-bold text-slate-800 uppercase text-[11px] mb-1">4. Observaciones & Novedades:</label>
                  <div className="border border-slate-400 h-12 rounded px-3 flex items-start pt-1 text-slate-400">
                    ____________________________________________________________________________________________________
                  </div>
                </div>

                {/* Tabla de vaciado por tipo de ladrillo */}
                <div className="mt-4">
                  <label className="block font-bold text-slate-800 uppercase text-[11px] mb-2">4. Detalle de Producción por Tipo de Ladrillo:</label>
                  <table className="w-full border border-slate-400 text-left">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-400 text-slate-700 font-bold">
                        <th className="p-2 print:py-1 print:px-2 border-r border-slate-400">Tipo de Ladrillo</th>
                        <th className="p-2 print:py-1 print:px-2 border-r border-slate-400">Dimensiones</th>
                        <th className="p-2 print:py-1 print:px-2 text-right">Cantidad Producida (Unidades)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brickTypes.map((bt) => (
                        <tr key={bt.id} className="border-b border-slate-300 print:break-inside-avoid">
                          <td className="p-2 print:py-1 print:px-2 font-bold border-r border-slate-300">{bt.name}</td>
                          <td className="p-2 print:py-1 print:px-2 border-r border-slate-300">{bt.dimensions || "Estándar"}</td>
                          <td className="p-2 print:py-1 print:px-2 text-right font-mono text-slate-400">_________________ unid.</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="print:break-inside-avoid">
                  <label className="block font-bold text-slate-800 uppercase text-[11px] mb-1">5. Observaciones:</label>
                  <div className="border border-slate-400 h-16 rounded p-2 text-slate-400">
                    ____________________________________________________________________________________________________
                  </div>
                </div>
              </div>

              {/* Firmas de Control */}
              <div className="pt-10 print:pt-6 grid grid-cols-3 gap-6 text-center text-[10px] print:break-inside-avoid">
                <div className="border-t border-slate-900 pt-2">
                  <span className="block font-bold text-slate-800 uppercase">Firma Maestro Responsable</span>
                  <span className="text-slate-500">Operario de Vaciado</span>
                </div>
                <div className="border-t border-slate-900 pt-2">
                  <span className="block font-bold text-slate-800 uppercase">Firma Supervisor Planta</span>
                  <span className="text-slate-500">Control de Calidad</span>
                </div>
                <div className="border-t border-slate-900 pt-2">
                  <span className="block font-bold text-slate-900 uppercase">Firma Digitador Oficina</span>
                  <span className="text-slate-500">Ingreso a Sistema ERP</span>
                </div>
              </div>
            </div>

            {/* Pie del modal */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end print:hidden">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 text-white font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
