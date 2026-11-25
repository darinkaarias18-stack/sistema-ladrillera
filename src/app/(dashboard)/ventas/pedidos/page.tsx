"use client";

import { Header } from "@/components/layout/header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { store } from "@/lib/store";
import { Order, Customer, BrickType, InventoryStock, Employee, DeliveryType, OrderPaymentStatus, OrderFulfillmentType, OrderOperationalStatus } from "@/types/database.types";
import { useEffect, useState, useMemo } from "react";
import { Plus, X, PackageOpen, Calendar, MapPin, AlertCircle, Printer, Trash2, Phone, Percent, MessageCircle, Flame, CheckCircle2, LayoutGrid, List, ArrowRight, GripVertical } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

interface OrderInput {
  orderType: OrderFulfillmentType;
  customerId: string;
  contactPhone: string;
  deliveryAddress: string;
  brickTypeId: string;
  quantity: number;
  unitPrice: number;
  deliveryDate: string;
  deliveryType: DeliveryType;
  driverId: string;
  paymentStatus: OrderPaymentStatus;
  amountPaid: number;
  notes: string;
}

interface CartItem {
  id: string;
  brickTypeId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export default function PedidosPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [inventory, setInventory] = useState<InventoryStock[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "por_producir" | "listo_en_bodega" | "entregado" | "cancelado">("todos");
  const [paymentFilter, setPaymentFilter] = useState<"todos" | OrderPaymentStatus>("todos");
  const [viewMode, setViewMode] = useState<"lista" | "tablero">("lista");
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<OrderInput>({
    defaultValues: {
      orderType: "stock",
      customerId: "",
      contactPhone: "",
      deliveryAddress: "",
      brickTypeId: "",
      quantity: 0,
      unitPrice: 0,
      deliveryDate: new Date().toISOString().split("T")[0],
      deliveryType: "fabrica",
      driverId: "",
      paymentStatus: "por_cobrar",
      amountPaid: 0,
      notes: "",
    },
  });

  const selectedOrderType = useWatch({ control, name: "orderType" }) || "stock";
  const selectedCustomerId = useWatch({ control, name: "customerId" });
  const selectedBrickTypeId = useWatch({ control, name: "brickTypeId" });
  const requestedQuantity = useWatch({ control, name: "quantity" });
  const currentUnitPrice = useWatch({ control, name: "unitPrice" });
  const selectedDeliveryType = useWatch({ control, name: "deliveryType" });
  const selectedPaymentStatus = useWatch({ control, name: "paymentStatus" });
  const currentAmountPaid = useWatch({ control, name: "amountPaid" });

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [selectedCustomerId, customers]);

  const currentDiscountPct = useMemo(() => {
    if (!selectedCustomer?.city) return 0;
    return store.getDiscountForCity(selectedCustomer.city);
  }, [selectedCustomer]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [cartItems]);

  const cartDiscountAmount = useMemo(() => {
    return Number(((cartSubtotal * currentDiscountPct) / 100).toFixed(2));
  }, [cartSubtotal, currentDiscountPct]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - cartDiscountAmount);
  }, [cartSubtotal, cartDiscountAmount]);

  const loadData = () => {
    const rawOrders = store.getOrders();
    setAllOrders(rawOrders);
    let list = rawOrders;

    if (statusFilter !== "todos") {
      list = list.filter((o) => {
        const opStatus: OrderOperationalStatus =
          o.operational_status ||
          (o.status === "cancelado" || o.delivery_status === "cancelado"
            ? "cancelado"
            : o.status === "vendido" || o.delivery_status === "entregado"
            ? "entregado"
            : o.order_type === "contra_produccion"
            ? "por_producir"
            : "listo_en_bodega");
        return opStatus === statusFilter;
      });
    }

    if (paymentFilter !== "todos") {
      list = list.filter((o) => {
        const payStatus: OrderPaymentStatus = o.payment_status || (o.status === "vendido" ? "pagado" : "por_cobrar");
        return payStatus === paymentFilter;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customer?.name.toLowerCase().includes(q)) ||
          (o.contact_phone?.toLowerCase().includes(q)) ||
          (o.delivery_address?.toLowerCase().includes(q)) ||
          (o.status.toLowerCase().includes(q))
      );
    }
    setOrders(list);
    setCustomers(store.getCustomers());
    setBrickTypes(store.getBrickTypes().filter(bt => bt.active));
    setInventory(store.getInventoryStock());
    setEmployees(store.getEmployees().filter(e => e.active));
  };

  useEffect(() => {
    loadData();
    const events = [
      "erp_sync_completed",
      "erp_orders_updated",
      "erp_inventory_updated",
      "erp_brick_types_updated",
    ];
    events.forEach((ev) => window.addEventListener(ev, loadData));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, loadData));
    };
  }, [search, statusFilter, paymentFilter]);

  // Update default price when brick type changes
  useEffect(() => {
    if (selectedBrickTypeId) {
      const brick = brickTypes.find(b => b.id === selectedBrickTypeId);
      if (brick) {
        setValue("unitPrice", brick.sale_price);
      }
    }
  }, [selectedBrickTypeId, brickTypes, setValue]);

  // Autofill contact and address when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        if (customer.phone) setValue("contactPhone", customer.phone);
        if (customer.address) setValue("deliveryAddress", customer.address);
      }
    }
  }, [selectedCustomerId, customers, setValue]);

  const getReservedUnitsForBrick = (brickTypeId: string, includeCart = true) => {
    const inPendingOrders = allOrders
      .filter((o) => {
        const opStatus =
          o.operational_status ||
          (o.status === "pendiente" && o.order_type === "contra_produccion"
            ? "por_producir"
            : "listo_en_bodega");
        return (
          o.status === "pendiente" &&
          o.delivery_status !== "entregado" &&
          o.delivery_status !== "cancelado" &&
          opStatus === "listo_en_bodega"
        );
      })
      .reduce(
        (sum, o) =>
          sum +
          (o.items || [])
            .filter((it) => it.brick_type_id === brickTypeId)
            .reduce((iSum, it) => iSum + (it.quantity || 0), 0),
        0
      );

    const inCart =
      includeCart && selectedOrderType === "stock"
        ? cartItems
            .filter((c) => c.brickTypeId === brickTypeId)
            .reduce((sum, c) => sum + (c.quantity || 0), 0)
        : 0;

    return inPendingOrders + inCart;
  };

  const getFreeStockForBrick = (brickTypeId: string, includeCart = true) => {
    const bodega = inventory
      .filter((i) => i.brick_type_id === brickTypeId && i.location === "bodega_terminado")
      .reduce((sum, i) => sum + (i.quantity || 0), 0);
    return Math.max(0, bodega - getReservedUnitsForBrick(brickTypeId, includeCart));
  };

  const onSubmit = (data: OrderInput) => {
    setFormError(null);
    if (cartItems.length === 0) {
      setFormError("Debes agregar al menos un producto al pedido.");
      return;
    }

    const orderType: OrderFulfillmentType = data.orderType || "stock";

    if (orderType === "contra_produccion" && !data.deliveryDate) {
      setFormError("Los pedidos Contra Producción exigen una Fecha Comprometida de Entrega.");
      return;
    }

    // Validación estricta final contra Stock Libre en Bodega solo para pedidos inmediatos con stock
    if (orderType === "stock") {
      const qtyByBrick = new Map<string, number>();
      cartItems.forEach((it) => {
        qtyByBrick.set(it.brickTypeId, (qtyByBrick.get(it.brickTypeId) || 0) + it.quantity);
      });
      for (const [bId, reqQty] of qtyByBrick.entries()) {
        const freeWithoutCart = getFreeStockForBrick(bId, false);
        if (reqQty > freeWithoutCart) {
          const bName = brickTypes.find((b) => b.id === bId)?.name || "Producto";
          setFormError(
            `Stock insuficiente en bodega para ${bName} (Disponible libre: ${freeWithoutCart.toLocaleString("es-BO")} unid.) — cambia a "Contra Producción (Preventa)" o programa horneada.`
          );
          return;
        }
      }
    }

    const customer = customers.find(c => c.id === data.customerId);
    const customerCity = customer?.city || "Santa Cruz";
    const discountPct = store.getDiscountForCity(customerCity);
    const subtotal = cartItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const discountAmount = Number(((subtotal * discountPct) / 100).toFixed(2));
    const totalAmount = Math.max(0, subtotal - discountAmount);

    const payStatus: OrderPaymentStatus = data.paymentStatus || "por_cobrar";
    const amountPaid =
      payStatus === "pagado"
        ? totalAmount
        : payStatus === "anticipo"
        ? Math.min(totalAmount, Math.max(0, Number(data.amountPaid || 0)))
        : 0;

    const newOrder = store.createOrder({
      order_type: orderType,
      operational_status: orderType === "contra_produccion" ? "por_producir" : "listo_en_bodega",
      customer_id: data.customerId,
      city: customerCity,
      city_discount_pct: discountPct,
      city_discount_amount: discountAmount,
      subtotal: subtotal,
      total_amount: totalAmount,
      payment_status: payStatus,
      amount_paid: amountPaid,
      status: "pendiente",
      delivery_date: data.deliveryDate,
      delivery_type: data.deliveryType,
      delivery_address: data.deliveryAddress,
      contact_phone: data.contactPhone,
      driver_id: data.deliveryType === 'envio' ? data.driverId : undefined,
      notes: data.notes,
      items: cartItems.map(item => ({
        id: `item-${Date.now()}-${Math.random()}`,
        order_id: "", // Assigned by store
        brick_type_id: item.brickTypeId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))
    });
    
    // Notificación automática a WhatsApp oficial (+591 69370911)
    if (customer) {
      sendOrderWhatsApp(newOrder, customer.name, customerCity);
    }

    setReceiptOrder(newOrder);
    setIsModalOpen(false);
    setCartItems([]);
    setFormError(null);
    reset();
    loadData();
  };

  const handleAddItem = () => {
    setFormError(null);
    const bId = control._formValues.brickTypeId;
    const qty = Number(control._formValues.quantity);
    const price = Number(control._formValues.unitPrice);
    
    if (!bId || !qty || !price || qty <= 0 || price <= 0) {
      setFormError("Completa todos los campos del producto con valores válidos mayores a 0.");
      return;
    }

    if (selectedOrderType === "stock") {
      const freeStock = getFreeStockForBrick(bId, true);
      if (freeStock <= 0 || qty > freeStock) {
        setFormError("Stock insuficiente en bodega — requiere programación de horneada o cambiar a Contra Producción.");
        return;
      }
    }
    
    const brick = brickTypes.find(b => b.id === bId);
    if (!brick) return;

    setCartItems([...cartItems, {
      id: Date.now().toString(),
      brickTypeId: bId,
      name: brick.name,
      quantity: qty,
      unitPrice: price
    }]);
    
    setValue("brickTypeId", "");
    setValue("quantity", 0);
    setValue("unitPrice", 0);
  };

  const sendOrderWhatsApp = (order: Order, customerName?: string, customerCity?: string) => {
    const cust = customers.find((c) => c.id === order.customer_id);
    const cName = customerName || cust?.name || "Cliente";
    const cCity = customerCity || order.city || cust?.city || "Santa Cruz";

    let msg = `*NUEVO PEDIDO REGISTRADO (#${order.id.slice(-6).toUpperCase()})*\n\n`;
    msg += `*Cliente:* ${cName}\n`;
    if (cCity) {
      msg += `*Ciudad:* ${cCity}\n`;
    }
    if (order.contact_phone) {
      msg += `*Teléfono Contacto:* ${order.contact_phone}\n`;
    }
    msg += `\n*Detalle de Productos:*\n`;
    (order.items || []).forEach((item) => {
      const bName =
        item.brick_type?.name ||
        brickTypes.find((b) => b.id === item.brick_type_id)?.name ||
        "Ladrillo";
      msg += `- ${item.quantity.toLocaleString()} un. ${bName} (Bs. ${item.unit_price})\n`;
    });

    const subtotal =
      order.subtotal !== undefined
        ? order.subtotal
        : (order.items || []).reduce((acc, i) => acc + i.quantity * i.unit_price, 0);
    const discountPct = order.city_discount_pct || 0;
    const discountAmount = order.city_discount_amount || 0;
    const total =
      order.total_amount !== undefined
        ? order.total_amount
        : Math.max(0, subtotal - discountAmount);

    if (discountPct > 0) {
      msg += `\n*Subtotal:* Bs. ${subtotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}\n`;
      msg += `*Descuento Ciudad (${cCity} - ${discountPct}%):* -Bs. ${discountAmount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}\n`;
      msg += `*Total Final:* Bs. ${total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}\n`;
    } else {
      msg += `\n*Total a Pagar:* Bs. ${total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}\n`;
    }

    if (order.delivery_date) {
      msg += `*Fecha estimada entrega:* ${new Date(order.delivery_date).toLocaleDateString("es-BO")}\n`;
    }

    let delivTypeStr = "Puesto en Fábrica";
    if (order.delivery_type === "obra" || order.delivery_type === "envio") delivTypeStr = "Puesto en Obra";
    else if (order.delivery_type === "exportacion") delivTypeStr = "Exportación";
    msg += `*Tipo de entrega:* ${delivTypeStr}\n`;

    if (order.delivery_address) {
      msg += `*Dirección de Entrega:* ${order.delivery_address}\n`;
    }
    if (order.notes) {
      msg += `*Notas:* ${order.notes}\n`;
    }

    // Número oficial de WhatsApp especificado por el usuario (+591 69370911)
    const phone = "59169370911";
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter(i => i.id !== id));
  };

  const getOrderOpStatus = (o: Order): OrderOperationalStatus =>
    o.operational_status ||
    (o.status === "cancelado" || o.delivery_status === "cancelado"
      ? "cancelado"
      : o.status === "vendido" || o.delivery_status === "entregado"
      ? "entregado"
      : o.order_type === "contra_produccion"
      ? "por_producir"
      : "listo_en_bodega");

  const getPhysicalStockTrafficLight = (o: Order) => {
    const items = o.items || [];
    if (items.length === 0) {
      return { ok: true, actual: 0, missing: 0 };
    }
    let worstMissing = 0;
    let worstActual = 0;
    let minActualWhenOk = Infinity;

    for (const item of items) {
      const physical = inventory
        .filter((s) => s.brick_type_id === item.brick_type_id && s.location === "bodega_terminado")
        .reduce((sum, s) => sum + (s.quantity || 0), 0);
      if (physical < item.quantity) {
        const missing = item.quantity - physical;
        if (missing > worstMissing) {
          worstMissing = missing;
          worstActual = physical;
        }
      } else {
        minActualWhenOk = Math.min(minActualWhenOk, physical);
      }
    }

    if (worstMissing > 0) {
      return { ok: false, actual: worstActual, missing: worstMissing };
    }
    return { ok: true, actual: minActualWhenOk === Infinity ? 0 : minActualWhenOk, missing: 0 };
  };

  const handleAdvanceOrderStatus = (order: Order, target: "listo_en_bodega" | "entregado") => {
    const current = getOrderOpStatus(order);
    if (target === current) return;

    if (target === "listo_en_bodega" && current === "por_producir") {
      const res = store.promoteOrderToReady(order.id);
      if (!res.ok) {
        window.alert(res.message || "Stock insuficiente en Bodega para habilitar este pedido.");
        return;
      }
      loadData();
      return;
    }

    if (target === "entregado") {
      if (current === "por_producir") {
        window.alert("Este pedido aún está POR PRODUCIR. Primero debe pasar a Listo en Bodega (requiere stock en bodega / Deshorne).");
        return;
      }
      if (window.confirm("¿Confirmas marcar este pedido como ENTREGADO? Se registrará la salida definitiva en Inventario y se liberará la reserva.")) {
        store.updateOrderDeliveryStatus(order.id, "entregado");
        loadData();
      }
    }
  };

  const pageSize = 10;
  const paginated = orders.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(orders.length / pageSize) || 1;

  const kpiMetrics = useMemo(() => {
    const getOp = (o: Order): OrderOperationalStatus =>
      o.operational_status ||
      (o.status === "cancelado" || o.delivery_status === "cancelado"
        ? "cancelado"
        : o.status === "vendido" || o.delivery_status === "entregado"
        ? "entregado"
        : o.order_type === "contra_produccion"
        ? "por_producir"
        : "listo_en_bodega");

    const activePending = allOrders.filter((o) => {
      const op = getOp(o);
      return op === "listo_en_bodega" || op === "por_producir";
    });
    const porProducirOrders = allOrders.filter((o) => getOp(o) === "por_producir");
    const listoOrders = allOrders.filter((o) => getOp(o) === "listo_en_bodega");

    const porProducirUnits = porProducirOrders.reduce(
      (sum, o) => sum + (o.items || []).reduce((iSum, it) => iSum + (it.quantity || 0), 0),
      0
    );
    const reservedUnits = listoOrders.reduce(
      (sum, o) => sum + (o.items || []).reduce((iSum, it) => iSum + (it.quantity || 0), 0),
      0
    );
    const deliveredCount = allOrders.filter((o) => getOp(o) === "entregado").length;
    const canceledCount = allOrders.filter((o) => getOp(o) === "cancelado").length;

    return {
      activeCount: activePending.length,
      porProducirCount: porProducirOrders.length,
      porProducirUnits,
      listoCount: listoOrders.length,
      reservedUnits,
      deliveredCount,
      canceledCount,
      totalCount: allOrders.length,
    };
  }, [allOrders]);

  // Inventory logic for the selected brick type (Disponible Libre en Bodega)
  const reservedSelectedBrick = useMemo(() => {
    if (!selectedBrickTypeId) return 0;
    return getReservedUnitsForBrick(selectedBrickTypeId, true);
  }, [selectedBrickTypeId, allOrders, cartItems]);

  const availableStock = useMemo(() => {
    if (!selectedBrickTypeId) return 0;
    return getFreeStockForBrick(selectedBrickTypeId, true);
  }, [selectedBrickTypeId, inventory, allOrders, cartItems]);

  const stockAfterOrder = availableStock - (requestedQuantity || 0);
  const isOutOfStock = selectedOrderType === "stock" && (stockAfterOrder < 0 || availableStock <= 0);

  return (
    <>
      <Header title="Gestión de Pedidos" />

      {!isModalOpen ? (
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-orange-900 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-orange-200">Pedidos y Reservas</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Registra pedidos con stock inmediato en bodega o contra producción (preventa). Los pedidos contra producción se habilitan automáticamente al registrar el Deshorne.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`px-3.5 py-2 rounded-lg border text-xs flex items-center gap-2 ${
              kpiMetrics.porProducirUnits > 0
                ? "bg-amber-500/20 border-amber-400/60 text-amber-100"
                : "bg-slate-800/70 border-slate-700 text-slate-300"
            }`}>
              <Flame className={`w-4 h-4 ${kpiMetrics.porProducirUnits > 0 ? "text-amber-300" : "text-slate-400"}`} />
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-80">Unid. Comprometidas por Producir</div>
                <div className="font-bold text-sm">{kpiMetrics.porProducirUnits.toLocaleString("es-BO")} un. ({kpiMetrics.porProducirCount} ped.)</div>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition shadow-md whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Pedido</span>
            </button>
          </div>
        </div>

        {/* Tabla Toolbar & Contenido */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex-1">
                <DataTableToolbar onSearch={setSearch} placeholder="Buscar por cliente, teléfono o ID..." />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                  Pedidos Activos: <strong>{kpiMetrics.activeCount}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 font-semibold">
                  Unid. Reservadas: <strong>{kpiMetrics.reservedUnits.toLocaleString("es-BO")}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
                  Por Producir: <strong>{kpiMetrics.porProducirUnits.toLocaleString("es-BO")} un.</strong>
                </span>

                {/* Selector de Vista: Lista | Tablero */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("lista")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      viewMode === "lista"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Vista Lista</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("tablero")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      viewMode === "tablero"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Vista Tablero</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filtros combinados de Estado Logístico y Estado de Pago */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: "todos", label: `Todos (${kpiMetrics.totalCount})` },
                  { key: "por_producir", label: `Por Producir (${kpiMetrics.porProducirCount})` },
                  { key: "listo_en_bodega", label: `Listo en Bodega (${kpiMetrics.listoCount})` },
                  { key: "entregado", label: `Entregado (${kpiMetrics.deliveredCount})` },
                  { key: "cancelado", label: `Cancelado (${kpiMetrics.canceledCount})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.key as any);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer border ${
                      statusFilter === tab.key
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Pago:</span>
                {[
                  { key: "todos", label: "Todos los pagos" },
                  { key: "pagado", label: "Pagados 100%" },
                  { key: "anticipo", label: "Con Anticipo" },
                  { key: "por_cobrar", label: "Por Cobrar" },
                ].map((pTab) => (
                  <button
                    key={pTab.key}
                    type="button"
                    onClick={() => {
                      setPaymentFilter(pTab.key as any);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer border ${
                      paymentFilter === pTab.key
                        ? "bg-orange-600 text-white border-orange-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {pTab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {viewMode === "lista" ? (
            <>
              <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3.5">ID Pedido</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Productos Reservados</th>
                  <th className="p-3.5">Fecha Entrega</th>
                  <th className="p-3.5 text-center">Entrega</th>
                  <th className="p-3.5">Chofer</th>
                  <th className="p-3.5">Total</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No se encontraron pedidos registrados.
                    </td>
                  </tr>
                ) : (
                  paginated.map((order) => {
                    const subtotalAmount = order.subtotal !== undefined
                      ? order.subtotal
                      : (order.items || []).reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
                    const discountPct = order.city_discount_pct ?? 0;
                    const discountAmount = order.city_discount_amount ?? 0;
                    const finalAmount = order.total_amount !== undefined ? order.total_amount : Math.max(0, subtotalAmount - discountAmount);
                    
                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors ${
                          order.status === "pendiente"
                            ? "bg-emerald-50/50 hover:bg-emerald-50/80 border-l-4 border-l-emerald-500"
                            : order.status === "vendido"
                            ? "bg-red-50/50 hover:bg-red-50/80 border-l-4 border-l-red-500"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className={`p-3.5 font-mono font-bold ${
                          order.status === "pendiente"
                            ? "text-emerald-700"
                            : order.status === "vendido"
                            ? "text-red-700"
                            : "text-slate-600"
                        }`}>
                          #{order.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>{order.customer?.name || "Cliente Desconocido"}</div>
                          {order.contact_phone && (
                            <div className="text-[11px] text-slate-500 font-normal flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{order.contact_phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="flex items-center space-x-1">
                              <PackageOpen className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span>{item.quantity.toLocaleString("es-BO")} x {item.brick_type?.name}</span>
                            </div>
                          ))}
                          {(() => {
                            const op = getOrderOpStatus(order);
                            if (op !== "por_producir" && op !== "listo_en_bodega") return null;
                            const traffic = getPhysicalStockTrafficLight(order);
                            return traffic.ok ? (
                              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span>✓ Stock disponible en bodega: {traffic.actual.toLocaleString("es-BO")} un.</span>
                              </div>
                            ) : (
                              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span>⚠ Faltan {traffic.missing.toLocaleString("es-BO")} un. en bodega — Stock actual: {traffic.actual.toLocaleString("es-BO")} un.</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("es-BO") : "No definida"}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            order.delivery_type === 'obra' || order.delivery_type === 'envio'
                              ? 'bg-indigo-100 text-indigo-700'
                              : order.delivery_type === 'exportacion'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {order.delivery_type === 'obra' || order.delivery_type === 'envio'
                              ? 'Puesto en Obra'
                              : order.delivery_type === 'exportacion'
                              ? 'Exportación'
                              : 'Puesto en Fábrica'}
                          </span>
                          {order.delivery_address && (
                            <div className="text-[10px] text-slate-500 font-normal max-w-[130px] mx-auto mt-1 truncate" title={order.delivery_address}>
                              {order.delivery_address}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600 font-medium">
                          {order.delivery_type === 'obra' || order.delivery_type === 'envio' || order.delivery_type === 'exportacion'
                            ? (order.driver?.full_name || 'No asignado')
                            : '-'}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">
                            Bs. {finalAmount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                          </div>
                          {discountPct > 0 ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-slate-400 line-through">
                                Bs. {subtotalAmount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                              </span>
                              <span
                                className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300"
                                title={`Descuento aplicado por ciudad (${order.city || "Ciudad"}): ${discountPct}%`}
                              >
                                -{discountPct}% {order.city}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">
                              {order.city ? order.city : "Tarifa base"}
                            </div>
                          )}
                          {/* Etiqueta compacta de Pago / Saldo */}
                          {(() => {
                            const payStatus = order.payment_status || (order.status === "vendido" ? "pagado" : "por_cobrar");
                            const paid = order.amount_paid ?? (payStatus === "pagado" ? finalAmount : 0);
                            const balance = Math.max(0, finalAmount - paid);

                            if (payStatus === "pagado") {
                              return (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Pagado
                                </span>
                              );
                            }
                            if (payStatus === "anticipo") {
                              return (
                                <span
                                  className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                                  title={`Saldo pendiente: Bs. ${balance.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                                >
                                  Anticipo Bs. {paid.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </span>
                              );
                            }
                            return (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Por cobrar
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3.5 text-center">
                          {(() => {
                            const isDelivered = order.status === "vendido" || order.delivery_status === "entregado";
                            const opStatus: OrderOperationalStatus =
                              order.operational_status ||
                              (isDelivered
                                ? "entregado"
                                : order.status === "cancelado" || order.delivery_status === "cancelado"
                                ? "cancelado"
                                : order.order_type === "contra_produccion"
                                ? "por_producir"
                                : "listo_en_bodega");

                            return (
                              <select
                                value={opStatus}
                                disabled={opStatus === "entregado" || opStatus === "cancelado"}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  if (newStatus === "listo_en_bodega" && opStatus === "por_producir") {
                                    const res = store.promoteOrderToReady(order.id);
                                    if (!res.ok) {
                                      window.alert(res.message || "Stock insuficiente en Bodega para habilitar este pedido.");
                                      e.target.value = opStatus;
                                    } else {
                                      loadData();
                                    }
                                  } else if (newStatus === "entregado") {
                                    if (window.confirm("¿Confirmas marcar este pedido como ENTREGADO? Se registrará la salida definitiva en Inventario y se liberará la reserva.")) {
                                      store.updateOrderDeliveryStatus(order.id, "entregado");
                                      loadData();
                                    } else {
                                      e.target.value = opStatus;
                                    }
                                  } else if (newStatus === "cancelado") {
                                    if (window.confirm("¿Estás seguro de cancelar este pedido? El stock reservado volverá a estar disponible.")) {
                                      store.cancelOrder(order.id);
                                      loadData();
                                    } else {
                                      e.target.value = opStatus;
                                    }
                                  } else {
                                    e.target.value = opStatus;
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase outline-none border transition-colors ${
                                  opStatus === "por_producir" ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 cursor-pointer" :
                                  opStatus === "listo_en_bodega" ? "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 cursor-pointer" :
                                  opStatus === "entregado" ? "bg-emerald-100 text-emerald-800 border-emerald-300 cursor-default" :
                                  opStatus === "cancelado" ? "bg-slate-200 text-slate-700 border-slate-300 cursor-default" :
                                  "bg-slate-100 text-slate-800 border-slate-200"
                                }`}
                              >
                                {opStatus === "por_producir" && (
                                  <option value="por_producir">POR PRODUCIR</option>
                                )}
                                <option value="listo_en_bodega">LISTO EN BODEGA</option>
                                {opStatus !== "por_producir" && (
                                  <option value="entregado">ENTREGADO</option>
                                )}
                                <option value="cancelado">CANCELADO</option>
                              </select>
                            );
                          })()}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => sendOrderWhatsApp(order)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 p-2 rounded-lg transition-colors shadow-2xs flex items-center justify-center"
                              title="Enviar Pedido por WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setReceiptOrder(order)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors shadow-sm flex items-center justify-center"
                              title="Imprimir Nota de Venta"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

              <DataTablePagination
                page={page}
                totalPages={totalPages}
                totalItems={orders.length}
                onPageChange={setPage}
              />
            </>
          ) : (
            /* Vista Tablero Kanban Interactivo */
            <div className="p-4 bg-slate-50/70">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  {
                    key: "por_producir" as const,
                    title: "Por Producir (Comprometidos)",
                    headerClass: "bg-amber-100/90 text-amber-950 border-amber-300",
                    badgeClass: "bg-amber-200 text-amber-900",
                  },
                  {
                    key: "listo_en_bodega" as const,
                    title: "Listos en Bodega (Por Entregar)",
                    headerClass: "bg-blue-100/90 text-blue-950 border-blue-300",
                    badgeClass: "bg-blue-200 text-blue-900",
                  },
                  {
                    key: "entregado" as const,
                    title: "Entregados",
                    headerClass: "bg-emerald-100/90 text-emerald-950 border-emerald-300",
                    badgeClass: "bg-emerald-200 text-emerald-900",
                  },
                ].map((col) => {
                  const colOrders = orders.filter((o) => getOrderOpStatus(o) === col.key);
                  const isOver = dragOverColumn === col.key;

                  return (
                    <div
                      key={col.key}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverColumn !== col.key) setDragOverColumn(col.key);
                      }}
                      onDragLeave={() => {
                        if (dragOverColumn === col.key) setDragOverColumn(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverColumn(null);
                        const orderId = e.dataTransfer.getData("text/plain") || draggedOrderId;
                        setDraggedOrderId(null);
                        if (!orderId) return;
                        const droppedOrder = orders.find((o) => o.id === orderId) || allOrders.find((o) => o.id === orderId);
                        if (!droppedOrder) return;
                        if (col.key === "listo_en_bodega" || col.key === "entregado") {
                          handleAdvanceOrderStatus(droppedOrder, col.key);
                        }
                      }}
                      className={`rounded-xl border bg-slate-100/80 flex flex-col min-h-[380px] transition-colors ${
                        isOver ? "border-orange-500 ring-2 ring-orange-300 bg-orange-50/40" : "border-slate-200"
                      }`}
                    >
                      <div className={`px-3.5 py-2.5 rounded-t-xl border-b flex items-center justify-between ${col.headerClass}`}>
                        <span className="font-bold text-xs">{col.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${col.badgeClass}`}>
                          {colOrders.length}
                        </span>
                      </div>

                      <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[680px]">
                        {colOrders.length === 0 ? (
                          <div className="text-center text-xs text-slate-400 py-10 border border-dashed border-slate-300 rounded-lg bg-white/50">
                            Sin pedidos en esta columna
                          </div>
                        ) : (
                          colOrders.map((order) => {
                            const finalAmount =
                              order.total_amount !== undefined
                                ? order.total_amount
                                : (order.items || []).reduce((s, it) => s + it.quantity * it.unit_price, 0);
                            const payStatus = order.payment_status || (order.status === "vendido" ? "pagado" : "por_cobrar");
                            const paid = order.amount_paid ?? (payStatus === "pagado" ? finalAmount : 0);
                            const traffic = getPhysicalStockTrafficLight(order);
                            const canDrag = col.key !== "entregado";

                            return (
                              <div
                                key={order.id}
                                draggable={canDrag}
                                onDragStart={(e) => {
                                  setDraggedOrderId(order.id);
                                  e.dataTransfer.setData("text/plain", order.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedOrderId(null);
                                  setDragOverColumn(null);
                                }}
                                className={`bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5 transition ${
                                  canDrag ? "cursor-grab active:cursor-grabbing hover:border-orange-300 hover:shadow-sm" : ""
                                } ${draggedOrderId === order.id ? "opacity-50" : ""}`}
                              >
                                {/* Header tarjeta */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    {canDrag && <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                                    <span className="font-mono text-xs font-bold text-slate-800">
                                      #{order.id.slice(-6).toUpperCase()}
                                    </span>
                                  </div>
                                  {payStatus === "pagado" ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Pagado
                                    </span>
                                  ) : payStatus === "anticipo" ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      Anticipo Bs. {paid.toLocaleString("es-BO", { maximumFractionDigits: 0 })}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      Por cobrar
                                    </span>
                                  )}
                                </div>

                                {/* Cliente */}
                                <div>
                                  <div className="font-bold text-xs text-slate-900 truncate">
                                    {order.customer?.name || "Cliente Desconocido"}
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("es-BO") : "Sin fecha"}
                                    </span>
                                    <span className="font-bold text-slate-800">
                                      Bs. {finalAmount.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>

                                {/* Productos */}
                                <div className="bg-slate-50 rounded-lg p-2 space-y-1 text-[11px] text-slate-700 border border-slate-100">
                                  {(order.items || []).map((it, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-2">
                                      <span className="truncate font-medium">{it.brick_type?.name || "Ladrillo"}</span>
                                      <span className="font-bold text-slate-900 shrink-0">{it.quantity.toLocaleString("es-BO")} un.</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Semáforo real de stock */}
                                {col.key !== "entregado" && (
                                  <div
                                    className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                      traffic.ok
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                    }`}
                                  >
                                    {traffic.ok
                                      ? `✓ Stock disponible en bodega: ${traffic.actual.toLocaleString("es-BO")} un.`
                                      : `⚠ Faltan ${traffic.missing.toLocaleString("es-BO")} un. en bodega — Stock actual: ${traffic.actual.toLocaleString("es-BO")} un.`}
                                  </div>
                                )}

                                {/* Acción rápida */}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => sendOrderWhatsApp(order)}
                                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                      title="Enviar por WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setReceiptOrder(order)}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                      title="Imprimir Nota de Venta"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {col.key === "por_producir" && (
                                    <button
                                      type="button"
                                      onClick={() => handleAdvanceOrderStatus(order, "listo_en_bodega")}
                                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                        traffic.ok
                                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                                          : "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                                      }`}
                                    >
                                      <span>Pasar a Listo en Bodega</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}

                                  {col.key === "listo_en_bodega" && (
                                    <button
                                      type="button"
                                      onClick={() => handleAdvanceOrderStatus(order, "entregado")}
                                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition cursor-pointer"
                                    >
                                      <span>Enviar a Entrega</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      ) : (
      /* Vista Pantalla Completa para Registrar Nuevo Pedido (respetando menú izquierdo y barra superior) */
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* Header Oscuro */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
                <PackageOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Registrar Nuevo Pedido</h3>
                <p className="text-xs text-slate-300">Ingresa los datos del cliente y los productos a despachar</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); setFormError(null); }}
              className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Volver a Gestión de Pedidos"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
            {/* Cuerpo del Formulario en pantalla completa */}
            <div className="p-6 space-y-5">
                {/* Selector de Tipo de Pedido */}
                <div className="border border-slate-200 p-3.5 rounded-xl bg-slate-50 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">Tipo de Pedido *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                        selectedOrderType === "stock"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="radio"
                        value="stock"
                        {...register("orderType")}
                        onChange={() => {
                          setValue("orderType", "stock");
                          setFormError(null);
                        }}
                        className="accent-emerald-600 w-4 h-4 mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Con Stock en Bodega (Inmediato)
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          Valida stock libre en Bodega Terminada y lo reserva de inmediato.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                        selectedOrderType === "contra_produccion"
                          ? "bg-amber-50 border-amber-500 text-amber-950 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="radio"
                        value="contra_produccion"
                        {...register("orderType")}
                        onChange={() => {
                          setValue("orderType", "contra_produccion");
                          setFormError(null);
                        }}
                        className="accent-amber-600 w-4 h-4 mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-600" />
                          Contra Producción (Preventa / Compromiso)
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          Permite registrar sin stock en bodega (en patio, horno o por fabricar). Estado: POR PRODUCIR.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente *</label>
                    <select
                      {...register("customerId", { required: "Debes seleccionar un cliente" })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">Seleccionar Cliente...</option>
                      {customers.map((c) => {
                        const disc = store.getDiscountForCity(c.city);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.city ? `(${c.city}${disc > 0 ? ` • -${disc}% desc.` : ""})` : ""}
                          </option>
                        );
                      })}
                    </select>
                    {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}

                    {/* Banner Informativo de Ciudad y Descuento */}
                    {selectedCustomer && (
                      <div className="mt-2 p-2.5 rounded-lg bg-orange-50/70 border border-orange-200/80 flex items-center justify-between text-xs animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>Ciudad: <strong className="text-slate-900">{selectedCustomer.city || "Santa Cruz"}</strong></span>
                        </div>
                        {currentDiscountPct > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Percent className="w-3 h-3 text-emerald-600" />
                            Descuento: {currentDiscountPct}% OFF
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            Sin descuento por ciudad (0%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {selectedOrderType === "contra_produccion"
                        ? "Fecha Comprometida de Entrega *"
                        : "Fecha de Entrega Estimada *"}
                    </label>
                    <input
                      {...register("deliveryDate", { required: "Fecha obligatoria" })}
                      type="date"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                    />
                    {errors.deliveryDate && <p className="text-red-500 text-xs mt-1">{errors.deliveryDate.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono de Contacto</label>
                    <input
                      {...register("contactPhone")}
                      type="tel"
                      placeholder="Ej. 70000000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección de Entrega</label>
                    <input
                      {...register("deliveryAddress")}
                      type="text"
                      placeholder="Ej. Av. Blanco Galindo Km 6"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Opción de Entrega *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <label className={`flex items-center gap-2 text-xs font-semibold p-2.5 rounded-lg border cursor-pointer transition ${
                        selectedDeliveryType === 'fabrica' ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}>
                        <input type="radio" value="fabrica" {...register("deliveryType")} className="accent-orange-600 w-4 h-4" />
                        <span>1. Puesto en Fábrica</span>
                      </label>

                      <label className={`flex items-center gap-2 text-xs font-semibold p-2.5 rounded-lg border cursor-pointer transition ${
                        selectedDeliveryType === 'obra' ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}>
                        <input type="radio" value="obra" {...register("deliveryType")} className="accent-orange-600 w-4 h-4" />
                        <span>2. Puesto en Obra</span>
                      </label>

                      <label className={`flex items-center gap-2 text-xs font-semibold p-2.5 rounded-lg border cursor-pointer transition ${
                        selectedDeliveryType === 'exportacion' ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}>
                        <input type="radio" value="exportacion" {...register("deliveryType")} className="accent-orange-600 w-4 h-4" />
                        <span>3. Exportación</span>
                      </label>
                    </div>
                  </div>

                  {(selectedDeliveryType === "obra" || selectedDeliveryType === "exportacion" || selectedDeliveryType === "envio") && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200 pt-2 border-t border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Chofer / Transporte Asignado (Opcional)</label>
                      <select
                        {...register("driverId")}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="">Seleccionar Chofer / Transporte...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Sección de agregar productos */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <PackageOpen className="w-4 h-4 text-orange-600" />
                    Agregar Productos
                  </h4>
                  
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-6">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de Ladrillo</label>
                      <select
                        {...register("brickTypeId")}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="">Seleccionar...</option>
                        {brickTypes.map((b) => {
                          const freeStock = getFreeStockForBrick(b.id, true);
                          return (
                            <option key={b.id} value={b.id}>
                              {b.name} (Libre: {freeStock.toLocaleString("es-BO")} un. - Bs. {b.sale_price})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cantidad</label>
                      <input
                        {...register("quantity", { valueAsNumber: true })}
                        type="number"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">P.U. (Bs.)</label>
                      <input
                        {...register("unitPrice", { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                    </div>
                  </div>

                  {selectedBrickTypeId && (
                    <div className={`p-3 rounded-lg border flex flex-col md:flex-row justify-between items-center gap-2 ${
                      isOutOfStock
                        ? "bg-red-50 border-red-200"
                        : selectedOrderType === "contra_produccion"
                        ? "bg-amber-50/60 border-amber-200"
                        : "bg-white border-slate-200"
                    }`}>
                      <div className="text-xs flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>
                          <span className="font-semibold text-slate-600">Disponible Libre en Bodega: </span>
                          <span className={`font-bold ${availableStock <= 0 ? (selectedOrderType === "contra_produccion" ? "text-amber-700" : "text-red-600") : "text-emerald-700"}`}>
                            {availableStock.toLocaleString("es-BO")} un.
                          </span>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span>
                          <span className="font-semibold text-slate-600">Reservado: </span>
                          <span className="font-bold text-slate-700">{reservedSelectedBrick.toLocaleString("es-BO")} un.</span>
                        </span>
                        <span className="text-slate-300">|</span>
                        {selectedOrderType === "stock" ? (
                          <span>
                            <span className="font-semibold text-slate-600">Libre Final: </span>
                            <span className={`font-bold ${isOutOfStock ? "text-red-600" : "text-emerald-600"}`}>
                              {stockAfterOrder.toLocaleString("es-BO")} un.
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                            <Flame className="w-3.5 h-3.5 text-amber-600" />
                            Preventa: pasará a POR PRODUCIR
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={isOutOfStock || !requestedQuantity || requestedQuantity <= 0}
                        onClick={handleAddItem}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 ${
                          isOutOfStock || !requestedQuantity || requestedQuantity <= 0
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                        }`}
                      >
                        <Plus className="w-3 h-3" /> Añadir al Pedido
                      </button>
                    </div>
                  )}
                  {selectedBrickTypeId && isOutOfStock && (
                    <div className="flex items-start gap-1.5 text-[11px] font-bold text-red-600 mt-2 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Stock insuficiente en bodega — requiere programación de horneada o cambiar a &quot;Contra Producción (Preventa)&quot;.</span>
                    </div>
                  )}
                </div>

                {/* Lista de Items Agregados */}
                {cartItems.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Producto</th>
                          <th className="p-2.5 text-right">Cant.</th>
                          <th className="p-2.5 text-right">P.U.</th>
                          <th className="p-2.5 text-right">Subtotal</th>
                          <th className="p-2.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cartItems.map(item => (
                          <tr key={item.id} className="bg-white">
                            <td className="p-2.5 font-bold text-slate-700">{item.name}</td>
                            <td className="p-2.5 text-right font-medium">{item.quantity.toLocaleString()}</td>
                            <td className="p-2.5 text-right">Bs. {item.unitPrice.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td>
                            <td className="p-2.5 text-right font-bold">Bs. {(item.quantity * item.unitPrice).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td>
                            <td className="p-2.5 text-center">
                               <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                        <tr>
                          <td colSpan={3} className="p-2.5 text-right text-slate-500 uppercase text-[10px]">Subtotal:</td>
                          <td className="p-2.5 text-right text-xs text-slate-700">Bs. {cartSubtotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td>
                          <td></td>
                        </tr>
                        {currentDiscountPct > 0 && (
                          <tr className="bg-emerald-50/70 text-emerald-800 border-t border-emerald-100">
                            <td colSpan={3} className="p-2 text-right uppercase text-[10px] font-bold">
                              Descuento por Ciudad ({selectedCustomer?.city || "Ciudad"} - {currentDiscountPct}%):
                            </td>
                            <td className="p-2 text-right text-xs font-bold text-emerald-700">
                              - Bs. {cartDiscountAmount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        )}
                        <tr className="border-t border-slate-200 bg-orange-50/40">
                          <td colSpan={3} className="p-3 text-right text-slate-900 uppercase text-[10px] font-black">Total Final:</td>
                          <td className="p-3 text-right text-sm text-orange-700 font-black">Bs. {cartTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium bg-slate-50/50">
                    Aún no has agregado productos a este pedido.
                  </div>
                )}

                {/* Control de Pago / Anticipo */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Estado de Pago / Anticipo *
                      </label>
                      <select
                        {...register("paymentStatus")}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold bg-white focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="por_cobrar">Por Cobrar / Contra Entrega</option>
                        <option value="anticipo">Anticipo / Parcial</option>
                        <option value="pagado">Pagado Completo</option>
                      </select>
                    </div>

                    {selectedPaymentStatus === "anticipo" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Monto Abonado (Bs.) *
                        </label>
                        <input
                          {...register("amountPaid", { valueAsNumber: true })}
                          type="number"
                          min={0}
                          max={cartTotal || undefined}
                          step="0.01"
                          className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono font-bold text-amber-800 bg-white focus:ring-2 focus:ring-orange-500"
                        />
                        <p className="text-[11px] text-amber-700 font-semibold mt-1">
                          Saldo pendiente: Bs. {Math.max(0, cartTotal - (Number(currentAmountPaid) || 0)).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notas u Observaciones (Opcional)</label>
                  <textarea
                    {...register("notes")}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                    placeholder="Instrucciones de entrega, dirección específica, etc."
                  />
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              </div>

              {/* Footer con botones de acción e indicador de WhatsApp */}
              <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Notificación automática por WhatsApp</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setCartItems([]); setFormError(null); reset(); }}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Confirmar Pedido</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Modal para Imprimir Recibo */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:backdrop-blur-none">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200 print:shadow-none print:border-none print:w-full print:max-w-none print:max-h-none print:block">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
              <h3 className="font-bold text-slate-800">Nota de Venta Generada</h3>
              <button onClick={() => setReceiptOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6 print:space-y-3 text-slate-800 overflow-y-auto print:overflow-visible print:p-4 print:text-sm" id="print-section">
              <div className="text-center space-y-1 border-b pb-4 print:pb-2">
                <h2 className="text-2xl print:text-xl font-black">INCEGUA S.R.L.</h2>
                <p className="text-sm print:text-xs">Fábrica de Ladrillos</p>
                <h3 className="text-xl print:text-lg font-bold mt-2 print:mt-1">NOTA DE VENTA</h3>
                <p className="font-mono text-sm print:text-xs">#{receiptOrder.id.slice(-6).toUpperCase()}</p>
              </div>

              <div className="space-y-2 print:space-y-1 text-sm print:text-xs">
                <p><span className="font-bold">Fecha de Registro:</span> {new Date(receiptOrder.created_at || "").toLocaleDateString("es-BO")}</p>
                <p><span className="font-bold">Cliente:</span> {customers.find(c => c.id === receiptOrder.customer_id)?.name}</p>
                {(receiptOrder.city || customers.find(c => c.id === receiptOrder.customer_id)?.city) && (
                  <p><span className="font-bold">Ciudad:</span> {receiptOrder.city || customers.find(c => c.id === receiptOrder.customer_id)?.city}</p>
                )}
                {receiptOrder.contact_phone && (
                  <p><span className="font-bold">Teléfono de Contacto:</span> {receiptOrder.contact_phone}</p>
                )}
                <p><span className="font-bold">Fecha de Entrega:</span> {new Date(receiptOrder.delivery_date || "").toLocaleDateString("es-BO")}</p>
                <p>
                  <span className="font-bold">Tipo de Entrega:</span>{" "}
                  {receiptOrder.delivery_type === "obra" || receiptOrder.delivery_type === "envio"
                    ? "Puesto en Obra"
                    : receiptOrder.delivery_type === "exportacion"
                    ? "Exportación"
                    : "Puesto en Fábrica"}
                </p>
                {receiptOrder.delivery_address && (
                  <p><span className="font-bold">Dirección de Entrega:</span> {receiptOrder.delivery_address}</p>
                )}
                {(receiptOrder.delivery_type === "obra" || receiptOrder.delivery_type === "envio" || receiptOrder.delivery_type === "exportacion") && receiptOrder.driver_id && (
                  <p><span className="font-bold">Chofer Asignado:</span> {employees.find(e => e.id === receiptOrder.driver_id)?.full_name}</p>
                )}
              </div>

              <table className="w-full text-sm print:text-xs text-left border-t border-b py-2 print:py-1">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 print:py-1">Producto</th>
                    <th className="py-2 print:py-1 text-right">Cant.</th>
                    <th className="py-2 print:py-1 text-right">P.U.</th>
                    <th className="py-2 print:py-1 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(receiptOrder.items || []).map((item, idx) => {
                    const brick = brickTypes.find(b => b.id === item.brick_type_id);
                    return (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2 print:py-1">{brick?.name}</td>
                        <td className="py-2 print:py-1 text-right">{item.quantity}</td>
                        <td className="py-2 print:py-1 text-right">Bs. {item.unit_price}</td>
                        <td className="py-2 print:py-1 text-right">Bs. {(item.quantity * item.unit_price).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {(() => {
                const subtotal = receiptOrder.subtotal !== undefined
                  ? receiptOrder.subtotal
                  : (receiptOrder.items || []).reduce((acc, i) => acc + (i.quantity * i.unit_price), 0);
                const discountPct = receiptOrder.city_discount_pct || 0;
                const discountAmount = receiptOrder.city_discount_amount || 0;
                const total = receiptOrder.total_amount !== undefined
                  ? receiptOrder.total_amount
                  : Math.max(0, subtotal - discountAmount);

                return (
                  <div className="space-y-1.5 text-right text-sm">
                    <div className="text-slate-600">
                      Subtotal: <span className="font-semibold text-slate-800">Bs. {subtotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {discountPct > 0 && (
                      <div className="text-emerald-700 font-medium">
                        Descuento Ciudad ({receiptOrder.city || "Ciudad"} - {discountPct}%):{" "}
                        <span className="font-bold">- Bs. {discountAmount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="text-lg print:text-base font-black text-slate-900 pt-1 border-t">
                      Total a Pagar: Bs. {total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })()}

              {receiptOrder.notes && (
                <div className="text-xs pt-4 print:pt-2 border-t">
                  <span className="font-bold">Notas:</span> {receiptOrder.notes}
                </div>
              )}

              {/* Firmas y Recepción */}
              <div className="pt-16 mt-8 print:pt-8 print:mt-4 border-t border-slate-300">
                <div className="flex flex-row justify-around gap-4 md:gap-12 text-sm print:text-xs mb-8 print:mb-4">
                  {/* Firma Chofer */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-full max-w-[250px] border-b border-slate-600 mb-2 print:mb-1"></div>
                    <p className="font-bold text-slate-800">Firma Chofer / Despacho</p>
                  </div>
                  
                  {/* Firma Cliente */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-full max-w-[250px] border-b border-slate-600 mb-2 print:mb-1"></div>
                    <p className="font-bold text-slate-800">Firma Recepción / Cliente</p>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-lg p-4 print:p-3 text-xs print:text-[10px] space-y-4 print:space-y-2 bg-slate-50/50">
                  <p className="font-bold text-slate-800 border-b border-slate-200 pb-2 print:pb-1 mb-2 print:mb-1 uppercase text-[11px] print:text-[9px] tracking-wider">Detalle de Recepción</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 print:gap-y-3 gap-x-8">
                    <div className="space-y-1">
                      <span className="text-slate-600 font-semibold">Nombre de quien recepciona:</span>
                      <div className="border-b border-dotted border-slate-400 w-full h-5 print:h-4"></div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-600 font-semibold">Fecha y hora de recepción:</span>
                      <div className="border-b border-dotted border-slate-400 w-full h-5 print:h-4"></div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-600 font-semibold">Cantidad recibida (Unidades):</span>
                      <div className="border-b border-dotted border-slate-400 w-full h-5 print:h-4"></div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-600 font-semibold">Tipo de Ladrillos:</span>
                      <div className="border-b border-dotted border-slate-400 w-full h-5 print:h-4"></div>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-slate-600 font-semibold">Observaciones:</span>
                      <div className="border-b border-dotted border-slate-400 w-full h-5 print:h-4"></div>
                      <div className="border-b border-dotted border-slate-400 w-full h-5 print:h-4 mt-2 print:mt-1"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-xs print:text-[10px] mt-8 pt-6 print:mt-4 print:pt-3 border-t text-slate-500 font-medium">
                ¡Gracias por su preferencia! - INCEGUA S.R.L.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
              <button
                onClick={() => sendOrderWhatsApp(receiptOrder)}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </button>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setReceiptOrder(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2"
                >
                  Imprimir Recibo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
