"use server";

import { productionBatchSchema, brickTypeSchema } from "@/lib/validations/production.schema";
import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";

export async function getProductionBatchesAction(filter?: { date?: string; operatorId?: string; brickTypeId?: string }) {
  return { success: true, data: store.getProductionBatches(filter) };
}

export async function createProductionBatchAction(input: unknown) {
  const parsed = productionBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const batch = store.upsertProductionBatch({
    production_date: parsed.data.productionDate,
    brick_type_id: parsed.data.brickTypeId,
    operator_id: parsed.data.operatorId,
    shift: parsed.data.shift,
    quantity_produced: parsed.data.quantityProduced,
    status: parsed.data.status,
    folio_number: parsed.data.folioNumber,
    horno: parsed.data.horno,
    notes: parsed.data.notes,
    crew_ids: parsed.data.crewIds,
  });

  revalidatePath("/produccion");
  revalidatePath("/inventario");
  return { success: true, data: batch };
}

export async function getBrickTypesAction() {
  return { success: true, data: store.getBrickTypes() };
}

export async function createBrickTypeAction(input: unknown) {
  const parsed = brickTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const newBt = store.addBrickType({
    name: parsed.data.name,
    dimensions: parsed.data.dimensions,
    weight_kg: parsed.data.weightKg,
    sale_price: parsed.data.salePrice,
    estimated_cost: parsed.data.estimatedCost,
    active: parsed.data.active,
  });

  revalidatePath("/produccion");
  revalidatePath("/inventario");
  return { success: true, data: newBt };
}
