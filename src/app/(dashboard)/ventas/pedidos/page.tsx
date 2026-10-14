"use client";

import { Header } from "@/components/layout/header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { store } from "@/lib/store";
import { Order, Customer, BrickType, InventoryStock, Employee, DeliveryType } from "@/types/database.types";
import { useEffect, useState, useMemo } from "react";
import { Plus, X, PackageOpen, Calendar, MapPin, AlertCircle, Printer, Trash2, Phone } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

interface OrderInput {
  customerId: string;
  contactPhone: string;
  deliveryAddress: string;
  brickTypeId: string;
  quantity: number;
  unitPrice: number;
  deliveryDate: string;
  deliveryType: DeliveryType;
  driverId: string;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [inventory, setInventory] = useState<InventoryStock[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<OrderInput>({
    defaultValues: {
      customerId: "",
      contactPhone: "",
      deliveryAddress: "",
      brickTypeId: "",
      quantity: 0,
      unitPrice: 0,
      deliveryDate: new Date().toISOString().split("T")[0],
      deliveryType: "fabrica",
      driverId: "",
      notes: "",
    },
  });

  const selectedCustomerId = useWatch({ control, name: "customerId" });
  const selectedBrickTypeId = useWatch({ control, name: "brickTypeId" });
  const requestedQuantity = useWatch({ control, name: "quantity" });
  const currentUnitPrice = useWatch({ control, name: "unitPrice" });
  const selectedDeliveryType = useWatch({ control, name: "deliveryType" });

  const loadData = () => {
    let list = store.getOrders();
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
  }, [search]);

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

  const onSubmit = (data: OrderInput) => {
    if (cartItems.length === 0) {
      alert("Debes agregar al menos un producto al pedido.");
      return;
    }
    
    const newOrder = store.createOrder({
      customer_id: data.customerId,
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
    
    // Generar mensaje de WhatsApp
    const customer = customers.find(c => c.id === data.customerId);
    if (customer) {
      const totalOrderAmount = cartItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
      let msg = `*NUEVO PEDIDO REGISTRADO*\n\n`;
      msg += `*Cliente:* ${customer.name}\n`;
      if (data.contactPhone) {
        msg += `*Teléfono:* ${data.contactPhone}\n`;
      }
      msg += `*Detalle:*\n`;
      cartItems.forEach(item => {
        msg += `- ${item.quantity} un. ${item.name} (Bs. ${item.unitPrice})\n`;
      });
      msg += `\n*Total:* Bs. ${totalOrderAmount.toFixed(2)}\n`;
      msg += `*Fecha estimada:* ${new Date(data.deliveryDate).toLocaleDateString("es-BO")}\n`;
      let delivTypeStr = "Puesto en Fábrica";
      if (data.deliveryType === 'obra' || data.deliveryType === 'envio') delivTypeStr = "Puesto en Obra";
      else if (data.deliveryType === 'exportacion') delivTypeStr = "Exportación";
      msg += `*Tipo de entrega:* ${delivTypeStr}\n`;
      if (data.deliveryAddress) {
        msg += `*Dirección:* ${data.deliveryAddress}\n`;
      }
      if (data.notes) {
        msg += `*Notas:* ${data.notes}\n`;
      }

      // Enviar siempre al número especificado por el usuario
      const phone = "59170673385";
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    }

    setReceiptOrder(newOrder);
    setIsModalOpen(false);
    setCartItems([]);
    reset();
    loadData();
  };

  const handleAddItem = () => {
    const bId = control._formValues.brickTypeId;
    const qty = Number(control._formValues.quantity);
    const price = Number(control._formValues.unitPrice);
    
    if (!bId || !qty || !price || qty <= 0 || price <= 0) {
      alert("Completa todos los campos del producto con valores válidos mayores a 0.");
      return;
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

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter(i => i.id !== id));
  };

  const pageSize = 10;
  const paginated = orders.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(orders.length / pageSize) || 1;

  // Inventory logic for the selected brick type
  const availableStock = useMemo(() => {
    if (!selectedBrickTypeId) return 0;
    const stock = inventory.find(i => i.brick_type_id === selectedBrickTypeId && i.location === "bodega_terminado");
    return stock ? stock.quantity : 0;
  }, [selectedBrickTypeId, inventory]);

  const stockAfterOrder = availableStock - (requestedQuantity || 0);
  const isOutOfStock = stockAfterOrder < 0;

  return (
    <>
      <Header title="Gestión de Pedidos" />

      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-orange-900 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-orange-200">Pedidos y Reservas</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Registra los pedidos de los clientes. Al crear un pedido, el inventario se reserva automáticamente de la bodega de producto terminado.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition shadow-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Pedido</span>
          </button>
        </div>

        {/* Tabla Toolbar & Contenido */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <DataTableToolbar onSearch={setSearch} placeholder="Buscar por cliente o estado..." />
          </div>

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
                    const totalOrderAmount = (order.items || []).reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
                    
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
                              <PackageOpen className="w-3.5 h-3.5 text-orange-500" />
                              <span>{item.quantity.toLocaleString()} x {item.brick_type?.name}</span>
                            </div>
                          ))}
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
                        <td className="p-3.5 font-bold text-slate-900">
                          Bs. {totalOrderAmount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-center">
                          <select
                            value={order.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              if (newStatus === "vendido") {
                                if (window.confirm("¿Confirmas que deseas Facturar/Convertir a Venta este pedido? Se registrará un ingreso en efectivo en caja y el estado cambiará a Vendido.")) {
                                  store.convertOrderToSale(order.id, "efectivo");
                                  loadData();
                                } else {
                                  e.target.value = order.status; // Revert
                                }
                              } else if (newStatus === "cancelado") {
                                if (window.confirm("¿Estás seguro de cancelar este pedido? El stock reservado volverá a estar disponible.")) {
                                  store.cancelOrder(order.id);
                                  loadData();
                                } else {
                                  e.target.value = order.status; // Revert
                                }
                              }
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase outline-none cursor-pointer border transition-colors ${
                              order.status === "pendiente" ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200" :
                              order.status === "vendido" ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-200" :
                              order.status === "cancelado" ? "bg-slate-200 text-slate-700 border-slate-300" :
                              "bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="vendido">Vendido</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
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
        </div>
      </div>

      {/* Modal para Crear Pedido */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Fijo */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <PackageOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Registrar Nuevo Pedido</h3>
                  <p className="text-xs text-slate-500">Ingresa los datos del cliente y los productos a despachar</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Cuerpo del Formulario con scroll interno */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente *</label>
                    <select
                      {...register("customerId", { required: "Debes seleccionar un cliente" })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">Seleccionar Cliente...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Entrega Estimada *</label>
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
                      placeholder="Ej. 70673385"
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
                          const stock = inventory.find(i => i.brick_type_id === b.id && i.location === "bodega_terminado")?.quantity || 0;
                          return (
                            <option key={b.id} value={b.id}>
                              {b.name} (Stock: {stock.toLocaleString()} - Bs. {b.sale_price})
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
                    <div className={`p-3 rounded-lg border flex flex-col md:flex-row justify-between items-center gap-2 ${isOutOfStock ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                      <div className="text-xs">
                        <span className="font-semibold text-slate-600">Stock Actual: </span> 
                        <span className="font-bold text-slate-800">{availableStock.toLocaleString()} un.</span>
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="font-semibold text-slate-600">Stock Final: </span>
                        <span className={`font-bold ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>{stockAfterOrder.toLocaleString()} un.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3 h-3" /> Añadir al Pedido
                      </button>
                    </div>
                  )}
                  {selectedBrickTypeId && isOutOfStock && (
                    <div className="flex items-start gap-1.5 text-[11px] font-bold text-red-600 mt-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>El pedido excede el stock físico. Se generará un saldo negativo pendiente de producción.</span>
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
                          <td colSpan={3} className="p-3 text-right text-slate-600 uppercase text-[10px]">Total Pedido:</td>
                          <td className="p-3 text-right text-sm text-slate-900">Bs. {cartItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td>
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notas u Observaciones (Opcional)</label>
                  <textarea
                    {...register("notes")}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                    placeholder="Instrucciones de entrega, dirección específica, etc."
                  />
                </div>
              </div>

              {/* Footer Fijo con botones de acción */}
              <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end space-x-3 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setCartItems([]); reset(); }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-sm transition"
                >
                  Confirmar Pedido
                </button>
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

              <div className="text-right text-lg print:text-base font-bold">
                Total: Bs. {(receiptOrder.items || []).reduce((acc, i) => acc + (i.quantity * i.unit_price), 0).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
              </div>

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

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 bg-slate-50 shrink-0 print:hidden">
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
      )}
    </>
  );
}
