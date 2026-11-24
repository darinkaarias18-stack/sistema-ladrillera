"use server";

import { productionBatchSchema, brickTypeSchema } from "@/lib/validations/production.schema";
import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedSession, requirePermission } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getProductionBatchesAction(filter?: { date?: string; operatorId?: string; brickTypeId?: string }) {
  const auth = await requirePermission("production.view", "consultar lotes de producción");
  if (!auth.authorized) return { success: false, error: auth.error, data: [] };

  const admin = getSupabaseAdminClient();
  if (admin) {
    let query = admin
      .from("production_batches")
      .select("*, brick_type:brick_types(*), operator:employees(*)")
      .order("production_date", { ascending: false });
    if (filter?.date) query = query.eq("production_date", filter.date);
    if (filter?.operatorId) query = query.eq("operator_id", filter.operatorId);
    if (filter?.brickTypeId) query = query.eq("brick_type_id", filter.brickTypeId);

    const { data, error } = await query;
    if (!error && data) return { success: true, data };
  }

  return { success: true, data: store.getProductionBatches(filter) };
}

export async function createProductionBatchAction(input: unknown) {
  const auth = await requirePermission("production.record", "registrar vaciados de producción");
  if (!auth.authorized) return { success: false, error: auth.error };

  const parsed = productionBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data: inserted, error } = await admin
      .from("production_batches")
      .upsert(
        {
          production_date: parsed.data.productionDate,
          brick_type_id: parsed.data.brickTypeId,
          operator_id: parsed.data.operatorId,
          shift: parsed.data.shift,
          quantity_produced: parsed.data.quantityProduced,
          status: parsed.data.status,
          folio_number: parsed.data.folioNumber || null,
          horno: parsed.data.horno || null,
          notes: parsed.data.notes || null,
          supervisor_id: auth.session.user!.id,
        },
        { onConflict: "production_date,brick_type_id,operator_id,shift" }
      )
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/produccion");
    revalidatePath("/inventario");
    return { success: true, data: inserted };
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
  const auth = await requireAuthenticatedSession();
  if (!auth.authorized) return { success: false, error: auth.error, data: [] };

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin.from("brick_types").select("*").order("name");
    if (!error && data) return { success: true, data };
  }

  return { success: true, data: store.getBrickTypes() };
}

export async function createBrickTypeAction(input: unknown) {
  const auth = await requirePermission("production.record", "crear tipos de ladrillo");
  if (!auth.authorized) return { success: false, error: auth.error };

  const parsed = brickTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("brick_types")
      .insert({
        name: parsed.data.name,
        dimensions: parsed.data.dimensions,
        weight_kg: parsed.data.weightKg,
        sale_price: parsed.data.salePrice,
        estimated_cost: parsed.data.estimatedCost,
        active: parsed.data.active,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/produccion");
    revalidatePath("/inventario");
    return { success: true, data };
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
