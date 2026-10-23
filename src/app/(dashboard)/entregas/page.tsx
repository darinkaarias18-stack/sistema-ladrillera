"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { Order, Customer, BrickType, Employee, DeliveryStatus } from "@/types/database.types";
import { useEffect, useState, useMemo } from "react";
import {
  Truck,
  Calendar,
  MapPin,
  Phone,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  MessageCircle,
  PackageOpen,
  X,
} from "lucide-react";

export default function EntregasPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);

  const loadData = () => {
    setOrders(store.getOrders());
    setCustomers(store.getCustomers());
    setEmployees(store.getEmployees().filter((e) => e.active));
    setBrickTypes(store.getBrickTypes().filter((b) => b.active));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = (orderId: string, newStatus: DeliveryStatus) => {
    store.updateOrderDeliveryStatus(orderId, newStatus);
    loadData();
  };

  const handleDriverChange = (orderId: string, driverId: string) => {
    store.updateOrderDriver(orderId, driverId);
    loadData();
  };

  // WhatsApp Dispatch message
  const sendWhatsAppNotification = (order: Order) => {
    const cust = customers.find((c) => c.id === order.customer_id);
    const driver = employees.find((e) => e.id === order.driver_id);
    const totalUnits = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

    let msg = `*AVISO DE DESPACHO & ENTREGA - INCEGUA S.R.L.*\n\n`;
    msg += `*Folio:* #${order.id.slice(-6).toUpperCase()}\n`;
    msg += `*Cliente:* ${cust?.name || "Cliente"}\n`;
    if (order.contact_phone) msg += `*Teléfono:* ${order.contact_phone}\n`;
    let delivLabel = "Puesto en Fábrica";
    if (order.delivery_type === "obra" || order.delivery_type === "envio") delivLabel = "Puesto en Obra";
    else if (order.delivery_type === "exportacion") delivLabel = "Exportación";
    msg += `*Modalidad:* ${delivLabel}\n`;
    if (order.delivery_address) msg += `*Dirección:* ${order.delivery_address}\n`;
    if (driver) msg += `*Chofer asignado:* ${driver.full_name}\n`;
    msg += `*Fecha programada:* ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("es-BO") : "Por coordinar"}\n`;
    msg += `*Total ladrillos:* ${totalUnits.toLocaleString()} unidades\n\n`;
    msg += `*Detalle de Carga:*\n`;
    (order.items || []).forEach((item) => {
      const brick = brickTypes.find((b) => b.id === item.brick_type_id);
      msg += `- ${item.quantity.toLocaleString()} x ${brick?.name || "Ladrillo"}\n`;
    });
    if (order.notes) msg += `\n*Observaciones:* ${order.notes}\n`;

    const targetPhone = order.contact_phone?.replace(/\D/g, "") || "59169370911";
    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  // Filtering
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      const currentDelivStatus = o.delivery_status || (o.status === "vendido" ? "entregado" : "programado");
      if (statusFilter !== "todos" && currentDelivStatus !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "todos") {
        if (typeFilter === "fabrica" && o.delivery_type !== "fabrica" && o.delivery_type !== "recojo") return false;
        if (typeFilter === "obra" && o.delivery_type !== "obra" && o.delivery_type !== "envio") return false;
        if (typeFilter === "exportacion" && o.delivery_type !== "exportacion") return false;
      }

      // Search
      if (search) {
        const q = search.toLowerCase();
        const custName = o.customer?.name?.toLowerCase() || "";
        const driverName = o.driver?.full_name?.toLowerCase() || "";
        const address = o.delivery_address?.toLowerCase() || "";
        const phone = o.contact_phone?.toLowerCase() || "";
        const id = o.id.toLowerCase();
        return (
          custName.includes(q) ||
          driverName.includes(q) ||
          address.includes(q) ||
          phone.includes(q) ||
          id.includes(q)
        );
      }

      return true;
    });
  }, [orders, statusFilter, typeFilter, search]);

  // Statistics
  const stats = useMemo(() => {
    let programados = 0;
    let entregados = 0;
    let totalLadrillos = 0;

    orders.forEach((o) => {
      const st = o.delivery_status || (o.status === "vendido" ? "entregado" : "programado");
      if (st === "programado") programados++;
      else if (st === "entregado") entregados++;

      (o.items || []).forEach((item) => {
        totalLadrillos += item.quantity;
      });
    });

    return {
      total: orders.length,
      programados,
      entregados,
      totalLadrillos,
    };
  }, [orders]);

  return (
    <>
      <Header title="Gestión de Entregas & Despachos de Ladrillos" />

      <div className="p-6 space-y-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Despachos</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalLadrillos.toLocaleString()} ladrillos en gestión</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Programados</p>
              <h3 className="text-2xl font-black text-amber-900 mt-0.5">{stats.programados}</h3>
              <p className="text-[11px] text-amber-600 mt-0.5">Pendientes de carga y salida</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Entregados con Éxito</p>
              <h3 className="text-2xl font-black text-emerald-900 mt-0.5">{stats.entregados}</h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">Recepción confirmada</p>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status pills */}
            <button
              onClick={() => setStatusFilter("todos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === "todos"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("programado")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "programado"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Programados ({stats.programados})
            </button>
            <button
              onClick={() => setStatusFilter("entregado")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "entregado"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Entregados ({stats.entregados})
            </button>

            {/* Delivery Type selector */}
            <div className="border-l border-slate-200 pl-2 ml-1">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="todos">Todas las Modalidades</option>
                <option value="fabrica">1. Puesto en Fábrica</option>
                <option value="obra">2. Puesto en Obra</option>
                <option value="exportacion">3. Exportación</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente, chofer, dirección..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Table of Deliveries */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Folio Despacho</th>
                  <th className="p-3.5">Cliente & Contacto</th>
                  <th className="p-3.5">Modalidad & Dirección</th>
                  <th className="p-3.5">Chofer / Despacho</th>
                  <th className="p-3.5">Carga de Ladrillos</th>
                  <th className="p-3.5">Fecha Programada</th>
                  <th className="p-3.5 text-center">Estado de Entrega</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-medium">No se encontraron entregas con los filtros actuales.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Las entregas se generan automáticamente cuando registras un pedido en el módulo Pedidos.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const currentDelivStatus: DeliveryStatus =
                      order.delivery_status || (order.status === "vendido" ? "entregado" : "programado");
                    const totalUnits = (order.items || []).reduce((acc, i) => acc + i.quantity, 0);

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* ID Folio */}
                        <td className="p-3.5 font-mono text-slate-600 font-semibold">
                          #{order.id.slice(-6).toUpperCase()}
                        </td>

                        {/* Cliente & Contacto */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{order.customer?.name || "Cliente General"}</div>
                          {order.contact_phone ? (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{order.contact_phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Sin teléfono</span>
                          )}
                        </td>

                        {/* Modalidad & Dirección */}
                        <td className="p-3.5 max-w-[220px]">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                order.delivery_type === "obra" || order.delivery_type === "envio"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : order.delivery_type === "exportacion"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {order.delivery_type === "obra" || order.delivery_type === "envio"
                                ? "Puesto en Obra"
                                : order.delivery_type === "exportacion"
                                ? "Exportación"
                                : "Puesto en Fábrica"}
                            </span>
                          </div>
                          {order.delivery_address ? (
                            <div className="text-slate-600 text-[11px] truncate flex items-center gap-1" title={order.delivery_address}>
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span className="truncate">{order.delivery_address}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Planta Central INCEGUA</span>
                          )}
                        </td>

                        {/* Chofer asignado */}
                        <td className="p-3.5">
                          {order.delivery_type === "obra" || order.delivery_type === "envio" || order.delivery_type === "exportacion" ? (
                            <select
                              value={order.driver_id || ""}
                              onChange={(e) => handleDriverChange(order.id, e.target.value)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            >
                              <option value="">Seleccionar chofer...</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.full_name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Recogido por cliente</span>
                          )}
                        </td>

                        {/* Detalle Ladrillos */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <PackageOpen className="w-3.5 h-3.5 text-orange-500" />
                            <span>{totalUnits.toLocaleString()} unidades</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[170px]">
                            {(order.items || []).map((i) => i.brick_type?.name).join(", ")}
                          </div>
                        </td>

                        {/* Fecha programada */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {order.delivery_date
                                ? new Date(order.delivery_date).toLocaleDateString("es-BO")
                                : "Sin fecha"}
                            </span>
                          </div>
                        </td>

                        {/* Estado Entrega (Dropdown interactivo) */}
                        <td className="p-3.5 text-center">
                          <select
                            value={currentDelivStatus}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as DeliveryStatus)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase cursor-pointer border shadow-2xs focus:outline-none transition-colors ${
                              currentDelivStatus === "programado"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : currentDelivStatus === "entregado"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-red-100 text-red-800 border-red-300"
                            }`}
                          >
                            <option value="programado">Programado</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </td>

                        {/* Acciones */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setDispatchOrder(order)}
                              title="Imprimir Guía de Despacho / Remito"
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-colors shadow-2xs"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => sendWhatsAppNotification(order)}
                              title="Enviar Hoja de Despacho por WhatsApp"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded-lg transition-colors shadow-2xs"
                            >
                              <MessageCircle className="w-4 h-4" />
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
        </div>
      </div>

      {/* Modal Imprimir Guía de Despacho & Remito */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:backdrop-blur-none">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200 print:shadow-none print:border-none print:w-full print:max-w-none print:max-h-none print:block">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
              <h3 className="font-bold text-slate-800">Guía de Despacho & Entrega</h3>
              <button onClick={() => setDispatchOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6 print:space-y-3 text-slate-800 overflow-y-auto print:overflow-visible print:p-4 print:text-sm" id="print-dispatch">
              <div className="text-center space-y-1 border-b pb-4 print:pb-2">
                <h2 className="text-2xl print:text-xl font-black">INCEGUA S.R.L.</h2>
                <p className="text-sm print:text-xs text-slate-600">Fábrica de Ladrillos - Control de Despachos</p>
                <h3 className="text-xl print:text-lg font-bold mt-2 print:mt-1 tracking-wide text-orange-950">
                  GUÍA DE DESPACHO & ENTREGA
                </h3>
                <p className="font-mono text-sm print:text-xs">#{dispatchOrder.id.slice(-6).toUpperCase()}</p>
              </div>

              <div className="space-y-2 print:space-y-1 text-sm print:text-xs">
                <p>
                  <span className="font-bold">Fecha de Emisión:</span>{" "}
                  {new Date(dispatchOrder.created_at || "").toLocaleDateString("es-BO")}
                </p>
                <p>
                  <span className="font-bold">Cliente:</span>{" "}
                  {customers.find((c) => c.id === dispatchOrder.customer_id)?.name}
                </p>
                {dispatchOrder.contact_phone && (
                  <p>
                    <span className="font-bold">Teléfono de Contacto:</span> {dispatchOrder.contact_phone}
                  </p>
                )}
                <p>
                  <span className="font-bold">Modalidad:</span>{" "}
                  {dispatchOrder.delivery_type === "obra" || dispatchOrder.delivery_type === "envio"
                    ? "Puesto en Obra"
                    : dispatchOrder.delivery_type === "exportacion"
                    ? "Exportación"
                    : "Puesto en Fábrica"}
                </p>
                {dispatchOrder.delivery_address && (
                  <p>
                    <span className="font-bold">Dirección de Entrega:</span> {dispatchOrder.delivery_address}
                  </p>
                )}
                {(dispatchOrder.delivery_type === "obra" || dispatchOrder.delivery_type === "envio" || dispatchOrder.delivery_type === "exportacion") && dispatchOrder.driver_id && (
                  <p>
                    <span className="font-bold">Chofer / Transporte:</span>{" "}
                    {employees.find((e) => e.id === dispatchOrder.driver_id)?.full_name}
                  </p>
                )}
                <p>
                  <span className="font-bold">Fecha Programada:</span>{" "}
                  {dispatchOrder.delivery_date
                    ? new Date(dispatchOrder.delivery_date).toLocaleDateString("es-BO")
                    : "Inmediata"}
                </p>
              </div>

              {/* Tabla de Ladrillos */}
              <table className="w-full text-sm print:text-xs text-left border-t border-b py-2 print:py-1">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 print:py-1">Producto / Ladrillo</th>
                    <th className="py-2 print:py-1 text-right">Cant. Despachada</th>
                  </tr>
                </thead>
                <tbody>
                  {(dispatchOrder.items || []).map((item, idx) => {
                    const brick = brickTypes.find((b) => b.id === item.brick_type_id);
                    return (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2 print:py-1 font-medium">{brick?.name}</td>
                        <td className="py-2 print:py-1 text-right font-bold">{item.quantity.toLocaleString()} un.</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {dispatchOrder.notes && (
                <div className="text-xs print:text-[10px] bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="font-bold">Observaciones:</span> {dispatchOrder.notes}
                </div>
              )}

              {/* Firmas de Conformidad */}
              <div className="pt-12 mt-6 print:pt-6 print:mt-4 border-t border-slate-300">
                <div className="flex flex-row justify-around gap-6 text-sm print:text-xs mb-8 print:mb-4">
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-full max-w-[200px] border-b border-slate-600 mb-2"></div>
                    <p className="font-bold text-slate-800">Firma Chofer / Despacho</p>
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-full max-w-[200px] border-b border-slate-600 mb-2"></div>
                    <p className="font-bold text-slate-800">Firma Recepción / Cliente</p>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 text-xs print:text-[10px] space-y-3 bg-slate-50/50">
                  <p className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider">
                    Constancia de Recepción
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-600 font-semibold">Nombre de quien recepciona:</span>
                      <div className="border-b border-dotted border-slate-400 w-full h-4"></div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-600 font-semibold">Fecha y hora de entrega:</span>
                      <div className="border-b border-dotted border-slate-400 w-full h-4"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs print:text-[10px] mt-6 pt-4 border-t text-slate-500 font-medium">
                INCEGUA S.R.L. - Sistema de Gestión y Control de Entregas
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 bg-slate-50 shrink-0 print:hidden">
              <button
                onClick={() => setDispatchOrder(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Guía</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
