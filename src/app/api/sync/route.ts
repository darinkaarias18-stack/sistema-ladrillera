import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// Limpia campos que solo existen en el frontend o que son relaciones unidas (joins)
function sanitizePayload(table: string, data: Record<string, any>): Record<string, any> {
  const clean = { ...data };

  // Eliminar referencias a objetos anidados / joins
  delete clean.brick_type;
  delete clean.operator;
  delete clean.customer;
  delete clean.driver;
  delete clean.employee;
  delete clean.period;
  delete clean.items;
  delete clean.crew_ids;

  // Normalizaciones específicas por tabla
  if (table === "customers") {
    // customers en Supabase tiene: id, name, phone, address, created_at
    delete clean.city;
    delete clean.department;
    delete clean.tax_id;
  }

  if (table === "production_batches") {
    // production_batches tiene: id, production_date, brick_type_id, operator_id, shift, quantity_produced, status, supervisor_id, notes, created_at
    delete clean.folio_number;
    delete clean.horno;
    delete clean.hora_vaciado;
    delete clean.sector_asignado;
  }

  if (table === "orders") {
    // orders tiene: id, customer_id, status, delivery_date, notes, created_at
    delete clean.delivery_type;
    delete clean.delivery_status;
    delete clean.delivery_address;
    delete clean.contact_phone;
    delete clean.driver_id;
    delete clean.city;
    delete clean.city_discount_pct;
    delete clean.city_discount_amount;
    delete clean.subtotal;
    delete clean.total_amount;
  }

  if (table === "payroll_details") {
    delete clean.quincena_amount;
    delete clean.total_earned;
    delete clean.net_pay;
  }

  if (table === "employee_settlements") {
    // total_amount es una columna calculada/generada en PostgreSQL (GENERATED ALWAYS AS)
    delete clean.total_amount;
  }

  if (table === "brick_types") {
    delete clean.image_url;
  }

  return clean;
}

export async function GET() {
  try {
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
      admin.from("customers").select("*").order("name"),
      admin.from("production_batches").select("*").order("production_date", { ascending: false }),
      admin.from("inventory_stock").select("*"),
      admin.from("inventory_movements").select("*").order("created_at", { ascending: false }),
      admin.from("orders").select("*").order("created_at", { ascending: false }),
      admin.from("order_items").select("*"),
      admin.from("sales").select("*").order("created_at", { ascending: false }),
      admin.from("sale_items").select("*"),
      admin.from("payroll_periods").select("*").order("start_date", { ascending: false }),
      admin.from("payroll_details").select("*"),
      admin.from("employee_advances").select("*").order("advance_date", { ascending: false }),
      admin.from("cash_ledger").select("*").order("movement_date", { ascending: false }),
      admin.from("employee_attendance").select("*").order("date", { ascending: false }),
      admin.from("employee_settlements").select("*").order("settlement_date", { ascending: false })
    ]);

    // Ensamblar ítems anidados en pedidos
    const orderItemsMap = new Map<string, any[]>();
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
    const saleItemsMap = new Map<string, any[]>();
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
        employees: employeesRes.data || [],
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
  } catch (error: any) {
    console.error("Error in GET /api/sync:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al sincronizar datos desde Supabase" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = getAdminClient();
    const body = await request.json();

    // Soporte para operaciones individuales o por lotes
    const operations: Array<{
      table: string;
      action: "insert" | "update" | "delete" | "upsert";
      data?: any;
      id?: string;
      match?: Record<string, any>;
    }> = Array.isArray(body.operations) ? body.operations : [body];

    const results = [];

    for (const op of operations) {
      const { table, action, data, id, match } = op;
      if (!table || !action) continue;

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
      } else if (action === "insert") {
        const clean = sanitizePayload(table, data);
        const { data: inserted, error } = await admin.from(table).insert(clean).select().single();
        if (error) {
          console.error(`Error inserting into ${table}:`, error);
          results.push({ table, action, success: false, error: error.message });
        } else {
          // Si es pedido o venta, insertar ítems si vienen provistos
          if (table === "orders" && Array.isArray(data.items) && inserted?.id) {
            const items = data.items.map((it: any) => ({
              order_id: inserted.id,
              brick_type_id: it.brick_type_id,
              quantity: it.quantity,
              unit_price: it.unit_price
            }));
            await admin.from("order_items").insert(items);
          } else if (table === "sales" && Array.isArray(data.items) && inserted?.id) {
            const items = data.items.map((it: any) => ({
              sale_id: inserted.id,
              brick_type_id: it.brick_type_id,
              quantity: it.quantity,
              unit_price: it.unit_price
            }));
            await admin.from("sale_items").insert(items);
          }
          results.push({ table, action, success: true, record: inserted });
        }
      } else if (action === "update") {
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
      } else if (action === "upsert") {
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
  } catch (error: any) {
    console.error("Error in POST /api/sync:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar sincronización en Supabase" },
      { status: 500 }
    );
  }
}
