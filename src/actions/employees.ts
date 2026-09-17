"use server";

import { employeeSchema } from "@/lib/validations/employee.schema";
import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";

export async function getEmployeesAction(search?: string) {
  return { success: true, data: store.getEmployees(search) };
}

export async function createEmployeeAction(input: unknown) {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const newEmp = store.addEmployee({
    full_name: parsed.data.fullName,
    document_id: parsed.data.documentId,
    position: parsed.data.position,
    hire_date: parsed.data.hireDate,
    contract_type: parsed.data.contractType,
    pay_frequency: parsed.data.payFrequency,
    base_salary: parsed.data.baseSalary,
    rate_per_thousand: parsed.data.ratePerThousand,
    antiquity_bonus_pct: parsed.data.antiquityBonusPct,
    frontier_bonus: parsed.data.frontierBonus,
    active: parsed.data.active,
  });

  revalidatePath("/empleados");
  return { success: true, data: newEmp };
}

export async function updateEmployeeAction(id: string, input: unknown) {
  const parsed = employeeSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const updated = store.updateEmployee(id, parsed.data as any);
  revalidatePath("/empleados");
  return { success: true, data: updated };
}
