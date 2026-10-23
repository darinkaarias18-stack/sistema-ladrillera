import {
  Employee,
  BrickType,
  ProductionBatch,
  InventoryStock,
  InventoryMovement,
  Customer,
  Order,
  Sale,
  PayrollPeriod,
  PayrollDetail,
  EmployeeAdvance,
  CashLedgerEntry,
  UserRole,
  InventoryLocation,
  MovementType,
  EmployeeAttendance,
  EmployeeSettlement,
  DeliveryStatus,
  HornoCycle,
  HornoStatus,
  PatioDespacho,
  PatioDespachoEstado,
  CityDiscount
} from "@/types/database.types";
import {
  INITIAL_EMPLOYEES,
  INITIAL_BRICK_TYPES,
  INITIAL_INVENTORY_STOCK,
  INITIAL_PRODUCTION_BATCHES,
  INITIAL_CUSTOMERS,
  INITIAL_SALES,
  INITIAL_PAYROLL_PERIODS,
  INITIAL_PAYROLL_DETAILS,
  INITIAL_CASH_LEDGER,
  INITIAL_ORDERS,
  INITIAL_HORNO_CYCLES,
  INITIAL_PATIO_DESPACHOS,
  INITIAL_CITY_DISCOUNTS
} from "./mock-data";
import { getTodayDateString } from "./dates";
import { AuditLogger } from "./audit-logger";
import { supabaseSync } from "./supabase-sync";
import { getBrickImageUrl } from "./brick-images";

function genUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class MemoryStore {
  private employees: Employee[] = [...INITIAL_EMPLOYEES];
  private brickTypes: BrickType[] = [...INITIAL_BRICK_TYPES];
  private stock: InventoryStock[] = [...INITIAL_INVENTORY_STOCK];
  private movements: InventoryMovement[] = [];
  private batches: ProductionBatch[] = [...INITIAL_PRODUCTION_BATCHES];
  private customers: Customer[] = [...INITIAL_CUSTOMERS];
  private orders: Order[] = [...INITIAL_ORDERS];
  private sales: Sale[] = [...INITIAL_SALES];
  private payrollPeriods: PayrollPeriod[] = [...INITIAL_PAYROLL_PERIODS];
  private payrollDetails: PayrollDetail[] = [...INITIAL_PAYROLL_DETAILS];
  private advances: EmployeeAdvance[] = [];
  private cashLedger: CashLedgerEntry[] = [...INITIAL_CASH_LEDGER];
  private attendances: EmployeeAttendance[] = [];
  private settlements: EmployeeSettlement[] = [];
  private hornoCycles: HornoCycle[] = [...INITIAL_HORNO_CYCLES];
  private patioDespachos: PatioDespacho[] = [...INITIAL_PATIO_DESPACHOS];
  private cityDiscounts: CityDiscount[] = [...INITIAL_CITY_DISCOUNTS];
  private currentUserRole: UserRole = "superadmin";

  constructor() {
    this.initEmployees();
    this.initPayrollDetails();
    this.initCustomers();
    this.initBatches();
    this.initBrickTypes();

    // Sincronizar automáticamente con Supabase en el navegador
    if (typeof window !== "undefined") {
      setTimeout(() => {
        supabaseSync.pullFromSupabase();
      }, 50);
    }
  }

  loadFromSupabaseData(data: {
    employees?: Employee[];
    brickTypes?: BrickType[];
    customers?: Customer[];
    productionBatches?: ProductionBatch[];
    inventoryStock?: InventoryStock[];
    inventoryMovements?: InventoryMovement[];
    orders?: Order[];
    sales?: Sale[];
    payrollPeriods?: PayrollPeriod[];
    payrollDetails?: PayrollDetail[];
    employeeAdvances?: EmployeeAdvance[];
    cashLedger?: CashLedgerEntry[];
    employeeAttendance?: EmployeeAttendance[];
    employeeSettlements?: EmployeeSettlement[];
  }) {
    if (data.employees && data.employees.length > 0) {
      this.employees = data.employees;
      if (typeof window !== "undefined") {
        localStorage.setItem("erp_employees", JSON.stringify(this.employees));
      }
    }
    if (data.brickTypes && data.brickTypes.length > 0) {
      this.brickTypes = data.brickTypes.map((item) => ({
        ...item,
        image_url: item.image_url || getBrickImageUrl(item),
      }));
      if (typeof window !== "undefined") {
        localStorage.setItem("erp_brick_types", JSON.stringify(this.brickTypes));
      }
    }
    if (data.customers && data.customers.length > 0) {
      this.customers = data.customers;
      if (typeof window !== "undefined") {
        localStorage.setItem("erp_customers", JSON.stringify(this.customers));
      }
    }
    if (data.productionBatches && data.productionBatches.length > 0) {
      this.batches = data.productionBatches;
      if (typeof window !== "undefined") {
        localStorage.setItem("erp_production_batches", JSON.stringify(this.batches));
      }
    }
    if (data.inventoryStock && data.inventoryStock.length > 0) {
      this.stock = data.inventoryStock;
      if (typeof window !== "undefined") {
        localStorage.setItem("erp_inventory_stock", JSON.stringify(this.stock));
      }
    }
    if (data.inventoryMovements && data.inventoryMovements.length > 0) {
      this.movements = data.inventoryMovements;
    }
    if (data.orders && data.orders.length > 0) {
      this.orders = data.orders;
    }
    if (data.sales && data.sales.length > 0) {
      this.sales = data.sales;
    }
    if (data.payrollPeriods && data.payrollPeriods.length > 0) {
      this.payrollPeriods = data.payrollPeriods;
    }
    if (data.payrollDetails && data.payrollDetails.length > 0) {
      this.payrollDetails = data.payrollDetails;
      if (typeof window !== "undefined") {
        localStorage.setItem("erp_payroll_details", JSON.stringify(this.payrollDetails));
      }
    }
    if (data.employeeAdvances && data.employeeAdvances.length > 0) {
      this.advances = data.employeeAdvances;
    }
    if (data.cashLedger && data.cashLedger.length > 0) {
      this.cashLedger = data.cashLedger;
    }
    if (data.employeeAttendance && data.employeeAttendance.length > 0) {
      this.attendances = data.employeeAttendance;
    }
    if (data.employeeSettlements && data.employeeSettlements.length > 0) {
      this.settlements = data.employeeSettlements;
    }
  }

  private initEmployees() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("erp_employees");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const legacyIds = new Set(["emp-1", "emp-2", "emp-3", "emp-4", "emp-5"]);
            const cleaned = parsed.filter((e: Employee) => !legacyIds.has(e.id));
            const existingIds = new Set(cleaned.map((e: Employee) => e.id));
            const merged = [...cleaned];
            for (const emp of INITIAL_EMPLOYEES) {
              if (!legacyIds.has(emp.id) && !existingIds.has(emp.id)) {
                merged.push(emp);
              }
            }
            this.employees = merged;
            localStorage.setItem("erp_employees", JSON.stringify(merged));
            return;
          }
        }
        this.employees = INITIAL_EMPLOYEES.filter(e => !["emp-1", "emp-2", "emp-3", "emp-4", "emp-5"].includes(e.id));
        localStorage.setItem("erp_employees", JSON.stringify(this.employees));
      } catch (e) {
        console.error("Error reading erp_employees from localStorage", e);
      }
    }
  }

  private saveEmployeesToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("erp_employees", JSON.stringify(this.employees));
        window.dispatchEvent(new CustomEvent("erp_employees_updated"));
      } catch (e) {
        console.error("Error writing erp_employees to localStorage", e);
      }
    }
  }

  private initPayrollDetails() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("erp_payroll_details");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const legacyIds = new Set(["emp-1", "emp-2", "emp-3", "emp-4", "emp-5"]);
            const cleaned = parsed.filter((pd: PayrollDetail) => !(pd.period_id === "period-oficial" && legacyIds.has(pd.employee_id)));
            const existingIds = new Set(cleaned.map((pd: PayrollDetail) => pd.id));
            const merged = [...cleaned];
            for (const pd of INITIAL_PAYROLL_DETAILS) {
              if (!existingIds.has(pd.id)) {
                merged.push(pd);
              }
            }
            this.payrollDetails = merged;
            localStorage.setItem("erp_payroll_details", JSON.stringify(merged));
            return;
          }
        }
        this.payrollDetails = [...INITIAL_PAYROLL_DETAILS];
        localStorage.setItem("erp_payroll_details", JSON.stringify(this.payrollDetails));
      } catch (e) {
        console.error("Error reading erp_payroll_details from localStorage", e);
      }
    }
  }

  savePayrollDetailsToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("erp_payroll_details", JSON.stringify(this.payrollDetails));
        window.dispatchEvent(new CustomEvent("erp_payroll_updated"));
      } catch (e) {
        console.error("Error writing erp_payroll_details to localStorage", e);
      }
    }
  }

  private initCustomers() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("erp_customers");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.customers = parsed;
            return;
          }
        }
        this.customers = [...INITIAL_CUSTOMERS];
        localStorage.setItem("erp_customers", JSON.stringify(this.customers));
      } catch (e) {
        console.error("Error reading erp_customers from localStorage", e);
      }
    }
  }

  private saveCustomersToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("erp_customers", JSON.stringify(this.customers));
        window.dispatchEvent(new CustomEvent("erp_customers_updated"));
      } catch (e) {
        console.error("Error writing erp_customers to localStorage", e);
      }
    }
  }

  private initBatches() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("erp_production_batches");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.batches = parsed;
            return;
          }
        }
        this.batches = [...INITIAL_PRODUCTION_BATCHES];
        localStorage.setItem("erp_production_batches", JSON.stringify(this.batches));
      } catch (e) {
        console.error("Error reading erp_production_batches from localStorage", e);
      }
    }
  }

  private saveBatchesToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("erp_production_batches", JSON.stringify(this.batches));
        window.dispatchEvent(new CustomEvent("erp_batches_updated"));
      } catch (e) {
        console.error("Error writing erp_production_batches to localStorage", e);
      }
    }
  }

  private initBrickTypes() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("erp_brick_types");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.brickTypes = parsed.map((item: BrickType) => {
              const init = INITIAL_BRICK_TYPES.find(
                (ib) => ib.id === item.id || ib.name.toLowerCase().trim() === item.name?.toLowerCase().trim()
              );
              return {
                ...init,
                ...item,
                image_url: item.image_url || getBrickImageUrl(item) || init?.image_url,
              };
            });
            localStorage.setItem("erp_brick_types", JSON.stringify(this.brickTypes));
            return;
          }
        }
        this.brickTypes = INITIAL_BRICK_TYPES.map((item) => ({
          ...item,
          image_url: item.image_url || getBrickImageUrl(item),
        }));
        localStorage.setItem("erp_brick_types", JSON.stringify(this.brickTypes));
      } catch (e) {
        console.error("Error reading erp_brick_types from localStorage", e);
      }
    }
  }

  private saveBrickTypesToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("erp_brick_types", JSON.stringify(this.brickTypes));
        window.dispatchEvent(new CustomEvent("erp_brick_types_updated"));
      } catch (e) {
        console.error("Error writing erp_brick_types to localStorage", e);
      }
    }
  }

  // Role Management
  getCurrentRole(): UserRole {
    return this.currentUserRole;
  }

  setCurrentRole(role: UserRole) {
    this.currentUserRole = role;
  }

  // EMPLOYEES
  getEmployees(search?: string) {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("erp_employees");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.employees = parsed;
          }
        }
      } catch (e) {}
    }
    let list = [...this.employees];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.document_id.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q)
      );
    }
    return list;
  }

  addEmployee(employee: Omit<Employee, "id" | "created_at">): Employee {
    const newEmp: Employee = {
      ...employee,
      id: genUUID(),
      created_at: new Date().toISOString(),
    };
    this.employees.unshift(newEmp);
    this.saveEmployeesToStorage();

    // Sincronización automática inmediata a Supabase
    supabaseSync.pushChange("employees", "insert", newEmp, newEmp.id);

    // Auto-generar detalle de planilla en todos los periodos existentes para que aparezca automáticamente
    const base = newEmp.base_salary || 2750;
    const ant = Number(((base * (newEmp.antiquity_bonus_pct || 0)) / 100).toFixed(2));
    const front = newEmp.frontier_bonus ?? Number((base * 0.20).toFixed(2));
    const prod = 0;
    const totalEarned = Number((base + ant + front + prod).toFixed(2));
    const quincena = Number((totalEarned * 0.50).toFixed(2));
    const netPay = quincena;

    this.payrollPeriods.forEach((period) => {
      const exists = this.payrollDetails.some(
        (pd) => pd.period_id === period.id && pd.employee_id === newEmp.id
      );
      if (!exists) {
        const pdRecord: PayrollDetail = {
          id: genUUID(),
          period_id: period.id,
          employee_id: newEmp.id,
          base_amount: base,
          antiquity_bonus: ant,
          frontier_bonus: front,
          production_bonus: prod,
          total_earned: totalEarned,
          deductions: 0,
          quincena_amount: quincena,
          mid_period_advance: 0,
          personal_advances: 0,
          net_pay: netPay,
          paid: false,
          signed: false,
        };
        this.payrollDetails.push(pdRecord);
        supabaseSync.pushChange("payroll_details", "insert", pdRecord, pdRecord.id);
      }
    });
    this.savePayrollDetailsToStorage();

    AuditLogger.log({
      action: "CREATE",
      severity: "medium",
      module: "empleados",
      entity_id: newEmp.id,
      description: `Alta de nuevo empleado: ${newEmp.full_name} (${newEmp.position}) - Salario base: Bs ${newEmp.base_salary}`,
      details: { position: newEmp.position, base_salary: newEmp.base_salary, contract_type: newEmp.contract_type },
    });

    return newEmp;
  }

  updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
    const idx = this.employees.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.employees[idx] = { ...this.employees[idx], ...updates };
    this.saveEmployeesToStorage();

    // Sincronización automática inmediata a Supabase
    supabaseSync.pushChange("employees", "update", updates, id);

    if (updates.base_salary !== undefined) {
      this.payrollDetails.forEach((pd) => {
        if (pd.employee_id === id) {
          pd.base_amount = updates.base_salary!;
          pd.total_earned = Number(
            (
              pd.base_amount +
              (pd.antiquity_bonus || 0) +
              (pd.frontier_bonus || 0) +
              (pd.production_bonus || 0) -
              (pd.deductions || 0)
            ).toFixed(2)
          );
          pd.quincena_amount = Number((pd.total_earned * 0.50).toFixed(2));
          pd.net_pay = Math.max(0, Number((pd.quincena_amount - (pd.personal_advances || 0)).toFixed(2)));
          supabaseSync.pushChange("payroll_details", "update", {
            base_amount: pd.base_amount,
            total_earned: pd.total_earned,
            net_pay: pd.net_pay
          }, pd.id);
        }
      });
      this.savePayrollDetailsToStorage();
    }

    AuditLogger.log({
      action: "UPDATE",
      severity: "medium",
      module: "empleados",
      entity_id: id,
      description: `Actualización de empleado: ${this.employees[idx].full_name} (${this.employees[idx].position})`,
      details: updates,
    });

    return this.employees[idx];
  }

  deleteEmployee(id: string): boolean {
    const idx = this.employees.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    const deletedName = this.employees[idx].full_name;
    this.employees.splice(idx, 1);
    this.saveEmployeesToStorage();
    this.payrollDetails = this.payrollDetails.filter((pd) => pd.employee_id !== id);
    this.savePayrollDetailsToStorage();

    // Sincronización automática inmediata a Supabase
    supabaseSync.pushChange("employees", "delete", undefined, id);

    AuditLogger.log({
      action: "DELETE",
      severity: "high",
      module: "empleados",
      entity_id: id,
      description: `Baja/Eliminación definitiva de empleado: ${deletedName} (ID: ${id})`,
    });

    return true;
  }

  // ATTENDANCE
  getAttendances(date?: string) {
    if (date) {
      return this.attendances.filter(a => a.date === date);
    }
    return [...this.attendances];
  }

  saveAttendance(attendance: Omit<EmployeeAttendance, "id" | "created_at"> & { id?: string }) {
    const existingIndex = this.attendances.findIndex(
      (a) => a.employee_id === attendance.employee_id && a.date === attendance.date
    );
    
    let record: EmployeeAttendance;
    if (existingIndex >= 0) {
      record = {
        ...this.attendances[existingIndex],
        ...attendance,
      };
      this.attendances[existingIndex] = record;
    } else {
      record = {
        ...attendance,
        id: attendance.id || genUUID(),
        created_at: new Date().toISOString()
      };
      this.attendances.push(record);
    }

    // Sincronización automática a Supabase
    supabaseSync.pushChange("employee_attendance", "upsert", record, record.id);

    AuditLogger.log({
      action: existingIndex >= 0 ? "UPDATE" : "CREATE",
      severity: "low",
      module: "empleados",
      description: `Registro de asistencia: Empleado ID ${attendance.employee_id} marcado como "${attendance.status.toUpperCase()}" en fecha ${attendance.date}`,
      details: attendance,
    });
  }

  // SETTLEMENTS
  getSettlements() {
    return [...this.settlements];
  }

  addSettlement(settlement: Omit<EmployeeSettlement, "id" | "created_at">) {
    const newSettlement: EmployeeSettlement = {
      ...settlement,
      id: genUUID(),
      created_at: new Date().toISOString()
    };
    this.settlements.push(newSettlement);
    
    // Deactivate employee
    const empIndex = this.employees.findIndex(e => e.id === settlement.employee_id);
    if (empIndex >= 0) {
      this.employees[empIndex].active = false;
      this.saveEmployeesToStorage();
      supabaseSync.pushChange("employees", "update", { active: false }, settlement.employee_id);
    }

    // Sincronización automática a Supabase
    supabaseSync.pushChange("employee_settlements", "insert", newSettlement, newSettlement.id);
    
    const emp = this.employees.find(e => e.id === settlement.employee_id);
    AuditLogger.log({
      action: "UPDATE",
      severity: "high",
      module: "nomina",
      entity_id: newSettlement.id,
      description: `Liquidación / Finiquito emitido para: ${emp?.full_name || "Empleado"} - Monto: Bs ${newSettlement.total_amount.toLocaleString()}`,
      details: settlement,
    });

    return newSettlement;
  }

  // BRICK TYPES
  getBrickTypes() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("erp_brick_types");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.brickTypes = parsed.map((item: BrickType) => {
              const init = INITIAL_BRICK_TYPES.find(
                (ib) => ib.id === item.id || ib.name.toLowerCase().trim() === item.name?.toLowerCase().trim()
              );
              return {
                ...init,
                ...item,
                image_url: item.image_url || getBrickImageUrl(item) || init?.image_url,
              };
            });
          }
        }
      } catch (e) {}
    }
    return this.brickTypes.map((item) => ({
      ...item,
      image_url: item.image_url || getBrickImageUrl(item),
    }));
  }

  addBrickType(bt: Omit<BrickType, "id">): BrickType {
    const newBt: BrickType = {
      ...bt,
      id: `brick-${Date.now()}`,
    };
    this.brickTypes.push(newBt);
    this.saveBrickTypesToStorage();

    // Inicializar stock en 0 para las 3 ubicaciones
    const locations: InventoryLocation[] = ["patio_secado", "horno", "bodega_terminado"];
    locations.forEach((loc) => {
      this.stock.push({
        id: `stock-${Date.now()}-${loc}`,
        brick_type_id: newBt.id,
        location: loc,
        quantity: 0,
      });
    });

    AuditLogger.log({
      action: "CREATE",
      severity: "medium",
      module: "inventario",
      entity_id: newBt.id,
      description: `Nuevo tipo de producto registrado: ${newBt.name} (Precio base: Bs ${newBt.sale_price})`,
      details: newBt,
    });

    return newBt;
  }

  updateBrickType(id: string, updates: Partial<Omit<BrickType, "id">>): BrickType | null {
    const idx = this.brickTypes.findIndex(bt => bt.id === id);
    if (idx === -1) return null;
    this.brickTypes[idx] = {
      ...this.brickTypes[idx],
      ...updates
    };
    this.saveBrickTypesToStorage();

    // Sincronización automática a Supabase
    supabaseSync.pushChange("brick_types", "update", updates, id);

    AuditLogger.log({
      action: "UPDATE",
      severity: "medium",
      module: "inventario",
      entity_id: id,
      description: `Actualización de producto: ${this.brickTypes[idx].name}`,
      details: updates,
    });

    return this.brickTypes[idx];
  }

  getNextFolioNumber(): string {
    const numbers = this.batches
      .map((b) => b.folio_number)
      .filter((f): f is string => Boolean(f))
      .map((f) => {
        const m = f.match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      });

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 100;
    const next = maxNum + 1;
    return `FOL-${String(next).padStart(5, "0")}`;
  }

  // PRODUCTION BATCHES (VACIADOS)
  getProductionBatches(filter?: { date?: string; operatorId?: string; brickTypeId?: string }) {
    let list = this.batches.map((b, idx) => ({
      ...b,
      folio_number: b.folio_number || `FOL-${String(101 + idx).padStart(5, "0")}`,
      brick_type: this.brickTypes.find((bt) => bt.id === b.brick_type_id),
      operator: this.employees.find((e) => e.id === b.operator_id),
    }));

    if (filter?.date) {
      list = list.filter((b) => b.production_date === filter.date);
    }
    if (filter?.operatorId) {
      list = list.filter((b) => b.operator_id === filter.operatorId);
    }
    if (filter?.brickTypeId) {
      list = list.filter((b) => b.brick_type_id === filter.brickTypeId);
    }

    return list.sort((a, b) => b.production_date.localeCompare(a.production_date));
  }

  upsertProductionBatch(
    batchData: Omit<ProductionBatch, "id" | "created_at"> & { id?: string }
  ): ProductionBatch {
    const finalFolio =
      batchData.folio_number && batchData.folio_number.trim() !== ""
        ? batchData.folio_number
        : this.getNextFolioNumber();

    // Si ya existe batch por (production_date, brick_type_id, operator_id, shift)
    const existingIdx = this.batches.findIndex(
      (b) =>
        b.production_date === batchData.production_date &&
        b.brick_type_id === batchData.brick_type_id &&
        b.operator_id === batchData.operator_id &&
        b.shift === batchData.shift
    );

    let batch: ProductionBatch;

    if (existingIdx >= 0) {
      batch = { ...this.batches[existingIdx], ...batchData, folio_number: finalFolio };
      this.batches[existingIdx] = batch;
    } else {
      batch = {
        ...batchData,
        folio_number: finalFolio,
        id: batchData.id || genUUID(),
        created_at: new Date().toISOString(),
      };
      this.batches.unshift(batch);
    }

    // Auto actualización de stock si pasa a 'terminado' o 'secando'
    if (batch.status === "secando" || batch.status === "verde") {
      this.adjustStock(batch.brick_type_id, "patio_secado", batch.quantity_produced);
    } else if (batch.status === "terminado") {
      this.adjustStock(batch.brick_type_id, "bodega_terminado", batch.quantity_produced);
    }

    this.saveBatchesToStorage();

    // Sincronización automática a Supabase
    supabaseSync.pushChange("production_batches", "upsert", {
      id: batch.id,
      production_date: batch.production_date,
      brick_type_id: batch.brick_type_id,
      operator_id: batch.operator_id,
      shift: batch.shift,
      quantity_produced: batch.quantity_produced,
      status: batch.status,
      supervisor_id: batch.supervisor_id,
      notes: batch.notes || `Folio: ${batch.folio_number} | Horno: ${batch.horno || "Horno 1"}`
    }, batch.id);

    const btName = this.brickTypes.find((bt) => bt.id === batch.brick_type_id)?.name || "Ladrillo";
    AuditLogger.log({
      action: existingIdx >= 0 ? "UPDATE" : "CREATE",
      severity: "medium",
      module: "produccion",
      entity_id: batch.id,
      description: `Vaciado de producción ${existingIdx >= 0 ? "actualizado" : "registrado"}: ${batch.quantity_produced.toLocaleString()} unid. de ${btName} en ${batch.horno || "Horno 1"} (${batch.shift})`,
      details: { folio: batch.folio_number, horno: batch.horno, quantity: batch.quantity_produced, shift: batch.shift },
    });

    return batch;
  }

  deleteProductionBatch(id: string): boolean {
    const idx = this.batches.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    const b = this.batches[idx];
    const btName = this.brickTypes.find((bt) => bt.id === b.brick_type_id)?.name || "Ladrillo";
    this.batches.splice(idx, 1);
    this.saveBatchesToStorage();

    // Sincronización automática a Supabase
    supabaseSync.pushChange("production_batches", "delete", undefined, id);

    AuditLogger.log({
      action: "DELETE",
      severity: "high",
      module: "produccion",
      entity_id: id,
      description: `Eliminación de vaciado de producción: ${b.quantity_produced?.toLocaleString()} unid. de ${btName} en ${b.horno || "Horno 1"} (${b.production_date})`,
      details: { folio: b.folio_number, quantity: b.quantity_produced, date: b.production_date },
    });

    return true;
  }

  // INVENTORY
  getInventoryStock() {
    return this.stock.map((s) => ({
      ...s,
      brick_type: this.brickTypes.find((bt) => bt.id === s.brick_type_id),
    }));
  }

  private adjustStock(brickTypeId: string, location: InventoryLocation, delta: number) {
    const item = this.stock.find(
      (s) => s.brick_type_id === brickTypeId && s.location === location
    );
    if (item) {
      item.quantity = Math.max(0, item.quantity + delta);
    } else {
      this.stock.push({
        id: genUUID(),
        brick_type_id: brickTypeId,
        location,
        quantity: Math.max(0, delta),
      });
    }
  }

  addInventoryMovement(m: Omit<InventoryMovement, "id" | "created_at">): InventoryMovement {
    const movement: InventoryMovement = {
      ...m,
      id: genUUID(),
      created_at: new Date().toISOString(),
    };
    this.movements.unshift(movement);

    if (m.movement_type === "entrada" && m.to_location) {
      this.adjustStock(m.brick_type_id, m.to_location, m.quantity);
    } else if (m.movement_type === "salida" && m.from_location) {
      this.adjustStock(m.brick_type_id, m.from_location, -m.quantity);
    } else if (m.movement_type === "traslado" && m.from_location && m.to_location) {
      this.adjustStock(m.brick_type_id, m.from_location, -m.quantity);
      this.adjustStock(m.brick_type_id, m.to_location, m.quantity);
    }

    // Sincronización automática a Supabase
    supabaseSync.pushChange("inventory_movements", "insert", movement, movement.id);

    const btName = this.brickTypes.find((bt) => bt.id === m.brick_type_id)?.name || "Ladrillo";
    AuditLogger.log({
      action: "STOCK_ADJUSTMENT",
      severity: "medium",
      module: "inventario",
      entity_id: movement.id,
      description: `Movimiento de inventario [${m.movement_type.toUpperCase()}]: ${m.quantity.toLocaleString()} unid. de ${btName} (${m.from_location || "Origen"} -> ${m.to_location || "Destino"})`,
      details: m,
    });

    return movement;
  }

  getInventoryMovements() {
    return this.movements.map((m) => ({
      ...m,
      brick_type: this.brickTypes.find((bt) => bt.id === m.brick_type_id),
    }));
  }

  // SALES & ORDERS
  getCustomers() {
    return [...this.customers];
  }

  addCustomer(c: Omit<Customer, "id" | "created_at">): Customer {
    const newCust: Customer = {
      ...c,
      id: genUUID(),
      created_at: new Date().toISOString(),
    };
    this.customers.push(newCust);
    this.saveCustomersToStorage();

    // Sincronización automática a Supabase
    supabaseSync.pushChange("customers", "insert", newCust, newCust.id);

    AuditLogger.log({
      action: "CREATE",
      severity: "low",
      module: "ventas",
      entity_id: newCust.id,
      description: `Registro de nuevo cliente: ${newCust.name} (NIT/CI: ${(newCust as any).tax_id || "S/N"}) - Tel: ${newCust.phone || "S/N"}`,
      details: newCust,
    });

    return newCust;
  }

  updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.customers[idx] = { ...this.customers[idx], ...updates };
    this.saveCustomersToStorage();

    // Sincronización automática a Supabase
    supabaseSync.pushChange("customers", "update", updates, id);

    AuditLogger.log({
      action: "UPDATE",
      severity: "low",
      module: "ventas",
      entity_id: id,
      description: `Actualización de datos del cliente: ${this.customers[idx].name}`,
      details: updates,
    });

    return this.customers[idx];
  }

  deleteCustomer(id: string): boolean {
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    const cName = this.customers[idx].name;
    this.customers.splice(idx, 1);
    this.saveCustomersToStorage();

    // Sincronización automática a Supabase
    supabaseSync.pushChange("customers", "delete", undefined, id);

    AuditLogger.log({
      action: "DELETE",
      severity: "high",
      module: "ventas",
      entity_id: id,
      description: `Eliminación de cliente: ${cName} (ID: ${id})`,
    });

    return true;
  }

  // CITY DISCOUNTS (DESCUENTOS POR CIUDAD)
  getCityDiscounts(): CityDiscount[] {
    return [...this.cityDiscounts];
  }

  getDiscountForCity(city?: string): number {
    if (!city) return 0;
    const clean = city.trim().toLowerCase();
    const found = this.cityDiscounts.find(
      (cd) => cd.city.toLowerCase() === clean && cd.active
    );
    return found ? found.discount_percentage : 0;
  }

  saveCityDiscount(city: string, discount_percentage: number, description?: string): CityDiscount {
    const cleanCity = city.trim();
    const existingIdx = this.cityDiscounts.findIndex(
      (cd) => cd.city.toLowerCase() === cleanCity.toLowerCase()
    );
    let result: CityDiscount;
    if (existingIdx >= 0) {
      this.cityDiscounts[existingIdx] = {
        ...this.cityDiscounts[existingIdx],
        discount_percentage,
        description: description ?? this.cityDiscounts[existingIdx].description,
        active: true,
      };
      result = this.cityDiscounts[existingIdx];
    } else {
      const newCd: CityDiscount = {
        id: `cd-${Date.now()}`,
        city: cleanCity,
        discount_percentage,
        description: description || `Descuento especial ${cleanCity}`,
        active: true,
      };
      this.cityDiscounts.push(newCd);
      result = newCd;
    }

    AuditLogger.log({
      action: "UPDATE",
      severity: "medium",
      module: "ventas",
      description: `Descuento regional configurado para ${cleanCity}: ${discount_percentage}%`,
      details: { city: cleanCity, discount_percentage, description },
    });

    return result;
  }

  deleteCityDiscount(id: string): void {
    this.cityDiscounts = this.cityDiscounts.filter((cd) => cd.id !== id);
    AuditLogger.log({
      action: "DELETE",
      severity: "medium",
      module: "ventas",
      entity_id: id,
      description: `Eliminación de regla de descuento regional (ID: ${id})`,
    });
  }

  getOrders() {
    return this.orders.map((o) => {
      const cust = this.customers.find((c) => c.id === o.customer_id);
      const city = o.city || cust?.city || "Santa Cruz";
      const cityDiscountPct = o.city_discount_pct !== undefined ? o.city_discount_pct : this.getDiscountForCity(city);
      const subtotal = o.subtotal !== undefined
        ? o.subtotal
        : (o.items || []).reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const cityDiscountAmount = o.city_discount_amount !== undefined
        ? o.city_discount_amount
        : Number(((subtotal * cityDiscountPct) / 100).toFixed(2));
      const totalAmount = o.total_amount !== undefined
        ? o.total_amount
        : Math.max(0, subtotal - cityDiscountAmount);

      return {
        ...o,
        city,
        city_discount_pct: cityDiscountPct,
        city_discount_amount: cityDiscountAmount,
        subtotal,
        total_amount: totalAmount,
        customer: cust,
        driver: this.employees.find((e) => e.id === o.driver_id),
        items: (o.items || []).map((item) => ({
          ...item,
          brick_type: this.brickTypes.find((bt) => bt.id === item.brick_type_id),
        })),
      };
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  createOrder(orderData: Omit<Order, "id" | "created_at">): Order {
    const cust = this.customers.find((c) => c.id === orderData.customer_id);
    const city = orderData.city || cust?.city || "Santa Cruz";
    const cityDiscountPct = orderData.city_discount_pct !== undefined ? orderData.city_discount_pct : this.getDiscountForCity(city);
    const subtotal = orderData.subtotal !== undefined
      ? orderData.subtotal
      : (orderData.items || []).reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const discountAmount = orderData.city_discount_amount !== undefined
      ? orderData.city_discount_amount
      : Number(((subtotal * cityDiscountPct) / 100).toFixed(2));
    const totalAmount = orderData.total_amount !== undefined
      ? orderData.total_amount
      : Math.max(0, subtotal - discountAmount);

    const newOrder: Order = {
      ...orderData,
      city,
      city_discount_pct: cityDiscountPct,
      city_discount_amount: discountAmount,
      subtotal,
      total_amount: totalAmount,
      delivery_status: orderData.delivery_status || "programado",
      id: genUUID(),
      created_at: new Date().toISOString(),
    };
    this.orders.unshift(newOrder);

    // Sincronización automática a Supabase
    supabaseSync.pushChange("orders", "insert", newOrder, newOrder.id);

    // Descontar inventario de bodega_terminado (Reserva física del pedido)
    (newOrder.items || []).forEach((item) => {
      this.addInventoryMovement({
        brick_type_id: item.brick_type_id,
        movement_type: "salida",
        quantity: item.quantity,
        from_location: "bodega_terminado",
        reference_id: newOrder.id,
        reference_type: "order",
      });
    });

    AuditLogger.log({
      action: "CREATE",
      severity: "medium",
      module: "ventas",
      entity_id: newOrder.id,
      description: `Nuevo pedido #${newOrder.id.slice(-6)} registrado para ${cust?.name || "Cliente"} - Total: Bs ${totalAmount.toLocaleString()} (${newOrder.city})`,
      details: { items_count: newOrder.items?.length, total_amount: totalAmount, city },
    });

    return newOrder;
  }

  updateOrderDeliveryStatus(orderId: string, deliveryStatus: DeliveryStatus): Order | null {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return null;
    const prevStatus = order.delivery_status;
    order.delivery_status = deliveryStatus;

    if (deliveryStatus === "entregado") {
      order.status = "vendido";
      this.convertOrderToSale(order.id, "efectivo");
    } else if (deliveryStatus === "cancelado") {
      order.status = "cancelado";
    } else {
      if (order.status === "vendido") {
        order.status = "pendiente";
      }
    }

    // Sincronización automática a Supabase
    supabaseSync.pushChange("orders", "update", { status: order.status }, orderId);

    AuditLogger.log({
      action: "UPDATE",
      severity: "medium",
      module: "ventas",
      entity_id: orderId,
      description: `Estado de entrega de pedido #${order.id.slice(-6)} actualizado a "${deliveryStatus.toUpperCase()}"`,
      details: { delivery_status: deliveryStatus, previous_status: prevStatus },
    });

    return order;
  }

  updateOrderDriver(orderId: string, driverId: string): Order | null {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return null;
    order.driver_id = driverId;
    const driver = this.employees.find((e) => e.id === driverId);

    AuditLogger.log({
      action: "UPDATE",
      severity: "low",
      module: "ventas",
      entity_id: orderId,
      description: `Chofer asignado al pedido #${order.id.slice(-6)}: ${driver?.full_name || driverId}`,
      details: { driver_id: driverId },
    });

    return order;
  }

  getSales() {
    return this.sales.map((s) => ({
      ...s,
      customer: this.customers.find((c) => c.id === s.customer_id),
      items: (s.items || []).map((item) => ({
        ...item,
        brick_type: this.brickTypes.find((bt) => bt.id === item.brick_type_id),
      })),
    }));
  }

  createSale(saleData: Omit<Sale, "id" | "created_at">): Sale {
    const newSale: Sale = {
      ...saleData,
      id: genUUID(),
      created_at: new Date().toISOString(),
    };
    this.sales.unshift(newSale);

    // Sincronización automática a Supabase
    supabaseSync.pushChange("sales", "insert", newSale, newSale.id);

    // Descontar inventario automáticamente de bodega_terminado por cada ítem
    (newSale.items || []).forEach((item) => {
      this.addInventoryMovement({
        brick_type_id: item.brick_type_id,
        movement_type: "salida",
        quantity: item.quantity,
        from_location: "bodega_terminado",
        reference_id: newSale.id,
        reference_type: "sale",
      });
    });

    // Registrar automático en Caja General
    this.addCashLedgerEntry({
      movement_date: getTodayDateString(),
      description: `Venta #${newSale.id.slice(-6)} - ${newSale.payment_method.toUpperCase()}`,
      amount: newSale.total_amount,
      category: "venta",
      reference_type: "sale",
      reference_id: newSale.id,
    });

    const cust = this.customers.find((c) => c.id === newSale.customer_id);
    AuditLogger.log({
      action: "CREATE",
      severity: "high",
      module: "ventas",
      entity_id: newSale.id,
      description: `Venta directa #${newSale.id.slice(-6)} registrada por Bs ${newSale.total_amount.toLocaleString()} a ${cust?.name || "Cliente"} (Método: ${newSale.payment_method.toUpperCase()})`,
      details: { total_amount: newSale.total_amount, payment_method: newSale.payment_method },
    });

    return newSale;
  }

  convertOrderToSale(orderId: string, paymentMethod: "efectivo" | "transferencia" | "credito" = "efectivo"): Sale | null {
    const orderIndex = this.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return null;
    
    const order = this.orders[orderIndex];
    order.status = "vendido";
    order.delivery_status = "entregado";

    const existingSale = this.sales.find(s => s.order_id === order.id);
    if (existingSale) {
      return existingSale;
    }
    
    const totalAmount = (order.items || []).reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      order_id: order.id,
      customer_id: order.customer_id,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      items: (order.items || []).map(item => ({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sale_id: "",
        brick_type_id: item.brick_type_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };
    
    if (newSale.items) {
      newSale.items.forEach(i => i.sale_id = newSale.id);
    }
    
    this.sales.unshift(newSale);
    
    // No descontamos inventario nuevamente porque createOrder ya lo descontó (reserva física).

    this.addCashLedgerEntry({
      movement_date: getTodayDateString(),
      description: `Venta desde Pedido #${order.id.slice(-6)} - ${paymentMethod.toUpperCase()}`,
      amount: newSale.total_amount,
      category: "venta",
      reference_type: "sale",
      reference_id: newSale.id,
    });

    const cust = this.customers.find((c) => c.id === order.customer_id);
    AuditLogger.log({
      action: "CREATE",
      severity: "high",
      module: "ventas",
      entity_id: newSale.id,
      description: `Pedido #${order.id.slice(-6)} convertido a venta final por Bs ${newSale.total_amount.toLocaleString()} a ${cust?.name || "Cliente"} (Pago: ${paymentMethod.toUpperCase()})`,
      details: { order_id: order.id, total_amount: newSale.total_amount },
    });
    
    return newSale;
  }

  cancelOrder(orderId: string): Order | null {
    const orderIndex = this.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return null;
    
    const order = this.orders[orderIndex];
    order.status = "cancelado";
    
    // Restaurar inventario (deshacer reserva)
    (order.items || []).forEach(item => {
      this.addInventoryMovement({
        brick_type_id: item.brick_type_id,
        movement_type: "entrada",
        quantity: item.quantity,
        to_location: "bodega_terminado",
        reference_id: order.id,
        reference_type: "order_cancellation",
      });
    });

    AuditLogger.log({
      action: "UPDATE",
      severity: "high",
      module: "ventas",
      entity_id: orderId,
      description: `Cancelación de pedido #${order.id.slice(-6)} y reversión de stock a bodega`,
    });
    
    return order;
  }

  // PAYROLL & ADVANCES
  getPayrollPeriods() {
    return [...this.payrollPeriods].sort((a, b) => b.start_date.localeCompare(a.start_date));
  }

  createPayrollPeriod(frequency: "semanal" | "quincenal" | "mensual", startDate: string, endDate: string) {
    const newPeriod: PayrollPeriod = {
      id: genUUID(),
      frequency,
      start_date: startDate,
      end_date: endDate,
      status: "abierto",
      created_at: new Date().toISOString(),
    };
    this.payrollPeriods.unshift(newPeriod);

    // Sincronización automática a Supabase
    supabaseSync.pushChange("payroll_periods", "insert", newPeriod, newPeriod.id);

    // Pre-generar automáticamente detalles de planilla para todos los empleados activos de la nómina
    this.getPayrollDetails(newPeriod.id);

    AuditLogger.log({
      action: "CREATE",
      severity: "medium",
      module: "nomina",
      entity_id: newPeriod.id,
      description: `Apertura de nuevo periodo de planilla ${frequency.toUpperCase()}: del ${startDate} al ${endDate}`,
      details: { frequency, startDate, endDate },
    });

    return newPeriod;
  }

  getPayrollDetails(periodId: string) {
    this.getEmployees();
    const period = this.payrollPeriods.find((p) => p.id === periodId);
    const isWeekly = period?.frequency === "semanal";

    // Asegurar que TODOS los empleados activos de la nómina estén en la planilla
    const activeEmployees = this.employees.filter((e) => e.active);
    let changed = false;

    activeEmployees.forEach((emp) => {
      const exists = this.payrollDetails.some(
        (pd) => pd.period_id === periodId && pd.employee_id === emp.id
      );
      if (!exists) {
        const base = emp.base_salary || 2750;
        const hireDate = emp.hire_date ? new Date(emp.hire_date) : new Date();
        const now = new Date();
        let years = now.getFullYear() - hireDate.getFullYear();
        const m = now.getMonth() - hireDate.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < hireDate.getDate())) {
          years--;
        }
        years = Math.max(0, years);
        const antPct = emp.antiquity_bonus_pct !== undefined ? emp.antiquity_bonus_pct : (years >= 2 ? 5 : 0);
        const antiquity = Number(((base * antPct) / 100).toFixed(2));
        const frontier = emp.frontier_bonus !== undefined && emp.frontier_bonus !== null ? emp.frontier_bonus : Number((base * 0.20).toFixed(2));
        let prodBonus = 0;

        if (emp.contract_type === "destajo") {
          const empBatches = this.batches.filter((b) => b.operator_id === emp.id);
          const totalQty = empBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
          const rate = emp.rate_per_thousand || 150;
          prodBonus = totalQty > 0 ? Number(((totalQty / 1000) * rate).toFixed(2)) : 0;
        }

        const totalEarned = Number((base + prodBonus + antiquity + frontier).toFixed(2));
        const deductions = 0;
        const quincenaAmount = Number((totalEarned * 0.50).toFixed(2));
        const advances = 0;
        const netPay = Number((quincenaAmount - advances).toFixed(2));

        const newDetail: PayrollDetail = {
          id: `pay-${Date.now()}-${emp.id}`,
          period_id: periodId,
          employee_id: emp.id,
          base_amount: base,
          antiquity_bonus: antiquity,
          frontier_bonus: frontier,
          production_bonus: prodBonus,
          total_earned: totalEarned,
          deductions: deductions,
          quincena_amount: quincenaAmount,
          mid_period_advance: 0,
          personal_advances: advances,
          net_pay: netPay,
          paid: false,
          signed: false,
        };
        this.payrollDetails.push(newDetail);
        changed = true;
      }
    });

    if (changed) {
      this.savePayrollDetailsToStorage();
    }

    return this.payrollDetails
      .filter((pd) => pd.period_id === periodId)
      .map((pd) => ({
        ...pd,
        employee: this.employees.find((e) => e.id === pd.employee_id),
      }))
      .filter((pd) => Boolean(pd.employee && pd.employee.active));
  }

  updatePayrollDetail(detailId: string, updates: Partial<PayrollDetail>) {
    const pd = this.payrollDetails.find((d) => d.id === detailId);
    if (!pd) return null;

    Object.assign(pd, updates);

    // Auto-recalculate amounts if components changed
    if (
      updates.base_amount !== undefined ||
      updates.antiquity_bonus !== undefined ||
      updates.frontier_bonus !== undefined ||
      updates.production_bonus !== undefined
    ) {
      if (updates.total_earned === undefined) {
        pd.total_earned = Number(
          (
            (pd.base_amount || 0) +
            (pd.antiquity_bonus || 0) +
            (pd.frontier_bonus || 0) +
            (pd.production_bonus || 0)
          ).toFixed(2)
        );
      }
    }

    if (
      updates.quincena_amount === undefined &&
      (updates.base_amount !== undefined ||
        updates.production_bonus !== undefined ||
        updates.antiquity_bonus !== undefined ||
        updates.frontier_bonus !== undefined ||
        updates.deductions !== undefined)
    ) {
      pd.quincena_amount = Number((pd.total_earned * 0.5).toFixed(2));
    }

    if (
      updates.net_pay === undefined &&
      (updates.quincena_amount !== undefined ||
        updates.personal_advances !== undefined ||
        updates.deductions !== undefined ||
        updates.base_amount !== undefined)
    ) {
      const q = pd.quincena_amount ?? Number((pd.total_earned * 0.5).toFixed(2));
      pd.net_pay = Math.max(0, Number((q - (pd.personal_advances || 0)).toFixed(2)));
    }

    this.savePayrollDetailsToStorage();

    // Sincronización automática a Supabase
    supabaseSync.pushChange("payroll_details", "update", updates, detailId);

    const emp = this.employees.find((e) => e.id === pd.employee_id);
    AuditLogger.log({
      action: "UPDATE",
      severity: "medium",
      module: "nomina",
      entity_id: detailId,
      description: `Detalle de planilla modificado para ${emp?.full_name || "Empleado"}: Líquido pagable Bs ${pd.net_pay?.toLocaleString()}`,
      details: updates,
    });

    return pd;
  }

  calculateEmployeeProductionBonus(employeeId: string): number {
    const emp = this.employees.find((e) => e.id === employeeId);
    if (!emp) return 0;
    const empBatches = this.batches.filter((b) => b.operator_id === employeeId);
    const totalQty = empBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
    const rate = emp.rate_per_thousand || 150;
    return totalQty > 0 ? Number(((totalQty / 1000) * rate).toFixed(2)) : 0;
  }

  addEmployeeToPayroll(data: {
    period_id: string;
    employee_id: string;
    base_amount: number;
    antiquity_bonus: number;
    frontier_bonus: number;
    production_bonus: number;
    total_earned: number;
    deductions: number;
    quincena_amount: number;
    personal_advances: number;
    net_pay: number;
  }) {
    let detail = this.payrollDetails.find(
      (pd) => pd.period_id === data.period_id && pd.employee_id === data.employee_id
    );

    if (detail) {
      Object.assign(detail, data);
    } else {
      detail = {
        id: `pay-${Date.now()}-${data.employee_id}`,
        ...data,
        mid_period_advance: 0,
        paid: false,
        signed: false,
      };
      this.payrollDetails.push(detail);
    }

    this.savePayrollDetailsToStorage();

    const emp = this.employees.find((e) => e.id === data.employee_id);
    AuditLogger.log({
      action: "UPDATE",
      severity: "medium",
      module: "nomina",
      entity_id: detail.id,
      description: `Asignación de planilla para ${emp?.full_name || "Empleado"}: Total ganado Bs ${data.total_earned.toLocaleString()}, Líquido pagable Bs ${data.net_pay.toLocaleString()}`,
      details: data,
    });

    return detail;
  }

  removeEmployeeFromPayroll(detailId: string) {
    const pd = this.payrollDetails.find((p) => p.id === detailId);
    const emp = pd ? this.employees.find((e) => e.id === pd.employee_id) : null;
    this.payrollDetails = this.payrollDetails.filter((p) => p.id !== detailId);
    this.savePayrollDetailsToStorage();

    AuditLogger.log({
      action: "DELETE",
      severity: "medium",
      module: "nomina",
      entity_id: detailId,
      description: `Remoción de empleado de planilla: ${emp?.full_name || detailId}`,
    });
  }

  addEmployeeAdvance(advance: Omit<EmployeeAdvance, "id" | "created_at">) {
    const newAdv: EmployeeAdvance = {
      ...advance,
      id: genUUID(),
      created_at: new Date().toISOString(),
    };
    this.advances.unshift(newAdv);

    // Sincronización automática a Supabase
    supabaseSync.pushChange("employee_advances", "insert", newAdv, newAdv.id);

    // Sumar a personal_advances en el detalle de planilla activo del empleado
    let detail = this.payrollDetails.find(
      (pd) => pd.employee_id === advance.employee_id && 
              (!advance.period_id || pd.period_id === advance.period_id) && 
              !pd.paid
    );

    if (detail) {
      detail.personal_advances += advance.amount;
      const q = detail.quincena_amount ?? Number((detail.total_earned * 0.5).toFixed(2));
      detail.net_pay = Math.max(0, Number((q - detail.personal_advances).toFixed(2)));
      this.savePayrollDetailsToStorage();
    } else if (advance.period_id) {
      // Si el empleado no estaba en esta planilla, lo agregamos con sus valores base en cero
      const newDetail: PayrollDetail = {
        id: `pd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        period_id: advance.period_id,
        employee_id: advance.employee_id,
        base_amount: 0,
        production_bonus: 0,
        antiquity_bonus: 0,
        frontier_bonus: 0,
        total_earned: 0,
        deductions: 0,
        quincena_amount: 0,
        mid_period_advance: 0,
        personal_advances: advance.amount,
        net_pay: -advance.amount,
        paid: false,
        signed: false
      };
      this.payrollDetails.push(newDetail);
      this.savePayrollDetailsToStorage();
    }

    // Registrar egreso automático en Caja General
    const emp = this.employees.find((e) => e.id === advance.employee_id);
    this.addCashLedgerEntry({
      movement_date: advance.advance_date,
      description: `Anticipo de sueldo: ${emp?.full_name || "Empleado"} - ${advance.reason || "Sin motivo"}`,
      amount: -advance.amount,
      category: "anticipo",
      reference_type: "employee_advances",
      reference_id: newAdv.id,
    });

    AuditLogger.log({
      action: "CREATE",
      severity: "medium",
      module: "caja",
      entity_id: newAdv.id,
      description: `Anticipo de sueldo de Bs ${advance.amount.toLocaleString()} concedido a ${emp?.full_name || "Empleado"} (${advance.reason || "Sin motivo"})`,
      details: advance,
    });

    return newAdv;
  }

  markPayrollAsPaid(detailId: string) {
    const pd = this.payrollDetails.find((d) => d.id === detailId);
    if (pd) {
      pd.paid = true;
      pd.signed = true;
      this.savePayrollDetailsToStorage();
      const emp = this.employees.find((e) => e.id === pd.employee_id);

      // Descontar pago final de planilla en Caja General
      this.addCashLedgerEntry({
        movement_date: getTodayDateString(),
        description: `Pago planilla final: ${emp?.full_name || "Empleado"}`,
        amount: -pd.net_pay,
        category: "planilla",
        reference_type: "payroll_details",
        reference_id: pd.id,
      });

      AuditLogger.log({
        action: "UPDATE",
        severity: "high",
        module: "nomina",
        entity_id: detailId,
        description: `Pago y liquidación final de planilla para ${emp?.full_name || "Empleado"} por Bs ${pd.net_pay.toLocaleString()}`,
        details: { employee_id: pd.employee_id, net_pay: pd.net_pay },
      });
    }
  }

  // CASH LEDGER (CAJA GENERAL)
  getCashLedger() {
    return [...this.cashLedger].sort((a, b) => b.movement_date.localeCompare(a.movement_date));
  }

  addCashLedgerEntry(entry: Omit<CashLedgerEntry, "id" | "created_at">): CashLedgerEntry {
    const newEntry: CashLedgerEntry = {
      ...entry,
      id: genUUID(),
      created_at: new Date().toISOString(),
    };
    this.cashLedger.unshift(newEntry);

    // Sincronización automática a Supabase
    supabaseSync.pushChange("cash_ledger", "insert", newEntry, newEntry.id);

    AuditLogger.log({
      action: "CREATE",
      severity: Math.abs(entry.amount) >= 5000 ? "high" : "medium",
      module: "caja",
      entity_id: newEntry.id,
      description: `Movimiento de caja [${entry.category.toUpperCase()}]: ${entry.amount >= 0 ? "+" : ""}Bs ${entry.amount.toLocaleString()} — ${entry.description}`,
      details: entry,
    });

    return newEntry;
  }

  getCashRunningBalance(): number {
    return this.cashLedger.reduce((acc, curr) => acc + curr.amount, 0);
  }

  // ==========================================
  // HORNOS: INGRESO, CONTROL Y SALIDA (DESHORNE)
  // ==========================================
  getHornoCycles(filter?: { status?: string; horno?: string }) {
    let list = this.hornoCycles.map((c) => ({
      ...c,
      brick_type: this.brickTypes.find((bt) => bt.id === c.brick_type_id),
      quemador: this.employees.find((e) => e.id === c.quemador_id),
    }));

    if (filter?.status && filter.status !== "todos") {
      list = list.filter((c) => c.status === filter.status);
    }
    if (filter?.horno && filter.horno !== "todos") {
      list = list.filter((c) => c.horno_number === filter.horno);
    }

    return list.sort((a, b) => b.fecha_ingreso.localeCompare(a.fecha_ingreso));
  }

  addHornoIngreso(data: Omit<HornoCycle, "id" | "created_at" | "folio">): HornoCycle {
    const nextFolioNum = 200 + this.hornoCycles.length + 1;
    const newCycle: HornoCycle = {
      ...data,
      id: `cycle-${Date.now()}`,
      folio: `HRN-${String(nextFolioNum).padStart(4, "0")}`,
      created_at: new Date().toISOString(),
    };
    this.hornoCycles.unshift(newCycle);

    // Movimiento de inventario: Traslado patio_secado -> horno
    this.addInventoryMovement({
      brick_type_id: newCycle.brick_type_id,
      movement_type: "traslado",
      quantity: newCycle.cantidad_ingreso,
      from_location: "patio_secado",
      to_location: "horno",
      reference_id: newCycle.id,
      reference_type: "horno_ingreso",
    });

    const bt = this.brickTypes.find((b) => b.id === newCycle.brick_type_id);
    AuditLogger.log({
      action: "CREATE",
      severity: "medium",
      module: "produccion_hornos",
      entity_id: newCycle.id,
      description: `Carga e ingreso a horno ${newCycle.horno_number} (${newCycle.folio}): ${newCycle.cantidad_ingreso.toLocaleString()} unid. de ${bt?.name || "Ladrillo"}`,
      details: { folio: newCycle.folio, horno: newCycle.horno_number, cantidad: newCycle.cantidad_ingreso },
    });

    return newCycle;
  }

  updateHornoSalida(
    id: string,
    salidaData: {
      fecha_salida: string;
      hora_salida: string;
      cantidad_salida_primera: number;
      cantidad_salida_segunda: number;
      cantidad_merma: number;
      supervisor?: string;
      notes?: string;
    }
  ): HornoCycle | null {
    const idx = this.hornoCycles.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const cycle = this.hornoCycles[idx];
    const total_salida =
      salidaData.cantidad_salida_primera +
      salidaData.cantidad_salida_segunda +
      salidaData.cantidad_merma;
    const rendimiento_pct =
      cycle.cantidad_ingreso > 0
        ? Number(((salidaData.cantidad_salida_primera / cycle.cantidad_ingreso) * 100).toFixed(1))
        : 0;
    const merma_pct =
      cycle.cantidad_ingreso > 0
        ? Number(((salidaData.cantidad_merma / cycle.cantidad_ingreso) * 100).toFixed(1))
        : 0;

    const updated: HornoCycle = {
      ...cycle,
      ...salidaData,
      total_salida,
      rendimiento_pct,
      merma_pct,
      status: "finalizado",
    };

    this.hornoCycles[idx] = updated;

    // Movimiento de inventario: Mover de 'horno' a 'bodega_terminado'
    const totalBuenos = salidaData.cantidad_salida_primera + salidaData.cantidad_salida_segunda;
    if (totalBuenos > 0) {
      this.addInventoryMovement({
        brick_type_id: cycle.brick_type_id,
        movement_type: "traslado",
        quantity: totalBuenos,
        from_location: "horno",
        to_location: "bodega_terminado",
        reference_id: cycle.id,
        reference_type: "horno_salida",
      });
    }

    // Merma se descuenta del horno
    if (salidaData.cantidad_merma > 0) {
      this.addInventoryMovement({
        brick_type_id: cycle.brick_type_id,
        movement_type: "salida",
        quantity: salidaData.cantidad_merma,
        from_location: "horno",
        reference_id: cycle.id,
        reference_type: "horno_merma",
      });
    }

    AuditLogger.log({
      action: "UPDATE",
      severity: "high",
      module: "produccion_hornos",
      entity_id: id,
      description: `Deshorne concluido en ${cycle.horno_number} (${cycle.folio}): Primera: ${salidaData.cantidad_salida_primera.toLocaleString()} unid. | Segunda: ${salidaData.cantidad_salida_segunda.toLocaleString()} unid. | Merma: ${salidaData.cantidad_merma.toLocaleString()} unid. (Rendimiento: ${rendimiento_pct}%)`,
      details: { ...salidaData, rendimiento_pct, merma_pct },
    });

    return updated;
  }

  updateHornoStatus(id: string, status: HornoStatus): HornoCycle | null {
    const idx = this.hornoCycles.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const prevStatus = this.hornoCycles[idx].status;
    this.hornoCycles[idx].status = status;

    AuditLogger.log({
      action: "UPDATE",
      severity: "medium",
      module: "produccion_hornos",
      entity_id: id,
      description: `Horno ${this.hornoCycles[idx].horno_number} cambió a estado/fase: "${status.toUpperCase()}"`,
      details: { horno: this.hornoCycles[idx].horno_number, status, previous_status: prevStatus },
    });

    return this.hornoCycles[idx];
  }

  // ==========================================
  // PATIO DE ENTREGAS: CONTROL, CARGUÍO Y DESPACHO
  // ==========================================
  getPatioDespachos(filter?: { estado?: string; fecha?: string }) {
    let list = [...this.patioDespachos];
    if (filter?.estado && filter.estado !== "todos") {
      list = list.filter((p) => p.estado === filter.estado);
    }
    if (filter?.fecha) {
      list = list.filter((p) => p.fecha === filter.fecha);
    }
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora_ingreso.localeCompare(a.hora_ingreso));
  }

  addPatioDespacho(data: Omit<PatioDespacho, "id" | "created_at" | "folio">): PatioDespacho {
    const nextNum = 90 + this.patioDespachos.length + 1;
    const newDespacho: PatioDespacho = {
      ...data,
      id: `patio-${Date.now()}`,
      folio: `PTE-${String(nextNum).padStart(4, "0")}`,
      created_at: new Date().toISOString(),
    };
    this.patioDespachos.unshift(newDespacho);

    // Si ya está despachado al crearse, se descuenta de bodega_terminado
    if (newDespacho.estado === "despachado") {
      newDespacho.items.forEach((item) => {
        this.addInventoryMovement({
          brick_type_id: item.brick_type_id,
          movement_type: "salida",
          quantity: item.cantidad,
          from_location: "bodega_terminado",
          reference_id: newDespacho.id,
          reference_type: "patio_despacho",
        });
      });
    }

    AuditLogger.log({
      action: "CREATE",
      severity: "medium",
      module: "patio_despacho",
      entity_id: newDespacho.id,
      description: `Orden de despacho en patio ${newDespacho.folio}: Conductor ${newDespacho.chofer_nombre} (Placa: ${newDespacho.placa_camion}) - Estado: ${newDespacho.estado.toUpperCase()}`,
      details: newDespacho,
    });

    return newDespacho;
  }

  updatePatioDespachoEstado(
    id: string,
    estado: PatioDespachoEstado,
    hora_salida?: string
  ): PatioDespacho | null {
    const idx = this.patioDespachos.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const prev = this.patioDespachos[idx];
    const prevEstado = prev.estado;

    this.patioDespachos[idx].estado = estado;
    if (hora_salida) {
      this.patioDespachos[idx].hora_salida = hora_salida;
    }

    if (prevEstado !== "despachado" && estado === "despachado") {
      prev.items.forEach((item) => {
        this.addInventoryMovement({
          brick_type_id: item.brick_type_id,
          movement_type: "salida",
          quantity: item.cantidad,
          from_location: "bodega_terminado",
          reference_id: prev.id,
          reference_type: "patio_despacho",
        });
      });
    }

    AuditLogger.log({
      action: "UPDATE",
      severity: "medium",
      module: "patio_despacho",
      entity_id: id,
      description: `Despacho ${prev.folio} cambió de estado a "${estado.toUpperCase()}"`,
      details: { folio: prev.folio, estado, previous_status: prevEstado, hora_salida },
    });

    return this.patioDespachos[idx];
  }
}

// Global Singleton Instance
export const store = new MemoryStore();
