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
  }

  private initEmployees() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("erp_employees");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.employees = parsed;
          }
        } else {
          localStorage.setItem("erp_employees", JSON.stringify(this.employees));
        }
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
      id: `emp-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.employees.unshift(newEmp);
    this.saveEmployeesToStorage();
    return newEmp;
  }

  updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
    const idx = this.employees.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.employees[idx] = { ...this.employees[idx], ...updates };
    this.saveEmployeesToStorage();
    return this.employees[idx];
  }

  deleteEmployee(id: string): boolean {
    const idx = this.employees.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    this.employees.splice(idx, 1);
    this.saveEmployeesToStorage();
    return true;
  }

  // ATTENDANCE
  getAttendances(date?: string) {
    if (date) {
      return this.attendances.filter(a => a.date === date);
    }
    return [...this.attendances];
  }

  saveAttendance(attendance: Omit<EmployeeAttendance, "id" | "created_at">) {
    const existingIndex = this.attendances.findIndex(
      (a) => a.employee_id === attendance.employee_id && a.date === attendance.date
    );
    
    if (existingIndex >= 0) {
      this.attendances[existingIndex] = {
        ...this.attendances[existingIndex],
        ...attendance,
      };
    } else {
      this.attendances.push({
        ...attendance,
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString()
      });
    }
  }

  // SETTLEMENTS
  getSettlements() {
    return [...this.settlements];
  }

  addSettlement(settlement: Omit<EmployeeSettlement, "id" | "created_at">) {
    const newSettlement: EmployeeSettlement = {
      ...settlement,
      id: `set-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.settlements.push(newSettlement);
    
    // Deactivate employee
    const empIndex = this.employees.findIndex(e => e.id === settlement.employee_id);
    if (empIndex >= 0) {
      this.employees[empIndex].active = false;
    }
    
    return newSettlement;
  }

  // BRICK TYPES
  getBrickTypes() {
    return [...this.brickTypes];
  }

  addBrickType(bt: Omit<BrickType, "id">): BrickType {
    const newBt: BrickType = {
      ...bt,
      id: `brick-${Date.now()}`,
    };
    this.brickTypes.push(newBt);

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

    return newBt;
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
        id: batchData.id || `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

    return batch;
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
        id: `stock-${Date.now()}`,
        brick_type_id: brickTypeId,
        location,
        quantity: Math.max(0, delta),
      });
    }
  }

  addInventoryMovement(m: Omit<InventoryMovement, "id" | "created_at">): InventoryMovement {
    const movement: InventoryMovement = {
      ...m,
      id: `mov-${Date.now()}`,
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
      id: `cust-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.customers.push(newCust);
    return newCust;
  }

  updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.customers[idx] = { ...this.customers[idx], ...updates };
    return this.customers[idx];
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
    if (existingIdx >= 0) {
      this.cityDiscounts[existingIdx] = {
        ...this.cityDiscounts[existingIdx],
        discount_percentage,
        description: description ?? this.cityDiscounts[existingIdx].description,
        active: true,
      };
      return this.cityDiscounts[existingIdx];
    } else {
      const newCd: CityDiscount = {
        id: `cd-${Date.now()}`,
        city: cleanCity,
        discount_percentage,
        description: description || `Descuento especial ${cleanCity}`,
        active: true,
      };
      this.cityDiscounts.push(newCd);
      return newCd;
    }
  }

  deleteCityDiscount(id: string): void {
    this.cityDiscounts = this.cityDiscounts.filter((cd) => cd.id !== id);
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
      id: `ord-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.orders.unshift(newOrder);

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

    return newOrder;
  }

  updateOrderDeliveryStatus(orderId: string, deliveryStatus: DeliveryStatus): Order | null {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return null;
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

    return order;
  }

  updateOrderDriver(orderId: string, driverId: string): Order | null {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return null;
    order.driver_id = driverId;
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
      id: `sale-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.sales.unshift(newSale);

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
    
    return order;
  }

  // PAYROLL & ADVANCES
  getPayrollPeriods() {
    return [...this.payrollPeriods].sort((a, b) => b.start_date.localeCompare(a.start_date));
  }

  createPayrollPeriod(frequency: "semanal" | "quincenal" | "mensual", startDate: string, endDate: string) {
    const newPeriod: PayrollPeriod = {
      id: `period-${Date.now()}`,
      frequency,
      start_date: startDate,
      end_date: endDate,
      status: "abierto",
      created_at: new Date().toISOString(),
    };
    this.payrollPeriods.unshift(newPeriod);

    // Pre-generar automáticamente detalles de planilla para todos los empleados activos de la nómina
    this.getPayrollDetails(newPeriod.id);

    return newPeriod;
  }

  getPayrollDetails(periodId: string) {
    const period = this.payrollPeriods.find((p) => p.id === periodId);
    const isWeekly = period?.frequency === "semanal";

    // Asegurar que todos los empleados activos de la nómina estén en la planilla
    const activeEmployees = this.employees.filter((e) => e.active);
    activeEmployees.forEach((emp) => {
      const exists = this.payrollDetails.some(
        (pd) => pd.period_id === periodId && pd.employee_id === emp.id
      );
      if (!exists) {
        let base = 0;
        let antiquity = 0;
        let frontier = 0;
        let prodBonus = 0;

        if (emp.contract_type === "destajo") {
          base = 0;
          // Calcular bono de producción según vaciados si existen
          const empBatches = this.batches.filter((b) => b.operator_id === emp.id);
          const totalQty = empBatches.reduce((sum, b) => sum + (b.quantity_produced || 0), 0);
          const rate = emp.rate_per_thousand || 150;
          prodBonus = totalQty > 0 ? Number(((totalQty / 1000) * rate).toFixed(2)) : 0;
        } else {
          // Personal fijo
          if (isWeekly && emp.pay_frequency === "mensual") {
            base = Number((emp.base_salary / 4).toFixed(2));
            antiquity = Number(((base * (emp.antiquity_bonus_pct || 0)) / 100).toFixed(2));
            frontier = Number(((emp.frontier_bonus || 0) / 4).toFixed(2));
          } else {
            base = emp.base_salary;
            antiquity = Number(((base * (emp.antiquity_bonus_pct || 0)) / 100).toFixed(2));
            frontier = emp.frontier_bonus || 0;
          }
        }

        const totalEarned = Number((base + prodBonus + antiquity + frontier).toFixed(2));
        const advances = 0;
        const deductions = 0;
        const netPay = Number((totalEarned - deductions - advances).toFixed(2));

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
          mid_period_advance: 0,
          personal_advances: advances,
          net_pay: netPay,
          paid: false,
          signed: false,
        };
        this.payrollDetails.push(newDetail);
      }
    });

    return this.payrollDetails
      .filter((pd) => pd.period_id === periodId)
      .map((pd) => ({
        ...pd,
        employee: this.employees.find((e) => e.id === pd.employee_id),
      }))
      .filter((pd) => Boolean(pd.employee && pd.employee.active));
  }

  addEmployeeAdvance(advance: Omit<EmployeeAdvance, "id" | "created_at">) {
    const newAdv: EmployeeAdvance = {
      ...advance,
      id: `adv-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.advances.unshift(newAdv);

    // Sumar a personal_advances en el detalle de planilla activo del empleado
    let detail = this.payrollDetails.find(
      (pd) => pd.employee_id === advance.employee_id && 
              (!advance.period_id || pd.period_id === advance.period_id) && 
              !pd.paid
    );

    if (detail) {
      detail.personal_advances += advance.amount;
      detail.net_pay =
        detail.total_earned - detail.deductions - detail.mid_period_advance - detail.personal_advances;
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
        mid_period_advance: 0,
        personal_advances: advance.amount,
        net_pay: -advance.amount,
        paid: false,
        signed: false
      };
      this.payrollDetails.push(newDetail);
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

    return newAdv;
  }

  markPayrollAsPaid(detailId: string) {
    const pd = this.payrollDetails.find((d) => d.id === detailId);
    if (pd) {
      pd.paid = true;
      pd.signed = true;
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
    }
  }

  // CASH LEDGER (CAJA GENERAL)
  getCashLedger() {
    return [...this.cashLedger].sort((a, b) => b.movement_date.localeCompare(a.movement_date));
  }

  addCashLedgerEntry(entry: Omit<CashLedgerEntry, "id" | "created_at">): CashLedgerEntry {
    const newEntry: CashLedgerEntry = {
      ...entry,
      id: `cash-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.cashLedger.unshift(newEntry);
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

    return updated;
  }

  updateHornoStatus(id: string, status: HornoStatus): HornoCycle | null {
    const idx = this.hornoCycles.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.hornoCycles[idx].status = status;
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

    return this.patioDespachos[idx];
  }
}

// Global Singleton Instance
export const store = new MemoryStore();
