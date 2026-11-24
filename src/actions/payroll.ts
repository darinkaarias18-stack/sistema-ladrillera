"use server";

import { payrollPeriodSchema, advanceSchema, cashEntrySchema } from "@/lib/validations/payroll.schema";
import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTodayDateString } from "@/lib/dates";

export async function getPayrollPeriodsAction() {
  const auth = await requirePermission("payroll.view", "consultar periodos de planilla");
  if (!auth.authorized) return { success: false, error: auth.error, data: [] };

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("payroll_periods")
      .select("*")
      .order("start_date", { ascending: false });
    if (!error && data) return { success: true, data };
  }

  return { success: true, data: store.getPayrollPeriods() };
}

export async function getPayrollDetailsAction(periodId: string) {
  const auth = await requirePermission("payroll.view", "consultar detalles de planilla");
  if (!auth.authorized) return { success: false, error: auth.error, data: [] };

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("payroll_details")
      .select("*, employee:employees(*), period:payroll_periods(*)")
      .eq("period_id", periodId);
    if (!error && data) return { success: true, data };
  }

  return { success: true, data: store.getPayrollDetails(periodId) };
}

export async function createPayrollPeriodAction(input: unknown) {
  const auth = await requirePermission("payroll.manage", "crear periodos de planilla");
  if (!auth.authorized) return { success: false, error: auth.error };

  const parsed = payrollPeriodSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("payroll_periods")
      .insert({
        frequency: parsed.data.frequency,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        status: "abierto",
      })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/planillas");
    return { success: true, data };
  }

  const period = store.createPayrollPeriod(
    parsed.data.frequency,
    parsed.data.startDate,
    parsed.data.endDate
  );

  revalidatePath("/planillas");
  return { success: true, data: period };
}

export async function createAdvanceAction(input: unknown) {
  const auth = await requirePermission("payroll.manage", "registrar anticipos de sueldo");
  if (!auth.authorized) return { success: false, error: auth.error };

  const parsed = advanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data: adv, error } = await admin
      .from("employee_advances")
      .insert({
        employee_id: parsed.data.employeeId,
        period_id: parsed.data.periodId || null,
        amount: parsed.data.amount,
        advance_date: parsed.data.advanceDate,
        reason: parsed.data.reason || null,
        given_by: auth.session.user!.id,
      })
      .select()
      .single();

    if (error || !adv) return { success: false, error: error?.message || "Error al registrar anticipo" };

    await admin.from("cash_ledger").insert({
      movement_date: parsed.data.advanceDate,
      description: `Anticipo de sueldo - ${parsed.data.reason || "Sin motivo"}`,
      amount: -parsed.data.amount,
      category: "anticipo",
      reference_type: "employee_advances",
      reference_id: adv.id,
      created_by: auth.session.user!.id,
    });

    revalidatePath("/planillas");
    revalidatePath("/caja");
    return { success: true, data: adv };
  }

  const advance = store.addEmployeeAdvance({
    employee_id: parsed.data.employeeId,
    period_id: parsed.data.periodId || undefined,
    amount: parsed.data.amount,
    advance_date: parsed.data.advanceDate,
    reason: parsed.data.reason,
  });

  revalidatePath("/planillas");
  revalidatePath("/caja");
  return { success: true, data: advance };
}

export async function markPayrollAsPaidAction(detailId: string) {
  const auth = await requirePermission("payroll.manage", "marcar planilla como pagada");
  if (!auth.authorized) return { success: false, error: auth.error };

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data: pd, error } = await admin
      .from("payroll_details")
      .update({ paid: true, signed: true })
      .eq("id", detailId)
      .select("*, employee:employees(full_name)")
      .single();

    if (error || !pd) return { success: false, error: error?.message || "No se encontró el detalle de planilla" };

    await admin.from("cash_ledger").insert({
      movement_date: getTodayDateString(),
      description: `Pago planilla final: ${pd.employee?.full_name || "Empleado"}`,
      amount: -Number(pd.net_pay || 0),
      category: "planilla",
      reference_type: "payroll_details",
      reference_id: pd.id,
      created_by: auth.session.user!.id,
    });

    revalidatePath("/planillas");
    revalidatePath("/empleados");
    revalidatePath("/caja");
    return { success: true };
  }

  store.markPayrollAsPaid(detailId);
  revalidatePath("/planillas");
  revalidatePath("/empleados");
  revalidatePath("/caja");
  return { success: true };
}

export async function getCashLedgerAction() {
  const auth = await requirePermission("cash.view", "consultar libro de caja");
  if (!auth.authorized) return { success: false, error: auth.error, data: [], balance: 0 };

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("cash_ledger")
      .select("*")
      .order("movement_date", { ascending: false });
    if (!error && data) {
      const balance = data.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      return { success: true, data, balance };
    }
  }

  return { success: true, data: store.getCashLedger(), balance: store.getCashRunningBalance() };
}

export async function createCashEntryAction(input: unknown) {
  const auth = await requirePermission("cash.manage", "registrar movimientos de caja");
  if (!auth.authorized) return { success: false, error: auth.error };

  const parsed = cashEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("cash_ledger")
      .insert({
        movement_date: parsed.data.movementDate,
        description: parsed.data.description,
        amount: parsed.data.amount,
        category: parsed.data.category,
        created_by: auth.session.user!.id,
      })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/caja");
    return { success: true, data };
  }

  const entry = store.addCashLedgerEntry({
    movement_date: parsed.data.movementDate,
    description: parsed.data.description,
    amount: parsed.data.amount,
    category: parsed.data.category,
  });

  revalidatePath("/caja");
  return { success: true, data: entry };
}
