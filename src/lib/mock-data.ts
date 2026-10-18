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
  Profile
} from "@/types/database.types";

export const INITIAL_PROFILES: Profile[] = [
  { id: "prof-1", full_name: "SuperAdmin Central", role: "superadmin", created_at: "2026-08-01T08:00:00Z" },
  { id: "prof-2", full_name: "Administrador Planta", role: "admin", created_at: "2026-08-01T08:00:00Z" },
  { id: "prof-3", full_name: "Darinka (Supervisor Producción)", role: "produccion", created_at: "2026-08-01T08:00:00Z" },
  { id: "prof-4", full_name: "Ejecutivo Ventas", role: "ventas", created_at: "2026-08-01T08:00:00Z" }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    full_name: "Angel",
    document_id: "CI-4589211",
    position: "Maestro Moldeador",
    hire_date: "2024-03-15",
    contract_type: "destajo",
    pay_frequency: "semanal",
    base_salary: 0,
    rate_per_thousand: 150, // $150 por millar
    antiquity_bonus_pct: 0,
    frontier_bonus: 0,
    active: true,
  },
  {
    id: "emp-2",
    full_name: "Moisés",
    document_id: "CI-7821900",
    position: "Maestro Moldeador",
    hire_date: "2024-05-10",
    contract_type: "destajo",
    pay_frequency: "semanal",
    base_salary: 0,
    rate_per_thousand: 160,
    antiquity_bonus_pct: 0,
    frontier_bonus: 0,
    active: true,
  },
  {
    id: "emp-3",
    full_name: "Victor Rodolfo",
    document_id: "CI-3312908",
    position: "Maestro Quemador / Horno",
    hire_date: "2023-01-10",
    contract_type: "fijo",
    pay_frequency: "mensual",
    base_salary: 3800,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5, // 5%
    frontier_bonus: 200,    // $200 bono frontera
    active: true,
  },
  {
    id: "emp-4",
    full_name: "Alex Pandique",
    document_id: "CI-9918231",
    position: "Chofer / Despacho",
    hire_date: "2023-06-01",
    contract_type: "fijo",
    pay_frequency: "mensual",
    base_salary: 3400,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5,
    frontier_bonus: 150,
    active: true,
  },
  {
    id: "emp-5",
    full_name: "Carlos Rivera",
    document_id: "CI-6123491",
    position: "Operario de Carga",
    hire_date: "2025-02-01",
    contract_type: "fijo",
    pay_frequency: "semanal",
    base_salary: 1200,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 0,
    frontier_bonus: 0,
    active: true,
  }
];

export const INITIAL_BRICK_TYPES: BrickType[] = [
  { id: "brick-1", name: "Ladrillo 6H Normal de 1ra", dimensions: "24x12x10 cm", weight_kg: 2.6, sale_price: 1.80, estimated_cost: 1.10, active: true },
  { id: "brick-2", name: "Ladrillo 6H Normal de 2da", dimensions: "24x12x10 cm", weight_kg: 2.5, sale_price: 1.50, estimated_cost: 0.90, active: true },
  { id: "brick-3", name: "Ladrillo 6H 25CM de 1ra", dimensions: "25x12x10 cm", weight_kg: 2.8, sale_price: 1.90, estimated_cost: 1.15, active: true },
  { id: "brick-4", name: "Ladrillo 6H 25CM de 2da", dimensions: "25x12x10 cm", weight_kg: 2.7, sale_price: 1.60, estimated_cost: 0.95, active: true },
  { id: "brick-5", name: "Ladrillo 6H Cuadrado de 1ra", dimensions: "20x20x10 cm", weight_kg: 3.2, sale_price: 2.10, estimated_cost: 1.30, active: true },
  { id: "brick-6", name: "Ladrillo 6H Cuadrado de 2da", dimensions: "20x20x10 cm", weight_kg: 3.1, sale_price: 1.75, estimated_cost: 1.05, active: true },
  { id: "brick-7", name: "Ladrillo 6H Cuadrado Partido", dimensions: "20x10x10 cm", weight_kg: 1.6, sale_price: 1.20, estimated_cost: 0.70, active: true },
  { id: "brick-8", name: "Ladrillo Grande Rep de Hornos", dimensions: "30x15x10 cm", weight_kg: 4.5, sale_price: 2.80, estimated_cost: 1.70, active: true },
  { id: "brick-9", name: "Ladrillo 2H de 1ra", dimensions: "24x12x6 cm", weight_kg: 1.8, sale_price: 1.40, estimated_cost: 0.85, active: true },
  { id: "brick-10", name: "Ladrillo 2H de 2da", dimensions: "24x12x6 cm", weight_kg: 1.7, sale_price: 1.15, estimated_cost: 0.70, active: true },
  { id: "brick-11", name: "Adobitos Maquina", dimensions: "22x10x5 cm", weight_kg: 1.5, sale_price: 0.90, estimated_cost: 0.50, active: true },
  { id: "brick-12", name: "Adobitos Manual", dimensions: "22x10x5 cm", weight_kg: 1.4, sale_price: 0.80, estimated_cost: 0.45, active: true },
  { id: "brick-13", name: "Piso o Tojo", dimensions: "20x20x3 cm", weight_kg: 1.9, sale_price: 2.20, estimated_cost: 1.35, active: true },
  { id: "brick-14", name: "Bota Agua Casa", dimensions: "24x12x8 cm", weight_kg: 2.2, sale_price: 1.70, estimated_cost: 1.00, active: true },
  { id: "brick-15", name: "Celosias Estrella", dimensions: "20x20x8 cm", weight_kg: 2.5, sale_price: 3.50, estimated_cost: 2.10, active: true },
  { id: "brick-16", name: "Trabas", dimensions: "24x12x5 cm", weight_kg: 1.6, sale_price: 1.30, estimated_cost: 0.75, active: true },
  { id: "brick-17", name: "Tejas", dimensions: "40x20 cm", weight_kg: 2.3, sale_price: 2.50, estimated_cost: 1.50, active: true },
];

export const INITIAL_INVENTORY_STOCK: InventoryStock[] = [
  { id: "stock-1", brick_type_id: "brick-1", location: "patio_secado", quantity: 14500 },
  { id: "stock-2", brick_type_id: "brick-1", location: "horno", quantity: 9000 },
  { id: "stock-3", brick_type_id: "brick-1", location: "bodega_terminado", quantity: 28000 },

  { id: "stock-4", brick_type_id: "brick-3", location: "patio_secado", quantity: 8200 },
  { id: "stock-5", brick_type_id: "brick-3", location: "horno", quantity: 6000 },
  { id: "stock-6", brick_type_id: "brick-3", location: "bodega_terminado", quantity: 19500 },

  { id: "stock-7", brick_type_id: "brick-5", location: "patio_secado", quantity: 3500 },
  { id: "stock-8", brick_type_id: "brick-5", location: "horno", quantity: 2000 },
  { id: "stock-9", brick_type_id: "brick-5", location: "bodega_terminado", quantity: 7400 },
];

export const INITIAL_PRODUCTION_BATCHES: ProductionBatch[] = [
  {
    id: "batch-14",
    production_date: "2026-10-17",
    brick_type_id: "brick-1",
    operator_id: "emp-1", // Angel
    shift: "mañana",
    quantity_produced: 3500,
    status: "verde",
    folio_number: "FOL-00134",
    horno: "Horno 1",
    notes: "Moldeo en patio nuevo, excelente plasticidad de arcilla"
  },
  {
    id: "batch-13",
    production_date: "2026-10-17",
    brick_type_id: "brick-9",
    operator_id: "emp-2", // Moisés
    shift: "mañana",
    quantity_produced: 2600,
    status: "verde",
    folio_number: "FOL-00133",
    horno: "Horno 2",
    notes: "Ladrillo 2H de 1ra, lote fresco en tendales"
  },
  {
    id: "batch-12",
    production_date: "2026-10-16",
    brick_type_id: "brick-1",
    operator_id: "emp-1",
    shift: "mañana",
    quantity_produced: 3800,
    status: "secando",
    folio_number: "FOL-00132",
    horno: "Horno 1",
    notes: "En patio secando bajo sombra con lona protectora"
  },
  {
    id: "batch-11",
    production_date: "2026-10-15",
    brick_type_id: "brick-3",
    operator_id: "emp-2",
    shift: "tarde",
    quantity_produced: 3100,
    status: "secando",
    folio_number: "FOL-00131",
    horno: "Horno 2",
    notes: "Deshidratación óptima, listo para apilado de horno"
  },
  {
    id: "batch-10",
    production_date: "2026-10-14",
    brick_type_id: "brick-1",
    operator_id: "emp-1",
    shift: "mañana",
    quantity_produced: 4200,
    status: "horno",
    folio_number: "FOL-00130",
    horno: "Horno 1",
    notes: "En quema continua, temperatura a 980°C con leña tajibo"
  },
  {
    id: "batch-9",
    production_date: "2026-10-13",
    brick_type_id: "brick-5",
    operator_id: "emp-2",
    shift: "mañana",
    quantity_produced: 3300,
    status: "horno",
    folio_number: "FOL-00129",
    horno: "Horno 3",
    notes: "Cocción de ladrillo 6H cuadrado en cámara 2"
  },
  {
    id: "batch-8",
    production_date: "2026-10-12",
    brick_type_id: "brick-17",
    operator_id: "emp-1",
    shift: "tarde",
    quantity_produced: 2900,
    status: "horno",
    folio_number: "FOL-00128",
    horno: "Horno 2",
    notes: "Tejas coloniales en cocción final"
  },
  {
    id: "batch-7",
    production_date: "2026-10-10",
    brick_type_id: "brick-1",
    operator_id: "emp-1",
    shift: "mañana",
    quantity_produced: 4500,
    status: "terminado",
    folio_number: "FOL-00127",
    horno: "Horno 1",
    notes: "Récord de vaciado turno mañana, llevado a bodega de terminado"
  },
  {
    id: "batch-6",
    production_date: "2026-10-09",
    brick_type_id: "brick-3",
    operator_id: "emp-2",
    shift: "mañana",
    quantity_produced: 3600,
    status: "terminado",
    folio_number: "FOL-00126",
    horno: "Horno 2",
    notes: "Enfriamiento completado, calidad 1ra selección impecable"
  },
  {
    id: "batch-5",
    production_date: "2026-10-07",
    brick_type_id: "brick-5",
    operator_id: "emp-1",
    shift: "mañana",
    quantity_produced: 3200,
    status: "terminado",
    folio_number: "FOL-00125",
    horno: "Horno 1",
    notes: "Apilado en bodega listo para despacho de Constructora"
  },
  {
    id: "batch-4",
    production_date: "2026-10-05",
    brick_type_id: "brick-1",
    operator_id: "emp-2",
    shift: "tarde",
    quantity_produced: 3400,
    status: "terminado",
    folio_number: "FOL-00124",
    horno: "Horno 3",
    notes: "Ladrillo 6H normal llevado a bodega principal"
  },
  {
    id: "batch-3",
    production_date: "2026-10-03",
    brick_type_id: "brick-13",
    operator_id: "emp-1",
    shift: "mañana",
    quantity_produced: 2800,
    status: "terminado",
    folio_number: "FOL-00123",
    horno: "Horno 1",
    notes: "Piso o Tojo rústico horneado y seleccionado"
  },
  {
    id: "batch-2",
    production_date: "2026-10-02",
    brick_type_id: "brick-1",
    operator_id: "emp-2",
    shift: "mañana",
    quantity_produced: 3900,
    status: "terminado",
    folio_number: "FOL-00122",
    horno: "Horno 2",
    notes: "Lote completo de primera para constructora"
  },
  {
    id: "batch-1",
    production_date: "2026-10-01",
    brick_type_id: "brick-3",
    operator_id: "emp-1",
    shift: "mañana",
    quantity_produced: 3300,
    status: "terminado",
    folio_number: "FOL-00121",
    horno: "Horno 1",
    notes: "Apertura de producción mes de octubre"
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: "cust-1", name: "Constructora Norte S.A.", phone: "712-34567", address: "Av. Las Américas #450" },
  { id: "cust-2", name: "Feria de Materiales San José", phone: "689-11223", address: "Calle Industrial #12" },
  { id: "cust-3", name: "Ing. Juan Pablo Morales", phone: "700-98765", address: "Urb. Los Pinos Mz B" },
  { id: "cust-4", name: "Consorcio Constructor del Oriente", phone: "755-43210", address: "Av. Banzer 4to Anillo" },
  { id: "cust-5", name: "Constructora Los Tajibos", phone: "780-99881", address: "Km 9 Carretera al Norte" },
  { id: "cust-6", name: "Distribuidora Warnes Materiales", phone: "763-12456", address: "Av. Principal Warnes #88" },
  { id: "cust-7", name: "Urbanización Las Palmas S.R.L.", phone: "721-66778", address: "Radial 19 Doble Vía" }
];

export const INITIAL_SALES: Sale[] = [
  {
    id: "sale-1",
    customer_id: "cust-1",
    total_amount: 9000,
    payment_method: "transferencia",
    sold_by: "prof-4",
    created_at: "2026-09-25T10:30:00Z",
    items: [
      { id: "sitem-1", sale_id: "sale-1", brick_type_id: "brick-1", quantity: 5000, unit_price: 1.80 }
    ]
  },
  {
    id: "sale-2",
    customer_id: "cust-2",
    total_amount: 4200,
    payment_method: "efectivo",
    sold_by: "prof-4",
    created_at: "2026-09-28T14:15:00Z",
    items: [
      { id: "sitem-2", sale_id: "sale-2", brick_type_id: "brick-2", quantity: 3000, unit_price: 1.40 }
    ]
  },
  {
    id: "sale-3",
    customer_id: "cust-5",
    total_amount: 12600,
    payment_method: "transferencia",
    sold_by: "prof-4",
    created_at: "2026-10-02T11:00:00Z",
    items: [
      { id: "sitem-3", sale_id: "sale-3", brick_type_id: "brick-1", quantity: 7000, unit_price: 1.80 }
    ]
  },
  {
    id: "sale-4",
    customer_id: "cust-6",
    total_amount: 15200,
    payment_method: "transferencia",
    sold_by: "prof-4",
    created_at: "2026-10-05T16:20:00Z",
    items: [
      { id: "sitem-4", sale_id: "sale-4", brick_type_id: "brick-3", quantity: 8000, unit_price: 1.90 }
    ]
  },
  {
    id: "sale-5",
    customer_id: "cust-3",
    total_amount: 9450,
    payment_method: "efectivo",
    sold_by: "prof-4",
    created_at: "2026-10-08T09:45:00Z",
    items: [
      { id: "sitem-5", sale_id: "sale-5", brick_type_id: "brick-5", quantity: 4500, unit_price: 2.10 }
    ]
  },
  {
    id: "sale-6",
    customer_id: "cust-4",
    total_amount: 27600,
    payment_method: "transferencia",
    sold_by: "prof-4",
    created_at: "2026-10-10T15:30:00Z",
    items: [
      { id: "sitem-6a", sale_id: "sale-6", brick_type_id: "brick-1", quantity: 12000, unit_price: 1.80 },
      { id: "sitem-6b", sale_id: "sale-6", brick_type_id: "brick-5", quantity: 2857, unit_price: 2.10 }
    ]
  },
  {
    id: "sale-7",
    customer_id: "cust-7",
    total_amount: 18500,
    payment_method: "transferencia",
    sold_by: "prof-4",
    created_at: "2026-10-13T12:15:00Z",
    items: [
      { id: "sitem-7a", sale_id: "sale-7", brick_type_id: "brick-17", quantity: 5000, unit_price: 2.50 },
      { id: "sitem-7b", sale_id: "sale-7", brick_type_id: "brick-13", quantity: 2727, unit_price: 2.20 }
    ]
  },
  {
    id: "sale-8",
    customer_id: "cust-1",
    total_amount: 14400,
    payment_method: "credito",
    sold_by: "prof-4",
    created_at: "2026-10-15T10:00:00Z",
    items: [
      { id: "sitem-8", sale_id: "sale-8", brick_type_id: "brick-1", quantity: 8000, unit_price: 1.80 }
    ]
  },
  {
    id: "sale-9",
    customer_id: "cust-2",
    total_amount: 11200,
    payment_method: "efectivo",
    sold_by: "prof-4",
    created_at: "2026-10-17T14:40:00Z",
    items: [
      { id: "sitem-9", sale_id: "sale-9", brick_type_id: "brick-9", quantity: 8000, unit_price: 1.40 }
    ]
  }
];

export const INITIAL_PAYROLL_PERIODS: PayrollPeriod[] = [
  {
    id: "period-1",
    frequency: "semanal",
    start_date: "2026-08-24",
    end_date: "2026-08-30",
    status: "abierto"
  },
  {
    id: "period-2",
    frequency: "mensual",
    start_date: "2026-08-01",
    end_date: "2026-08-31",
    status: "cerrado"
  }
];

export const INITIAL_PAYROLL_DETAILS: PayrollDetail[] = [
  {
    id: "pay-1",
    period_id: "period-1",
    employee_id: "emp-1",
    base_amount: 0,
    antiquity_bonus: 0,
    frontier_bonus: 0,
    production_bonus: 1050,
    total_earned: 1050,
    deductions: 0,
    mid_period_advance: 0,
    personal_advances: 150,
    net_pay: 900,
    paid: false,
    signed: false
  },
  {
    id: "pay-2",
    period_id: "period-1",
    employee_id: "emp-2",
    base_amount: 0,
    antiquity_bonus: 0,
    frontier_bonus: 0,
    production_bonus: 800,
    total_earned: 800,
    deductions: 0,
    mid_period_advance: 0,
    personal_advances: 100,
    net_pay: 700,
    paid: false,
    signed: false
  },
  {
    id: "pay-3",
    period_id: "period-2",
    employee_id: "emp-3",
    base_amount: 3800,
    antiquity_bonus: 190,
    frontier_bonus: 200,
    production_bonus: 0,
    total_earned: 4190,
    deductions: 0,
    mid_period_advance: 1900,
    personal_advances: 200,
    net_pay: 2090,
    paid: true,
    signed: true
  }
];

export const INITIAL_CASH_LEDGER: CashLedgerEntry[] = [
  // VENTAS (INGRESOS)
  {
    id: "cash-1",
    movement_date: "2026-09-25",
    description: "Venta directa de ladrillo King Kong (Contado)",
    amount: 9000,
    category: "venta",
    reference_type: "sale",
    reference_id: "sale-1"
  },
  {
    id: "cash-4",
    movement_date: "2026-09-28",
    description: "Cobro venta ladrillo Pandereta - Constructora Norte",
    amount: 4200,
    category: "venta",
    reference_type: "sale",
    reference_id: "sale-2"
  },
  {
    id: "cash-v3",
    movement_date: "2026-10-02",
    description: "Cobro Venta Ladrillo 6H 1ra - Constructora Los Tajibos",
    amount: 12600,
    category: "venta",
    reference_type: "sale",
    reference_id: "sale-3"
  },
  {
    id: "cash-v4",
    movement_date: "2026-10-05",
    description: "Cobro Venta Ladrillo 25CM - Distribuidora Warnes",
    amount: 15200,
    category: "venta",
    reference_type: "sale",
    reference_id: "sale-4"
  },
  {
    id: "cash-v5",
    movement_date: "2026-10-08",
    description: "Cobro Venta Ladrillo Cuadrado - Ing. Juan Pablo Morales",
    amount: 9450,
    category: "venta",
    reference_type: "sale",
    reference_id: "sale-5"
  },
  {
    id: "cash-v6",
    movement_date: "2026-10-10",
    description: "Venta Mayorista Gran Escala - Consorcio del Oriente (Récord)",
    amount: 27600,
    category: "venta",
    reference_type: "sale",
    reference_id: "sale-6"
  },
  {
    id: "cash-v7",
    movement_date: "2026-10-13",
    description: "Cobro Venta Tejas y Pisos - Urbanización Las Palmas",
    amount: 18500,
    category: "venta",
    reference_type: "sale",
    reference_id: "sale-7"
  },
  {
    id: "cash-v8",
    movement_date: "2026-10-15",
    description: "Venta Ladrillo 6H 1ra - Constructora Norte S.A.",
    amount: 14400,
    category: "venta",
    reference_type: "sale",
    reference_id: "sale-8"
  },
  {
    id: "cash-v9",
    movement_date: "2026-10-17",
    description: "Cobro Venta Ladrillo 2H - Feria de Materiales San José",
    amount: 11200,
    category: "venta",
    reference_type: "sale",
    reference_id: "sale-9"
  },

  // COMPRAS DE INSUMOS (LO QUE MÁS SE COMPRA)
  {
    id: "cash-ci1",
    movement_date: "2026-09-26",
    description: "Compra de Leña dura tajibo para quema de hornos (Lote 1)",
    amount: -5200,
    category: "compra_insumo"
  },
  {
    id: "cash-ci2",
    movement_date: "2026-09-29",
    description: "Compra de Arcilla greda seleccionada (4 volquetas de 12m3)",
    amount: -3800,
    category: "compra_insumo"
  },
  {
    id: "cash-ci3",
    movement_date: "2026-10-03",
    description: "Compra de Leña seca de curupaú para Horno 2 (Lote 2)",
    amount: -4600,
    category: "compra_insumo"
  },
  {
    id: "cash-ci4",
    movement_date: "2026-10-06",
    description: "Compra de Tierra arenosa para mezcla de moldeado (3 viajes)",
    amount: -2100,
    category: "compra_insumo"
  },
  {
    id: "cash-ci5",
    movement_date: "2026-10-09",
    description: "Compra de Leña trozada para encendido rápido de hornos",
    amount: -3400,
    category: "compra_insumo"
  },
  {
    id: "cash-ci6",
    movement_date: "2026-10-11",
    description: "Compra de Arcilla roja fina para acabado de tejas (3 volquetas)",
    amount: -3100,
    category: "compra_insumo"
  },
  {
    id: "cash-ci7",
    movement_date: "2026-10-14",
    description: "Compra de Leña dura de cencerro para cámara principal",
    amount: -4100,
    category: "compra_insumo"
  },
  {
    id: "cash-ci8",
    movement_date: "2026-10-16",
    description: "Compra de Aditivo ligante y desmoldante para extrusora",
    amount: -1150,
    category: "compra_insumo"
  },

  // GASTOS DE COMBUSTIBLE
  {
    id: "cash-3",
    movement_date: "2026-09-27",
    description: "Pago de combustible camión de reparto (Alex Pandique)",
    amount: -450,
    category: "combustible"
  },
  {
    id: "cash-cb2",
    movement_date: "2026-10-04",
    description: "Diesel para pala cargadora y tractor de patio",
    amount: -1200,
    category: "combustible"
  },
  {
    id: "cash-cb3",
    movement_date: "2026-10-08",
    description: "Diesel para camión de despacho Lote 2",
    amount: -680,
    category: "combustible"
  },
  {
    id: "cash-cb4",
    movement_date: "2026-10-12",
    description: "Diesel para generador de emergencia y motobomba",
    amount: -850,
    category: "combustible"
  },
  {
    id: "cash-cb5",
    movement_date: "2026-10-16",
    description: "Diesel para camión de reparto Alex Pandique",
    amount: -520,
    category: "combustible"
  },

  // GASTOS DE MANTENIMIENTO
  {
    id: "cash-m1",
    movement_date: "2026-10-04",
    description: "Mantenimiento rodamiento y correas de extrusora",
    amount: -1850,
    category: "mantenimiento"
  },
  {
    id: "cash-m2",
    movement_date: "2026-10-07",
    description: "Reparación y soldadura de tolva de alimentación de barro",
    amount: -980,
    category: "mantenimiento"
  },
  {
    id: "cash-m3",
    movement_date: "2026-10-11",
    description: "Repuestos cuchillas de corte para ladrillo 6H",
    amount: -1450,
    category: "mantenimiento"
  },
  {
    id: "cash-m4",
    movement_date: "2026-10-15",
    description: "Mantenimiento preventivo eléctrico panel hornos",
    amount: -780,
    category: "mantenimiento"
  },

  // GASTOS DE PLANILLA Y ANTICIPOS
  {
    id: "cash-2",
    movement_date: "2026-09-26",
    description: "Anticipo de quincena operario Angel",
    amount: -150,
    category: "anticipo",
    reference_type: "employee_advances"
  },
  {
    id: "cash-5",
    movement_date: "2026-09-29",
    description: "Pago de planilla mensual Victor Rodolfo",
    amount: -2090,
    category: "planilla",
    reference_type: "payroll_details",
    reference_id: "pay-3"
  },
  {
    id: "cash-p2",
    movement_date: "2026-10-06",
    description: "Anticipo de quincena moldeador Moisés",
    amount: -200,
    category: "anticipo"
  },
  {
    id: "cash-p3",
    movement_date: "2026-10-12",
    description: "Anticipo quincenal operario Angel",
    amount: -250,
    category: "anticipo"
  },
  {
    id: "cash-p4",
    movement_date: "2026-10-15",
    description: "Pago de quincena personal operativo fijo",
    amount: -3400,
    category: "planilla"
  },

  // OTROS GASTOS OPERATIVOS
  {
    id: "cash-o1",
    movement_date: "2026-10-05",
    description: "Servicio de energía eléctrica trifásica planta (CRE)",
    amount: -3100,
    category: "otro"
  },
  {
    id: "cash-o2",
    movement_date: "2026-10-10",
    description: "Suministro de agua industrial para preparación de lodo",
    amount: -650,
    category: "otro"
  },
  {
    id: "cash-o3",
    movement_date: "2026-10-14",
    description: "Flete de transporte pesado de carga externa",
    amount: -1200,
    category: "otro"
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: "ord-897501",
    customer_id: "cust-2",
    status: "pendiente",
    delivery_date: "2026-10-14",
    delivery_type: "obra",
    delivery_status: "programado",
    delivery_address: "Calle Industrial #12, Zona Norte",
    contact_phone: "689-11223",
    driver_id: "emp-4",
    notes: "Entregar en obra en horario de la mañana",
    created_at: "2026-10-13T10:00:00Z",
    items: [
      { id: "item-init-1", order_id: "ord-897501", brick_type_id: "brick-1", quantity: 3000, unit_price: 1.80 }
    ]
  },
  {
    id: "ord-897450",
    customer_id: "cust-1",
    status: "pendiente",
    delivery_date: "2026-10-15",
    delivery_type: "exportacion",
    delivery_status: "programado",
    delivery_address: "Av. Las Américas #450 (Despacho Frontera)",
    contact_phone: "712-34567",
    driver_id: "emp-4",
    notes: "Descargar con cuidado cerca al depósito",
    created_at: "2026-10-12T14:30:00Z",
    items: [
      { id: "item-init-2", order_id: "ord-897450", brick_type_id: "brick-3", quantity: 5000, unit_price: 1.90 }
    ]
  },
  {
    id: "ord-897320",
    customer_id: "cust-3",
    status: "vendido",
    delivery_date: "2026-10-13",
    delivery_type: "fabrica",
    delivery_status: "entregado",
    delivery_address: "Retiro en Planta Principal",
    contact_phone: "700-98765",
    notes: "Camión del cliente recogió el lote completo",
    created_at: "2026-10-11T09:15:00Z",
    items: [
      { id: "item-init-3", order_id: "ord-897320", brick_type_id: "brick-5", quantity: 2000, unit_price: 2.10 }
    ]
  }
];
