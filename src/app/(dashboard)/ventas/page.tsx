"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { Sale, Customer, BrickType, PaymentMethod } from "@/types/database.types";
import { useEffect, useState } from "react";
import { ShoppingCart, Plus, DollarSign, CheckCircle2, User, Trash2, X } from "lucide-react";

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia");
  const [cartItems, setCartItems] = useState<{ brickTypeId: string; quantity: number; unitPrice: number }[]>([]);

  const loadData = () => {
    setSales(store.getSales());
    const custs = store.getCustomers();
    setCustomers(custs);
    if (custs.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(custs[0].id);
    }
    const bts = store.getBrickTypes();
    setBrickTypes(bts);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemToCart = () => {
    if (brickTypes.length === 0) return;
    const defaultBt = brickTypes[0];
    setCartItems([
      ...cartItems,
      { brickTypeId: defaultBt.id, quantity: 1000, unitPrice: defaultBt.sale_price },
    ]);
  };

  const handleRemoveCartItem = (index: number) => {
    const updated = [...cartItems];
    updated.splice(index, 1);
    setCartItems(updated);
  };

  const handleUpdateItem = (index: number, field: string, val: any) => {
    const updated = [...cartItems];
    if (field === "brickTypeId") {
      const bt = brickTypes.find((b) => b.id === val);
      updated[index].brickTypeId = val;
      if (bt) updated[index].unitPrice = bt.sale_price;
    } else if (field === "quantity") {
      updated[index].quantity = Number(val);
    } else if (field === "unitPrice") {
      updated[index].unitPrice = Number(val);
    }
    setCartItems(updated);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    store.createSale({
      customer_id: selectedCustomerId,
      payment_method: paymentMethod,
      total_amount: calculateTotal(),
      items: cartItems.map((item) => ({
        id: `sitem-${Date.now()}-${Math.random()}`,
        sale_id: "",
        brick_type_id: item.brickTypeId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    });

    setIsModalOpen(false);
    setCartItems([]);
    loadData();
  };

  return (
    <>
      <Header title="Ventas & Gestión de Pedidos de Clientes" />

      <div className="p-6 space-y-6">
        {/* Header bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Comercialización & Facturación</h3>
            <p className="text-xs text-slate-500">
              Registra ventas de ladrillos. Descuenta automáticamente el inventario de bodega y genera el ingreso en caja.
            </p>
          </div>

          <button
            onClick={() => {
              setIsModalOpen(true);
              if (cartItems.length === 0) handleAddItemToCart();
            }}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nueva Venta</span>
          </button>
        </div>

        {/* Historial de Ventas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">Registro de Ventas Emitidas</h4>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Total Ventas: {sales.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3.5">ID Venta / Fecha</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Detalle Productos</th>
                  <th className="p-3.5">Método de Pago</th>
                  <th className="p-3.5 text-right">Monto Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-slate-900 block">#{sale.id.slice(-6)}</span>
                      <span className="text-[11px] text-slate-500">{new Date(sale.created_at).toLocaleDateString("es-ES")}</span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {sale.customer?.name || "Cliente Particular"}
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-1">
                        {(sale.items || []).map((item, idx) => (
                          <div key={idx} className="text-slate-600">
                            <span className="font-bold text-slate-900 font-mono">{item.quantity.toLocaleString()}</span> x{" "}
                            {item.brick_type?.name} @ Bs. {item.unit_price.toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-700 text-sm">
                      Bs. {sale.total_amount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Registrar Venta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Emitir Venta Directa</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSale} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cliente *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Forma de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="efectivo">Efectivo Contado</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="credito">Crédito / Cuenta Por Cobrar</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700">Ítems de Venta (Ladrillos)</label>
                  <button
                    type="button"
                    onClick={handleAddItemToCart}
                    className="text-orange-600 hover:text-orange-700 font-semibold text-xs flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Producto</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <select
                        value={item.brickTypeId}
                        onChange={(e) => handleUpdateItem(idx, "brickTypeId", e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                      >
                        {brickTypes.map((bt) => (
                          <option key={bt.id} value={bt.id}>
                            {bt.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="100"
                        placeholder="Cantidad"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                        className="w-24 px-2 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-right font-bold"
                      />

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Precio"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, "unitPrice", e.target.value)}
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-right font-bold text-orange-600"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Card */}
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-emerald-900">Monto Total a Cobrar:</span>
                <span className="text-lg font-bold text-emerald-950">
                  Bs. {calculateTotal().toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  Emitir Venta & Cobrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
