"use server";

import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";
import { InventoryLocation, MovementType } from "@/types/database.types";
import { requirePermission } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getInventoryStockAction() {
  const auth = await requirePermission("inventory.view", "consultar stock de inventario");
  if (!auth.authorized) return { success: false, error: auth.error, data: [] };

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin.from("inventory_stock").select("*, brick_type:brick_types(*)");
    if (!error && data) return { success: true, data };
  }

  return { success: true, data: store.getInventoryStock() };
}

export async function createInventoryMovementAction(input: {
  brickTypeId: string;
  movementType: MovementType;
  quantity: number;
  fromLocation?: InventoryLocation | null;
  toLocation?: InventoryLocation | null;
}) {
  const auth = await requirePermission("inventory.manage", "registrar movimientos de inventario");
  if (!auth.authorized) return { success: false, error: auth.error };

  if (input.quantity <= 0) {
    return { success: false, error: "La cantidad debe ser mayor a 0" };
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    // El trigger trg_inventory_movement en PostgreSQL actualiza inventory_stock automáticamente
    const { data, error } = await admin
      .from("inventory_movements")
      .insert({
        brick_type_id: input.brickTypeId,
        movement_type: input.movementType,
        quantity: input.quantity,
        from_location: input.fromLocation || null,
        to_location: input.toLocation || null,
        reference_type: "manual",
        created_by: auth.session.user!.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/inventario");
    return { success: true, data };
  }

  const movement = store.addInventoryMovement({
    brick_type_id: input.brickTypeId,
    movement_type: input.movementType,
    quantity: input.quantity,
    from_location: input.fromLocation,
    to_location: input.toLocation,
  });

  revalidatePath("/inventario");
  return { success: true, data: movement };
}
