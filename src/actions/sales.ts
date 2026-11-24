"use server";

import { saleSchema } from "@/lib/validations/sale.schema";
import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";
import { requirePermission, requireRoles } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTodayDateString } from "@/lib/dates";

export async function getSalesAction() {
  const auth = await requirePermission("sales.view", "consultar ventas");
  if (!auth.authorized) return { success: false, error: auth.error, data: [] };

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("sales")
      .select("*, customer:customers(*), items:sale_items(*, brick_type:brick_types(*))")
      .order("created_at", { ascending: false });
    if (!error && data) return { success: true, data };
  }

  return { success: true, data: store.getSales() };
}

export async function getCustomersAction() {
  const auth = await requireRoles(
    ["superadmin", "admin", "cajero", "ventas", "entrega_recepcion"],
    "consultar clientes"
  );
  if (!auth.authorized) return { success: false, error: auth.error, data: [] };

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin.from("customers").select("*").order("name");
    if (!error && data) return { success: true, data };
  }

  return { success: true, data: store.getCustomers() };
}

export async function createSaleAction(input: unknown) {
  const auth = await requirePermission("sales.create", "registrar ventas");
  if (!auth.authorized) return { success: false, error: auth.error };

  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const totalAmount = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data: insertedSale, error: saleError } = await admin
      .from("sales")
      .insert({
        customer_id: parsed.data.customerId || null,
        order_id: parsed.data.orderId || null,
        payment_method: parsed.data.paymentMethod,
        total_amount: totalAmount,
        sold_by: auth.session.user!.id,
      })
      .select()
      .single();

    if (saleError || !insertedSale) {
      return { success: false, error: saleError?.message || "Error al registrar venta" };
    }

    const saleItems = parsed.data.items.map((i) => ({
      sale_id: insertedSale.id,
      brick_type_id: i.brickTypeId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    }));

    const { error: itemsError } = await admin.from("sale_items").insert(saleItems);
    if (itemsError) {
      return { success: false, error: itemsError.message };
    }

    // Descontar inventario en bodega_terminado (trigger trg_inventory_movement)
    if (!parsed.data.orderId) {
      const movements = parsed.data.items.map((i) => ({
        brick_type_id: i.brickTypeId,
        movement_type: "salida",
        quantity: i.quantity,
        from_location: "bodega_terminado",
        reference_id: insertedSale.id,
        reference_type: "sale",
        created_by: auth.session.user!.id,
      }));
      await admin.from("inventory_movements").insert(movements);
    }

    // Registrar ingreso en Caja General
    await admin.from("cash_ledger").insert({
      movement_date: getTodayDateString(),
      description: `Venta #${insertedSale.id.slice(-6)} - ${parsed.data.paymentMethod.toUpperCase()}`,
      amount: totalAmount,
      category: "venta",
      reference_type: "sale",
      reference_id: insertedSale.id,
      created_by: auth.session.user!.id,
    });

    revalidatePath("/ventas");
    revalidatePath("/inventario");
    revalidatePath("/caja");
    return { success: true, data: insertedSale };
  }

  const sale = store.createSale({
    customer_id: parsed.data.customerId || undefined,
    order_id: parsed.data.orderId || undefined,
    payment_method: parsed.data.paymentMethod,
    total_amount: totalAmount,
    items: parsed.data.items.map((i) => ({
      id: `sitem-${Date.now()}-${Math.random()}`,
      sale_id: "",
      brick_type_id: i.brickTypeId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    })),
  });

  revalidatePath("/ventas");
  revalidatePath("/inventario");
  revalidatePath("/caja");
  return { success: true, data: sale };
}
