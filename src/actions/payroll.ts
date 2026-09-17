"use server";

import { payrollPeriodSchema, advanceSchema, cashEntrySchema } from "@/lib/validations/payroll.schema";
import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";

export async function getPayrollPeriodsAction() {
  return { success: true, data: store.getPayrollPeriods() };
}

export async function getPayrollDetailsAction(periodId: string) {
  return { success: true, data: store.getPayrollDetails(periodId) };
}

export async function createPayrollPeriodAction(input: unknown) {
  const parsed = payrollPeriodSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
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
  const parsed = advanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
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
  store.markPayrollAsPaid(detailId);
  revalidatePath("/planillas");
  revalidatePath("/empleados");
  revalidatePath("/caja");
  return { success: true };
}

export async function getCashLedgerAction() {
  return { success: true, data: store.getCashLedger(), balance: store.getCashRunningBalance() };
}

export async function createCashEntryAction(input: unknown) {
  const parsed = cashEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
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
