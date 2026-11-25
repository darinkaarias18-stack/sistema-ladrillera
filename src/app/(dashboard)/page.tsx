"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { getTodayDateString } from "@/lib/dates";
import { getCurrentUserSession } from "@/actions/auth";
import {
  ProductionBatch,
  InventoryStock,
  BrickType,
  Employee,
  Order,
  HornoCycle,
  Sale,
  CashLedgerEntry,
} from "@/types/database.types";
import { useEffect, useState, useMemo } from "react";
import {
  Factory,
  Flame,
  Boxes,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Truck,
  FlameKindling,
  DollarSign,
  Layers,
  PackageX,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [stock, setStock] = useState<InventoryStock[]>([]);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hornoCycles, setHornoCycles] = useState<HornoCycle[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashLedger, setCashLedger] = useState<CashLedgerEntry[]>([]);
  const [userName, setUserName] = useState<string>("Usuario");
  const [isMounted, setIsMounted] = useState(false);

  const loadDashboardData = () => {
    setBatches(store.getProductionBatches());
    setStock(store.getInventoryStock());
    setBrickTypes(store.getBrickTypes());
    setEmployees(store.getEmployees());
    setOrders(store.getOrders());
    setHornoCycles(store.getHornoCycles());
    setSales(store.getSales());
    setCashLedger(store.getCashLedger());
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      loadDashboardData();
    }, 0);

    const loadUserName = async () => {
      try {
        const session = await getCurrentUserSession();
        if (session?.user) {
          setUserName(session.user.fullName || session.user.email || "Usuario");
          return;
        }
      } catch {}
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("erp_current_user");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.name) {
              setUserName(parsed.name);
              return;
            }
          } catch {}
        }
      }
    };
    loadUserName();

    const events = [
      "erp_sync_completed",
      "erp_batches_updated",
      "erp_inventory_updated",
      "erp_orders_updated",
      "erp_brick_types_updated",
      "erp_sales_updated",
      "erp_cash_updated",
    ];
    events.forEach((ev) => window.addEventListener(ev, loadDashboardData));
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, loadDashboardData));
    };
  }, []);

  // 1. MÉTRICAS CLAVE DE PRODUCCIÓN & HORNOS
  const currentMonthPrefix = useMemo(() => getTodayDateString().slice(0, 7), []);

  const kilnMetrics = useMemo(() => {
    const finalizedAll = hornoCycles.filter((c) => c.status === "finalizado");
    const finalizedMonth = finalizedAll.filter((c) =>
      (c.fecha_salida || c.fecha_ingreso || "").startsWith(currentMonthPrefix)
    );
    const targetCycles = finalizedMonth.length > 0 ? finalizedMonth : finalizedAll;

    let ingresado = 0;
    let sanoSalido = 0;
    let merma = 0;

    targetCycles.forEach((c) => {
      const ing = Number(c.cantidad_ingreso || 0);
      const sanos =
        Number(c.cantidad_salida_primera || 0) + Number(c.cantidad_salida_segunda || 0);
      const cycleMerma =
        c.cantidad_merma !== undefined ? Number(c.cantidad_merma) : Math.max(0, ing - sanos);
      ingresado += ing;
      sanoSalido += sanos;
      merma += cycleMerma;
    });

    const mermaPct = ingresado > 0 ? ((ingresado - sanoSalido) / ingresado) * 100 : 0;

    return {
      ingresado,
      sanoSalido,
      merma,
      mermaPct: Number(mermaPct.toFixed(1)),
      cyclesCount: targetCycles.length,
    };
  }, [hornoCycles, currentMonthPrefix]);

  const monthlyMolding = useMemo(() => {
    const currentMonthBatches = batches.filter((b) =>
      (b.production_date || "").startsWith(currentMonthPrefix)
    );
    if (currentMonthBatches.length > 0) {
      return {
        total: currentMonthBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0),
        count: currentMonthBatches.length,
        periodLabel: "Mes actual",
      };
    }
    if (batches.length === 0) {
      return { total: 0, count: 0, periodLabel: "Sin registros" };
    }
    const latestMonth = batches.reduce(
      (max, b) => {
        const m = (b.production_date || "").slice(0, 7);
        return m > max ? m : max;
      },
      (batches[0].production_date || "").slice(0, 7)
    );
    const latestBatches = batches.filter((b) =>
      (b.production_date || "").startsWith(latestMonth)
    );
    return {
      total: latestBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0),
      count: latestBatches.length,
      periodLabel: `Último mes (${latestMonth})`,
    };
  }, [batches, currentMonthPrefix]);

  const stockPatio = useMemo(() => {
    return stock
      .filter((s) => s.location === "patio_secado")
      .reduce((sum, s) => sum + s.quantity, 0);
  }, [stock]);

  const stockHorno = useMemo(() => {
    return stock
      .filter((s) => s.location === "horno")
      .reduce((sum, s) => sum + s.quantity, 0);
  }, [stock]);

  const stockBodega = useMemo(() => {
    return stock
      .filter((s) => s.location === "bodega_terminado")
      .reduce((sum, s) => sum + s.quantity, 0);
  }, [stock]);

  // Lotes frescos verde (del día de hoy o último turno registrado)
  const producedToday = useMemo(() => {
    const today = getTodayDateString();
    const todayBatches = batches.filter((b) => b.production_date === today);
    if (todayBatches.length > 0) {
      return todayBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
    }
    if (batches.length === 0) return 0;
    const latestDate = batches.reduce(
      (max, b) => (b.production_date > max ? b.production_date : max),
      batches[0].production_date
    );
    return batches
      .filter((b) => b.production_date === latestDate)
      .reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
  }, [batches]);

  // Cuadre exacto entre Stock Total Planta e Inventario de Ladrillos: Bodega Terminado + En Proceso (Patio + Horno)
  const stockEnProceso = stockPatio + stockHorno;
  const totalStockGlobal = stockBodega + stockEnProceso;
  const DAILY_OPERATOR_TARGET = 3000;

  // Cruce con Pedidos activos pendientes de despacho
  const orderMetrics = useMemo(() => {
    const pendingOrders = orders.filter(
      (o) =>
        o.status !== "cancelado" &&
        o.delivery_status !== "entregado" &&
        o.delivery_status !== "cancelado"
    );
    const committedUnits = pendingOrders.reduce(
      (sum, o) =>
        sum + (o.items || []).reduce((itemSum, it) => itemSum + (it.quantity || 0), 0),
      0
    );
    const availableReal = stockBodega - committedUnits;
    return {
      pendingCount: pendingOrders.length,
      committedUnits,
      availableReal,
    };
  }, [orders, stockBodega]);

  // 1B. VENTAS DEL DÍA
  const salesTodayMetrics = useMemo(() => {
    const today = getTodayDateString();
    const todaySales = sales.filter((s) => (s.created_at || "").startsWith(today));
    const totalAmount = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalUnits = todaySales.reduce(
      (sum, s) => sum + (s.items || []).reduce((iSum, it) => iSum + (it.quantity || 0), 0),
      0
    );

    const byProductMap = new Map<
      string,
      { brickTypeId: string; brickName: string; quantity: number; totalAmount: number }
    >();

    todaySales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (!item.brick_type_id) return;
        const bt = brickTypes.find((b) => b.id === item.brick_type_id);
        const qty = item.quantity || 0;
        const subtotal = qty * (item.unit_price || 0);
        const existing = byProductMap.get(item.brick_type_id);
        if (!existing) {
          byProductMap.set(item.brick_type_id, {
            brickTypeId: item.brick_type_id,
            brickName: bt?.name || item.brick_type_id,
            quantity: qty,
            totalAmount: subtotal,
          });
        } else {
          existing.quantity += qty;
          existing.totalAmount += subtotal;
        }
      });
    });

    const byProduct = Array.from(byProductMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    return {
      totalAmount,
      count: todaySales.length,
      totalUnits,
      byProduct,
    };
  }, [sales, brickTypes]);

  // 1C. INVENTARIO DE MATERIALES (Insumos comprados para fabricar ladrillos)
  const materialInventoryMetrics = useMemo(() => {
    const materialPurchases = cashLedger.filter((entry) => {
      if (entry.category === "compra_insumo") return true;
      const desc = (entry.description || "").toLowerCase();
      return (
        entry.amount < 0 &&
        (desc.includes("arcilla") ||
          desc.includes("tierra") ||
          desc.includes("arena") ||
          desc.includes("leña") ||
          desc.includes("aserr") ||
          desc.includes("aditivo"))
      );
    });

    const classifyMaterial = (description: string): string => {
      const d = description.toLowerCase();
      if (d.includes("arcilla")) return "Arcilla";
      if (d.includes("tierra") || d.includes("arena")) return "Tierra / Arena";
      if (d.includes("leña")) return "Leña para Hornos";
      if (d.includes("aserr")) return "Aserrín";
      if (d.includes("aditivo") || d.includes("desmoldante")) return "Aditivos / Desmoldante";
      return "Otros Insumos";
    };

    const grouped = new Map<
      string,
      { name: string; totalAmount: number; count: number; lastDate: string; lastDescription: string }
    >();

    let totalInvested = 0;
    materialPurchases.forEach((p) => {
      const amountAbs = Math.abs(p.amount || 0);
      totalInvested += amountAbs;
      const name = classifyMaterial(p.description || "");
      const existing = grouped.get(name);
      if (!existing) {
        grouped.set(name, {
          name,
          totalAmount: amountAbs,
          count: 1,
          lastDate: p.movement_date || "",
          lastDescription: p.description || "",
        });
      } else {
        existing.totalAmount += amountAbs;
        existing.count += 1;
        if ((p.movement_date || "") >= existing.lastDate) {
          existing.lastDate = p.movement_date || "";
          existing.lastDescription = p.description || "";
        }
      }
    });

    const categories = Array.from(grouped.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    return {
      totalInvested,
      purchaseCount: materialPurchases.length,
      categories,
    };
  }, [cashLedger]);

  // 1D. INVENTARIO DE LADRILLOS POR TIPO
  const brickInventoryMetrics = useMemo(() => {
    const rows = brickTypes
      .map((bt) => {
        const bodega = stock
          .filter((s) => s.brick_type_id === bt.id && s.location === "bodega_terminado")
          .reduce((sum, s) => sum + s.quantity, 0);
        const patio = stock
          .filter((s) => s.brick_type_id === bt.id && s.location === "patio_secado")
          .reduce((sum, s) => sum + s.quantity, 0);
        const horno = stock
          .filter((s) => s.brick_type_id === bt.id && s.location === "horno")
          .reduce((sum, s) => sum + s.quantity, 0);
        return {
          id: bt.id,
          name: bt.name,
          dimensions: bt.dimensions,
          bodega,
          patio,
          horno,
          total: bodega + patio + horno,
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.bodega - a.bodega);

    return {
      rows,
      typesWithStock: rows.filter((r) => r.bodega > 0).length,
      totalBodega: rows.reduce((sum, r) => sum + r.bodega, 0),
    };
  }, [brickTypes, stock]);

  // 1E. INVENTARIO EN ALERTA (Ladrillos por entregar con cero stock en bodega)
  const alertInventoryMetrics = useMemo(() => {
    const pendingOrders = orders.filter(
      (o) =>
        o.status !== "cancelado" &&
        o.delivery_status !== "entregado" &&
        o.delivery_status !== "cancelado"
    );

    const pendingByBrick = new Map<string, { pendingUnits: number; orderIds: Set<string> }>();
    pendingOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        if (!item.brick_type_id || (item.quantity || 0) <= 0) return;
        const current = pendingByBrick.get(item.brick_type_id) || {
          pendingUnits: 0,
          orderIds: new Set<string>(),
        };
        current.pendingUnits += item.quantity || 0;
        current.orderIds.add(order.id);
        pendingByBrick.set(item.brick_type_id, current);
      });
    });

    const alertItems: {
      brickTypeId: string;
      brickName: string;
      dimensions: string;
      pendingUnits: number;
      ordersCount: number;
      stockBodega: number;
    }[] = [];

    pendingByBrick.forEach((info, brickTypeId) => {
      const bodegaStock = stock
        .filter((s) => s.brick_type_id === brickTypeId && s.location === "bodega_terminado")
        .reduce((sum, s) => sum + s.quantity, 0);

      if (bodegaStock === 0) {
        const bt = brickTypes.find((b) => b.id === brickTypeId);
        alertItems.push({
          brickTypeId,
          brickName: bt?.name || brickTypeId,
          dimensions: bt?.dimensions || "",
          pendingUnits: info.pendingUnits,
          ordersCount: info.orderIds.size,
          stockBodega: 0,
        });
      }
    });

    alertItems.sort((a, b) => b.pendingUnits - a.pendingUnits);

    return {
      items: alertItems,
      totalAlertUnits: alertItems.reduce((sum, item) => sum + item.pendingUnits, 0),
    };
  }, [orders, stock, brickTypes]);

  // 2. PRODUCCIÓN POR TIPO DE LADRILLO
  const productionChartData = useMemo(() => {
    return brickTypes
      .map((bt) => {
        const qty = batches
          .filter((b) => b.brick_type_id === bt.id)
          .reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
        return {
          id: bt.id,
          name: bt.name.replace("Ladrillo ", ""),
          fullName: bt.name,
          cantidad: qty,
        };
      })
      .filter((item) => item.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [brickTypes, batches]);

  // 3. VACIADOS DIARIOS POR TURNO (MAÑANA VS TARDE)
  const dailyProductionData = useMemo(() => {
    const map = new Map<string, { fecha: string; dia: string; manana: number; tarde: number; total: number }>();
    const sorted = [...batches].sort((a, b) => a.production_date.localeCompare(b.production_date));

    sorted.forEach((b) => {
      const d = b.production_date;
      if (!map.has(d)) {
        map.set(d, { fecha: d, dia: d.slice(5), manana: 0, tarde: 0, total: 0 });
      }
      const item = map.get(d)!;
      if (b.shift === "mañana") {
        item.manana += b.quantity_produced || 0;
      } else {
        item.tarde += b.quantity_produced || 0;
      }
      item.total += b.quantity_produced || 0;
    });

    return Array.from(map.values()).slice(-8); // últimos 8 días registrados
  }, [batches]);

  // 4. RENDIMIENTO POR MAESTRO MOLDEADOR (Conectado directamente a Vaciados)
  const operatorStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        totalUnits: number;
        batchCount: number;
        recentBatches: { id: string; label: string; quantity: number; date: string }[];
      }
    >();

    batches.forEach((b) => {
      const opId = b.operator_id || "sin-operario";
      const emp = employees.find((e) => e.id === b.operator_id);
      const opName = b.operator?.full_name || emp?.full_name || "Operario sin asignar";
      const qty = b.quantity_produced || 0;
      const bt = brickTypes.find((t) => t.id === b.brick_type_id);
      const formattedFolio = b.folio_number
        ? `Form. ${b.folio_number.replace(/^FOL-/i, "")}`
        : b.production_date;
      const batchLabel = `${formattedFolio} (${bt?.name?.replace("Ladrillo ", "") || "Lote"})`;

      const current = grouped.get(opId);
      if (!current) {
        grouped.set(opId, {
          id: opId,
          name: opName,
          totalUnits: qty,
          batchCount: 1,
          recentBatches: [{ id: b.id, label: batchLabel, quantity: qty, date: b.production_date || "" }],
        });
      } else {
        current.totalUnits += qty;
        current.batchCount += 1;
        current.recentBatches.push({
          id: b.id,
          label: batchLabel,
          quantity: qty,
          date: b.production_date || "",
        });
      }
    });

    return Array.from(grouped.values())
      .map((op) => {
        const avgPerBatch = op.batchCount > 0 ? Math.round(op.totalUnits / op.batchCount) : 0;
        const targetPct = Math.min(Math.round((avgPerBatch / DAILY_OPERATOR_TARGET) * 100), 120);
        const recentBatches = [...op.recentBatches]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 4);
        return {
          ...op,
          avgPerBatch,
          targetPct,
          recentBatches,
        };
      })
      .sort((a, b) => b.totalUnits - a.totalUnits);
  }, [batches, employees, brickTypes]);

  // 5. ESTADO DE HORNOS
  const hornosData = [
    {
      id: "horno-1",
      nombre: "Horno Continuo 1",
      capacidad: 10000,
      enCoccion: 9000,
      porcentaje: 90,
      fase: "Cocción Activa (980°C)",
      combustible: "Leña dura Tajibo",
      estadoColor: "emerald",
    },
    {
      id: "horno-2",
      nombre: "Horno de Bóveda 2",
      capacidad: 8000,
      enCoccion: 6000,
      porcentaje: 75,
      fase: "Calentamiento Progresivo",
      combustible: "Leña Curupaú",
      estadoColor: "amber",
    },
    {
      id: "horno-3",
      nombre: "Horno de Descarga 3",
      capacidad: 5000,
      enCoccion: 2000,
      porcentaje: 40,
      fase: "Enfriamiento & Despacho",
      combustible: "Enfriamiento",
      estadoColor: "blue",
    },
  ];

  return (
    <>
      <Header title="Dashboard General de Operaciones & Producción" />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Banner de Bienvenida y Estado de Planta */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Planta Activa
              </span>
              <span className="text-xs text-slate-300">Turno de Operaciones en Marcha</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold mt-2 tracking-tight">
              Hola, {userName}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Así es como va tu negocio hoy.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-center">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-orange-300 block">Vaciado de Hoy</span>
              <span className="text-2xl font-semibold text-white">{producedToday.toLocaleString("es-BO")}</span>
              <span className="text-[10px] text-slate-300 block">unid. moldeadas</span>
            </div>
            <div className="w-px h-10 bg-white/20 mx-1" />
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 block">Stock Total Planta</span>
              <span className="text-2xl font-semibold text-white">{totalStockGlobal.toLocaleString("es-BO")}</span>
              <span className="text-[10px] text-slate-300 block">unid. en planta</span>
            </div>
          </div>
        </div>

        {/* 1. TOP CARDS: 4 INDICADORES CLAVE DE PRODUCCIÓN Y OPERACIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Vaciado del Mes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-orange-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Vaciado del Mes
              </span>
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Factory className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-semibold text-slate-900 tracking-tight">
                {monthlyMolding.total.toLocaleString("es-BO")}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div className="mt-2.5 flex items-center text-xs text-emerald-600 font-semibold gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{monthlyMolding.periodLabel} • {monthlyMolding.count} lotes</span>
            </div>
          </div>

          {/* KPI 2: Disponible Real en Bodega */}
          <div
            className={`bg-white rounded-2xl p-5 border shadow-xs relative overflow-hidden group transition ${
              orderMetrics.availableReal < 0
                ? "border-rose-300 hover:border-rose-500/60"
                : orderMetrics.availableReal <= 5000
                ? "border-amber-300 hover:border-amber-500/60"
                : "border-slate-200/80 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Disponible Real en Bodega
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span
                className={`text-3xl font-semibold tracking-tight ${
                  orderMetrics.availableReal < 0
                    ? "text-rose-600"
                    : orderMetrics.availableReal <= 5000
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {orderMetrics.availableReal.toLocaleString("es-BO")}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div
              className={`mt-2.5 flex items-center text-xs font-semibold gap-1 ${
                orderMetrics.availableReal < 0
                  ? "text-rose-600"
                  : orderMetrics.availableReal <= 5000
                  ? "text-amber-700"
                  : "text-emerald-600"
              }`}
            >
              {orderMetrics.availableReal <= 5000 ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                Físico: {stockBodega.toLocaleString("es-BO")} • Comprometido: {orderMetrics.committedUnits.toLocaleString("es-BO")}
              </span>
            </div>
          </div>

          {/* KPI 3: Tasa de Merma / Rotura */}
          <div
            className={`bg-white rounded-2xl p-5 border shadow-xs relative overflow-hidden group transition ${
              kilnMetrics.mermaPct > 5
                ? "border-rose-300 hover:border-rose-500/60"
                : "border-slate-200/80 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Tasa de Merma / Rotura
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  kilnMetrics.mermaPct > 5
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <FlameKindling className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span
                className={`text-3xl font-semibold tracking-tight ${
                  kilnMetrics.mermaPct > 5 ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {kilnMetrics.mermaPct}%
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">del mes</span>
            </div>
            <div
              className={`mt-2.5 flex items-center text-xs font-semibold gap-1 ${
                kilnMetrics.mermaPct > 5 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {kilnMetrics.mermaPct > 5 ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {kilnMetrics.merma.toLocaleString("es-BO")} unid. rotas ({kilnMetrics.mermaPct > 5 ? "> 5%" : "≤ 5% meta"})
              </span>
            </div>
          </div>

          {/* KPI 4: Pedidos por Despachar */}
          <div
            className={`bg-white rounded-2xl p-5 border shadow-xs relative overflow-hidden group transition ${
              orderMetrics.committedUnits > stockBodega
                ? "border-amber-300 hover:border-amber-500/60"
                : "border-slate-200/80 hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Pedidos por Despachar
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-semibold text-slate-900 tracking-tight">
                {orderMetrics.committedUnits.toLocaleString("es-BO")}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
            </div>
            <div
              className={`mt-2.5 flex items-center text-xs font-semibold gap-1 ${
                orderMetrics.committedUnits > stockBodega ? "text-amber-700" : "text-slate-600"
              }`}
            >
              {orderMetrics.committedUnits > stockBodega ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              )}
              <span>
                {orderMetrics.pendingCount} {orderMetrics.pendingCount === 1 ? "pedido activo" : "pedidos activos"}
                {orderMetrics.committedUnits > stockBodega ? " • Supera stock libre" : " • Cubierto en bodega"}
              </span>
            </div>
          </div>
        </div>

        {/* 1B. VENTAS DEL DÍA Y DETALLE POR PRODUCTO */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-500/40 transition">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  Ventas del Día
                </span>
                <span className="text-3xl font-semibold text-slate-900 tracking-tight">
                  Bs. {salesTodayMetrics.totalAmount.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200/70">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>
                {salesTodayMetrics.count} {salesTodayMetrics.count === 1 ? "venta hoy" : "ventas hoy"} •{" "}
                {salesTodayMetrics.totalUnits.toLocaleString("es-BO")} unidades vendidas
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4" />

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-slate-700">Detalle de Ventas por Producto (Hoy)</span>
              <span className="text-[11px] font-semibold text-slate-500">
                {salesTodayMetrics.byProduct.length}{" "}
                {salesTodayMetrics.byProduct.length === 1 ? "producto" : "productos"}
              </span>
            </div>
            {salesTodayMetrics.byProduct.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                No hay ventas por producto registradas el día de hoy.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {salesTodayMetrics.byProduct.map((prod) => (
                  <div
                    key={prod.brickTypeId}
                    className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">{prod.brickName}</div>
                      <div className="text-[11px] text-slate-500">
                        {prod.quantity.toLocaleString("es-BO")} unid. vendidas
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-emerald-700">
                        Bs. {prod.totalAmount.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. INVENTARIOS UNIFICADOS: MATERIALES, LADRILLOS Y ALERTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tarjeta Unificada 1: Inventario de Material */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  Inventario de Material
                </span>
                <p className="text-[11px] text-slate-400">Materiales comprados para fabricar ladrillos</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-semibold text-slate-900 tracking-tight">
                {materialInventoryMetrics.categories.length}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">tipos de insumos</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-amber-700 font-semibold">
              <div className="flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {materialInventoryMetrics.purchaseCount} compras • Bs.{" "}
                  {materialInventoryMetrics.totalInvested.toLocaleString("es-BO")}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4" />

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 flex-1">
              {materialInventoryMetrics.categories.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No hay compras de materiales registradas.
                </p>
              ) : (
                materialInventoryMetrics.categories.map((mat) => (
                  <div
                    key={mat.name}
                    className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">{mat.name}</div>
                      <div className="text-[11px] text-slate-500 truncate" title={mat.lastDescription}>
                        {mat.count} {mat.count === 1 ? "compra" : "compras"} • Última: {mat.lastDate || "N/D"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-amber-900">
                        Bs. {mat.totalAmount.toLocaleString("es-BO")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tarjeta Unificada 2: Inventario de Ladrillos */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col hover:border-indigo-500/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  Inventario de Ladrillos
                </span>
                <p className="text-[11px] text-slate-400">Stock actual por tipo en bodega y proceso</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-semibold text-slate-900 tracking-tight">
                {brickInventoryMetrics.totalBodega.toLocaleString("es-BO")}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">en bodega</span>
            </div>
            <div className="mt-2 flex items-center text-xs text-indigo-700 font-semibold gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                {brickInventoryMetrics.typesWithStock} tipos listos • En Proceso:{" "}
                {stockEnProceso.toLocaleString("es-BO")} • Total: {totalStockGlobal.toLocaleString("es-BO")}
              </span>
            </div>

            <div className="border-t border-slate-100 my-4" />

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 flex-1">
              {brickInventoryMetrics.rows.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No hay inventario de ladrillos registrado.
                </p>
              ) : (
                brickInventoryMetrics.rows.map((row) => (
                  <div
                    key={row.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">{row.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Patio: {row.patio.toLocaleString("es-BO")} • Horno: {row.horno.toLocaleString("es-BO")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-indigo-700 block">
                        {row.bodega.toLocaleString("es-BO")} unid.
                      </span>
                      <span className="text-[10px] text-slate-400">en bodega</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tarjeta Unificada 3: Inventario en Alerta */}
          <div
            className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col transition ${
              alertInventoryMetrics.items.length > 0
                ? "border-rose-300 hover:border-rose-500/60"
                : "border-slate-200/80 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  Inventario en Alerta
                </span>
                <p className="text-[11px] text-slate-400">Pedidos por entregar con cero stock en bodega</p>
              </div>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  alertInventoryMetrics.items.length > 0
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <PackageX className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span
                className={`text-3xl font-semibold tracking-tight ${
                  alertInventoryMetrics.items.length > 0 ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {alertInventoryMetrics.items.length}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">
                {alertInventoryMetrics.items.length === 1 ? "tipo sin stock" : "tipos sin stock"}
              </span>
            </div>
            <div
              className={`mt-2 flex items-center text-xs font-semibold gap-1 ${
                alertInventoryMetrics.items.length > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {alertInventoryMetrics.items.length > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {alertInventoryMetrics.totalAlertUnits.toLocaleString("es-BO")} unid. por entregar en 0 stock
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Todos los pedidos con stock disponible</span>
                </>
              )}
            </div>

            <div className="border-t border-slate-100 my-4" />

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 flex-1">
              {alertInventoryMetrics.items.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-emerald-700">
                    Sin ladrillos en alerta
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Todos los pedidos pendientes tienen stock en bodega.
                  </p>
                </div>
              ) : (
                alertInventoryMetrics.items.map((item) => (
                  <div
                    key={item.brickTypeId}
                    className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-rose-950 truncate">{item.brickName}</div>
                      <div className="text-[11px] text-rose-700">
                        Por entregar: <strong className="font-semibold">{item.pendingUnits.toLocaleString("es-BO")} unid.</strong> (
                        {item.ordersCount} {item.ordersCount === 1 ? "pedido" : "pedidos"})
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-rose-600 text-white shrink-0">
                      0 stock
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 3. GRÁFICOS CENTRALES DE PRODUCCIÓN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Vaciados Diarios por Turno (Mañana vs Tarde) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-slate-800 text-sm">Vaciados Diarios por Turno</h3>
                <p className="text-xs text-slate-500">Comparativa de piezas producidas en Turno Mañana y Tarde</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-orange-600" />
                  <span className="text-slate-600">Mañana</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="text-slate-600">Tarde</span>
                </div>
              </div>
            </div>

            <div className="h-64">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                  <BarChart data={dailyProductionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="dia" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      formatter={(val, name) => [
                        `${Number(val).toLocaleString("es-BO")} unid.`,
                        name === "manana" ? "Turno Mañana" : "Turno Tarde",
                      ]}
                    />
                    <Bar dataKey="manana" name="manana" fill="#EA580C" radius={[4, 4, 0, 0]} stackId="turnos" />
                    <Bar dataKey="tarde" name="tarde" fill="#FBBF24" radius={[4, 4, 0, 0]} stackId="turnos" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Gráfico 2: Producción por Tipo de Ladrillo */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-slate-800 text-sm">Producción Acumulada por Tipo de Ladrillo</h3>
                <p className="text-xs text-slate-500">Distribución de unidades vaciadas en el mes</p>
              </div>
              <Boxes className="w-5 h-5 text-orange-600" />
            </div>

            <div className="h-64">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                  <BarChart layout="vertical" data={productionChartData.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" stroke="#64748B" fontSize={11} />
                    <YAxis dataKey="name" type="category" width={120} stroke="#64748B" fontSize={11} />
                    <Tooltip
                      formatter={(val) => [`${Number(val).toLocaleString("es-BO")} unidades`, "Producido"]}
                    />
                    <Bar dataKey="cantidad" fill="#C85A32" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* 4. PRODUCTIVIDAD DE MOLDEADORES */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-slate-800 text-sm">Rendimiento de Moldeadores</h3>
                  <p className="text-xs text-slate-500">Conectado a los vaciados registrados en planta</p>
                </div>
                <Award className="w-5 h-5 text-amber-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {operatorStats.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center col-span-full">
                    No hay vaciados registrados aún para calcular el rendimiento.
                  </p>
                ) : (
                  operatorStats.map((op, idx) => (
                    <div key={op.id} className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-100 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-semibold text-slate-900 truncate">{op.name}</span>
                            {idx === 0 && (
                              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                LÍDER
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-medium text-orange-700 shrink-0">
                            {op.totalUnits.toLocaleString("es-BO")} unid.
                          </span>
                        </div>

                        <div className="w-full bg-orange-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-orange-600 h-full rounded-full"
                            style={{ width: `${Math.min(op.targetPct, 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                          <span>
                            {op.batchCount} {op.batchCount === 1 ? "vaciado" : "vaciados"} • Prom:{" "}
                            <strong className="font-semibold">{op.avgPerBatch.toLocaleString("es-BO")} u</strong>
                          </span>
                          <span className="font-medium text-emerald-700">{op.targetPct}% meta</span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-orange-200/60 space-y-1">
                        {op.recentBatches.map((rb) => (
                          <div key={rb.id} className="flex items-center justify-between text-[10px] text-slate-600">
                            <span className="truncate pr-2">{rb.label}</span>
                            <span className="font-mono font-semibold text-slate-800 shrink-0">
                              {rb.quantity.toLocaleString("es-BO")} u
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Meta diaria por operario:</span>
              <strong className="text-slate-800 font-medium">
                {DAILY_OPERATOR_TARGET.toLocaleString("es-BO")} unid. / turno
              </strong>
            </div>
          </div>
      </div>
    </>
  );
}
