"use server";

import { saleSchema } from "@/lib/validations/sale.schema";
import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";

export async function getSalesAction() {
  return { success: true, data: store.getSales() };
}

export async function getCustomersAction() {
  return { success: true, data: store.getCustomers() };
}

export async function createSaleAction(input: unknown) {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const totalAmount = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

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
