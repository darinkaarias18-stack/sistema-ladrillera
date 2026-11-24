"use server";

import { employeeSchema } from "@/lib/validations/employee.schema";
import { store } from "@/lib/store";
import { revalidatePath } from "next/cache";
import { requirePermission, requireAdminEditDelete } from "@/lib/auth-guard";
import { Employee } from "@/types/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getEmployeesAction(search?: string) {
  const auth = await requirePermission("employees.view", "consultar nómina de empleados");
  if (!auth.authorized) return { success: false, error: auth.error, data: [] };

  const admin = getSupabaseAdminClient();
  if (admin) {
    let query = admin.from("employees").select("*").order("full_name");
    if (search && search.trim() !== "") {
      query = query.or(`full_name.ilike.%${search.trim()}%,document_id.ilike.%${search.trim()}%,position.ilike.%${search.trim()}%`);
    }
    const { data, error } = await query;
    if (!error && data) {
      return { success: true, data };
    }
  }

  return { success: true, data: store.getEmployees(search) };
}

export async function createEmployeeAction(input: unknown) {
  const auth = await requirePermission("employees.manage", "registrar empleados");
  if (!auth.authorized) return { success: false, error: auth.error };

  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const payload = {
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
  };

  const admin = getSupabaseAdminClient();
  let newEmp: Employee | null = null;
  if (admin) {
    const { data, error } = await admin.from("employees").insert(payload).select().single();
    if (error) return { success: false, error: error.message };
    newEmp = data;
  } else {
    newEmp = store.addEmployee(payload);
  }

  revalidatePath("/empleados");
  revalidatePath("/admin/usuarios");
  revalidatePath("/planillas");
  return { success: true, data: newEmp };
}

export async function updateEmployeeAction(id: string, input: unknown) {
  const auth = await requireAdminEditDelete("editar datos de empleados");
  if (!auth.authorized) return { success: false, error: auth.error };

  const parsed = employeeSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined) updatePayload.full_name = parsed.data.fullName;
    if (parsed.data.documentId !== undefined) updatePayload.document_id = parsed.data.documentId;
    if (parsed.data.position !== undefined) updatePayload.position = parsed.data.position;
    if (parsed.data.hireDate !== undefined) updatePayload.hire_date = parsed.data.hireDate;
    if (parsed.data.contractType !== undefined) updatePayload.contract_type = parsed.data.contractType;
    if (parsed.data.payFrequency !== undefined) updatePayload.pay_frequency = parsed.data.payFrequency;
    if (parsed.data.baseSalary !== undefined) updatePayload.base_salary = parsed.data.baseSalary;
    if (parsed.data.ratePerThousand !== undefined) updatePayload.rate_per_thousand = parsed.data.ratePerThousand;
    if (parsed.data.antiquityBonusPct !== undefined) updatePayload.antiquity_bonus_pct = parsed.data.antiquityBonusPct;
    if (parsed.data.frontierBonus !== undefined) updatePayload.frontier_bonus = parsed.data.frontierBonus;
    if (parsed.data.active !== undefined) updatePayload.active = parsed.data.active;

    const { data, error } = await admin.from("employees").update(updatePayload).eq("id", id).select().single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/empleados");
    revalidatePath("/admin/usuarios");
    revalidatePath("/planillas");
    return { success: true, data };
  }

  const updated = store.updateEmployee(id, parsed.data as Partial<Employee>);
  revalidatePath("/empleados");
  revalidatePath("/admin/usuarios");
  revalidatePath("/planillas");
  return { success: true, data: updated };
}

export async function deleteEmployeeAction(id: string) {
  const auth = await requireAdminEditDelete("eliminar empleados");
  if (!auth.authorized) return { success: false, error: auth.error };

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { error } = await admin.from("employees").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/empleados");
    revalidatePath("/admin/usuarios");
    revalidatePath("/planillas");
    return { success: true };
  }

  const deleted = store.deleteEmployee(id);
  revalidatePath("/empleados");
  revalidatePath("/admin/usuarios");
  revalidatePath("/planillas");
  return { success: deleted };
}
