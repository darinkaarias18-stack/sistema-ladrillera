import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedSession } from "@/lib/auth-guard";
import { canEditOrDelete, canPerformAction } from "@/lib/role-validator";
import { UserRole } from "@/types/database.types";

const ALLOWED_SYNC_TABLES = new Set([
  "employees",
  "brick_types",
  "customers",
  "production_batches",
  "inventory_stock",
  "inventory_movements",
  "orders",
  "order_items",
  "sales",
  "sale_items",
  "payroll_periods",
  "payroll_details",
  "employee_advances",
  "cash_ledger",
  "employee_attendance",
  "employee_settlements",
  "horno_cycles",
  "patio_despachos",
  "city_discounts",
]);

function canMutateTable(role: UserRole, table: string, action: string): boolean {
  if (!ALLOWED_SYNC_TABLES.has(table)) return false;
  if (role === "superadmin") return true;
  if (action === "delete" && !canEditOrDelete(role)) return false;

  switch (table) {
    case "employees":
      return canPerformAction(role, "employees.manage");
    case "payroll_periods":
    case "payroll_details":
    case "employee_advances":
    case "employee_settlements":
      return canPerformAction(role, "payroll.manage");
    case "employee_attendance":
      return canPerformAction(role, "employees.manage") || canPerformAction(role, "production.record");
    case "brick_types":
      return canPerformAction(role, "employees.manage") || canPerformAction(role, "production.record");
    case "production_batches":
      return canPerformAction(role, "production.record");
    case "horno_cycles":
      return canPerformAction(role, "kilns.manage") || canPerformAction(role, "production.record");
    case "patio_despachos":
      return canPerformAction(role, "deliveries.manage") || canPerformAction(role, "production.record") || canPerformAction(role, "sales.create");
    case "city_discounts":
      return canPerformAction(role, "employees.manage");
    case "inventory_stock":
    case "inventory_movements":
      return (
        canPerformAction(role, "inventory.manage") ||
        canPerformAction(role, "production.record") ||
        canPerformAction(role, "sales.create") ||
        canPerformAction(role, "deliveries.manage")
      );
    case "customers":
    case "orders":
    case "order_items":
    case "sales":
    case "sale_items":
      return canPerformAction(role, "sales.create") || canPerformAction(role, "deliveries.manage");
    case "cash_ledger":
      return (
        canPerformAction(role, "cash.manage") ||
        canPerformAction(role, "sales.create") ||
        canPerformAction(role, "payroll.manage")
      );
    default:
      return false;
  }
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Credenciales de Supabase no configuradas en el servidor");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// Limpia únicamente relaciones unidas (joins) y columnas generadas automáticamente en PostgreSQL
function sanitizePayload(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...data };

  // Eliminar referencias a objetos anidados / joins
  delete clean.brick_type;
  delete clean.operator;
  delete clean.customer;
  delete clean.driver;
  delete clean.employee;
  delete clean.period;
  delete clean.quemador;
  delete clean.crew_ids;

  // En patio_despachos 'items' es una columna jsonb; en orders/sales se inserta en tabla hija
  if (table !== "patio_despachos") {
    delete clean.items;
  }

  if (table === "payroll_details") {
    // Columnas generadas automáticamente (GENERATED ALWAYS AS)
    delete clean.total_earned;
    delete clean.net_pay;
  }

  if (table === "employee_settlements") {
    // total_amount es una columna calculada/generada en PostgreSQL (GENERATED ALWAYS AS)
    delete clean.total_amount;
  }

  return clean;
}

export async function GET() {
  try {
    const auth = await requireAuthenticatedSession();
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const role = auth.session.role;
    const canViewPayroll = canPerformAction(role, "payroll.view");
    const canViewCash = canPerformAction(role, "cash.view");
    const canViewSales = canPerformAction(role, "sales.view") || canPerformAction(role, "deliveries.view");

    const admin = getAdminClient();

    // Consultar todas las tablas operativas de Supabase en paralelo
    const [
      employeesRes,
      brickTypesRes,
      customersRes,
      batchesRes,
      stockRes,
      movementsRes,
      ordersRes,
      orderItemsRes,
      salesRes,
      saleItemsRes,
      periodsRes,
      payrollDetailsRes,
      advancesRes,
      cashRes,
      attendanceRes,
      settlementsRes
    ] = await Promise.all([
      admin.from("employees").select("*").order("full_name"),
      admin.from("brick_types").select("*").order("name"),
      canViewSales ? admin.from("customers").select("*").order("name") : Promise.resolve({ data: [] }),
      admin.from("production_batches").select("*").order("production_date", { ascending: false }),
      admin.from("inventory_stock").select("*"),
      admin.from("inventory_movements").select("*").order("created_at", { ascending: false }),
      canViewSales ? admin.from("orders").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      canViewSales ? admin.from("order_items").select("*") : Promise.resolve({ data: [] }),
      canViewSales ? admin.from("sales").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      canViewSales ? admin.from("sale_items").select("*") : Promise.resolve({ data: [] }),
      canViewPayroll ? admin.from("payroll_periods").select("*").order("start_date", { ascending: false }) : Promise.resolve({ data: [] }),
      canViewPayroll ? admin.from("payroll_details").select("*") : Promise.resolve({ data: [] }),
      canViewPayroll ? admin.from("employee_advances").select("*").order("advance_date", { ascending: false }) : Promise.resolve({ data: [] }),
      canViewCash ? admin.from("cash_ledger").select("*").order("movement_date", { ascending: false }) : Promise.resolve({ data: [] }),
      admin.from("employee_attendance").select("*").order("date", { ascending: false }),
      canViewPayroll ? admin.from("employee_settlements").select("*").order("settlement_date", { ascending: false }) : Promise.resolve({ data: [] })
    ]);

    // Ocultar información salarial y PII sensible a roles sin permiso de planilla
    const sanitizedEmployees = (employeesRes.data || []).map((emp: Record<string, unknown>) => {
      if (canViewPayroll) return emp;
      const publicEmp = { ...emp };
      delete publicEmp.base_salary;
      delete publicEmp.rate_per_thousand;
      delete publicEmp.antiquity_bonus_pct;
      delete publicEmp.frontier_bonus;
      delete publicEmp.document_id;
      return publicEmp;
    });

    // Ensamblar ítems anidados en pedidos
    const orderItemsMap = new Map<string, Record<string, unknown>[]>();
    (orderItemsRes.data || []).forEach((item) => {
      const list = orderItemsMap.get(item.order_id) || [];
      list.push(item);
      orderItemsMap.set(item.order_id, list);
    });

    const ordersWithItems = (ordersRes.data || []).map((order) => ({
      ...order,
      items: orderItemsMap.get(order.id) || []
    }));

    // Ensamblar ítems anidados en ventas
    const saleItemsMap = new Map<string, Record<string, unknown>[]>();
    (saleItemsRes.data || []).forEach((item) => {
      const list = saleItemsMap.get(item.sale_id) || [];
      list.push(item);
      saleItemsMap.set(item.sale_id, list);
    });

    const salesWithItems = (salesRes.data || []).map((sale) => ({
      ...sale,
      items: saleItemsMap.get(sale.id) || []
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        employees: employeesRes.data?.length || 0,
        brickTypes: brickTypesRes.data?.length || 0,
        customers: customersRes.data?.length || 0,
        productionBatches: batchesRes.data?.length || 0,
        inventoryStock: stockRes.data?.length || 0,
        inventoryMovements: movementsRes.data?.length || 0,
        orders: ordersWithItems.length,
        sales: salesWithItems.length,
        payrollPeriods: periodsRes.data?.length || 0,
        payrollDetails: payrollDetailsRes.data?.length || 0,
        employeeAdvances: advancesRes.data?.length || 0,
        cashLedger: cashRes.data?.length || 0,
        employeeAttendance: attendanceRes.data?.length || 0,
        employeeSettlements: settlementsRes.data?.length || 0
      },
      data: {
        employees: sanitizedEmployees,
        brickTypes: brickTypesRes.data || [],
        customers: customersRes.data || [],
        productionBatches: batchesRes.data || [],
        inventoryStock: stockRes.data || [],
        inventoryMovements: movementsRes.data || [],
        orders: ordersWithItems,
        sales: salesWithItems,
        payrollPeriods: periodsRes.data || [],
        payrollDetails: payrollDetailsRes.data || [],
        employeeAdvances: advancesRes.data || [],
        cashLedger: cashRes.data || [],
        employeeAttendance: attendanceRes.data || [],
        employeeSettlements: settlementsRes.data || []
      }
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/sync:", error);
    const message = error instanceof Error ? error.message : "Error al sincronizar datos desde Supabase";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedSession();
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const userRole = auth.session.role;
    const admin = getAdminClient();
    const body = await request.json();

    // Soporte para operaciones individuales o por lotes
    const operations: Array<{
      table: string;
      action: "insert" | "update" | "delete" | "upsert";
      data?: Record<string, unknown>;
      id?: string;
      match?: Record<string, unknown>;
    }> = Array.isArray(body.operations) ? body.operations : [body];

    const results = [];

    for (const op of operations) {
      const { table, action, data, id, match } = op;
      if (!table || !action) continue;

      if (!canMutateTable(userRole, table, action)) {
        results.push({
          table,
          action,
          success: false,
          error: `Acceso denegado: el rol '${userRole}' no tiene permisos para ejecutar '${action}' en '${table}'.`
        });
        continue;
      }

      if (action === "delete") {
        let query = admin.from(table).delete();
        if (id) {
          query = query.eq("id", id);
        } else if (match) {
          query = query.match(match);
        }
        const { error } = await query;
        if (error) {
          console.error(`Error deleting from ${table}:`, error);
          results.push({ table, action, success: false, error: error.message });
        } else {
          results.push({ table, action, success: true, id });
        }
      } else if (action === "insert" && data) {
        const clean = sanitizePayload(table, data);
        const { data: inserted, error } = await admin.from(table).insert(clean).select().single();
        if (error) {
          console.error(`Error inserting into ${table}:`, error);
          results.push({ table, action, success: false, error: error.message });
        } else {
          // Si es pedido o venta, insertar ítems si vienen provistos
          if (table === "orders" && Array.isArray(data.items) && inserted?.id) {
            const items = (data.items as Array<Record<string, unknown>>).map((it) => ({
              order_id: inserted.id,
              brick_type_id: it.brick_type_id,
              quantity: it.quantity,
              unit_price: it.unit_price
            }));
            await admin.from("order_items").insert(items);
          } else if (table === "sales" && Array.isArray(data.items) && inserted?.id) {
            const items = (data.items as Array<Record<string, unknown>>).map((it) => ({
              sale_id: inserted.id,
              brick_type_id: it.brick_type_id,
              quantity: it.quantity,
              unit_price: it.unit_price
            }));
            await admin.from("sale_items").insert(items);
          }
          results.push({ table, action, success: true, record: inserted });
        }
      } else if (action === "update" && data) {
        const clean = sanitizePayload(table, data);
        let query = admin.from(table).update(clean);
        if (id) {
          query = query.eq("id", id);
        } else if (match) {
          query = query.match(match);
        }
        const { data: updated, error } = await query.select().single();
        if (error) {
          console.error(`Error updating ${table}:`, error);
          results.push({ table, action, success: false, error: error.message });
        } else {
          results.push({ table, action, success: true, record: updated });
        }
      } else if (action === "upsert" && data) {
        const clean = sanitizePayload(table, data);
        const { data: upserted, error } = await admin.from(table).upsert(clean).select().single();
        if (error) {
          console.error(`Error upserting ${table}:`, error);
          results.push({ table, action, success: false, error: error.message });
        } else {
          results.push({ table, action, success: true, record: upserted });
        }
      }
    }

    return NextResponse.json({
      success: results.every((r) => r.success),
      results
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/sync:", error);
    const message = error instanceof Error ? error.message : "Error al procesar sincronización en Supabase";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
