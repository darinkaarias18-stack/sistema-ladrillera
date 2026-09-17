"use server";

import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";
import { InventoryLocation, MovementType } from "@/types/database.types";

export async function getInventoryStockAction() {
  return { success: true, data: store.getInventoryStock() };
}

export async function createInventoryMovementAction(input: {
  brickTypeId: string;
  movementType: MovementType;
  quantity: number;
  fromLocation?: InventoryLocation | null;
  toLocation?: InventoryLocation | null;
}) {
  if (input.quantity <= 0) {
    return { success: false, error: "La cantidad debe ser mayor a 0" };
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
