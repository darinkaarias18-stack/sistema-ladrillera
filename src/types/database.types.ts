export type UserRole = 'superadmin' | 'admin' | 'produccion' | 'ventas';

export type PayFrequency = 'semanal' | 'quincenal' | 'mensual';

export type ContractType = 'fijo' | 'destajo' | 'temporal';

export type ProductionStatus = 'verde' | 'secando' | 'horno' | 'terminado' | 'descartado' | 'en_proceso';

export type InventoryLocation = 'patio_secado' | 'horno' | 'bodega_terminado';

export type MovementType = 'entrada' | 'salida' | 'traslado' | 'ajuste';

export type OrderStatus = 'pendiente' | 'en_produccion' | 'listo' | 'entregado' | 'cancelado';

export type PaymentMethod = 'efectivo' | 'transferencia' | 'credito';

export type PayrollStatus = 'abierto' | 'cerrado' | 'pagado';

export type CashCategory = 
  | 'planilla' 
  | 'anticipo' 
  | 'compra_insumo' 
  | 'venta' 
  | 'combustible' 
  | 'mantenimiento' 
  | 'otro';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Employee {
  id: string;
  full_name: string;
  document_id: string;
  position: string;
  hire_date: string;
  contract_type: ContractType;
  pay_frequency: PayFrequency;
  base_salary: number;
  rate_per_thousand: number;
  antiquity_bonus_pct: number;
  frontier_bonus: number;
  active: boolean;
  created_at?: string;
}

export interface BrickType {
  id: string;
  name: string;
  dimensions?: string;
  weight_kg?: number;
  sale_price: number;
  estimated_cost?: number;
  active: boolean;
}

export interface ProductionBatch {
  id: string;
  production_date: string;
  brick_type_id: string;
  operator_id: string;
  shift: 'mañana' | 'tarde' | 'extra';
  quantity_produced: number;
  status: ProductionStatus;
  folio_number?: string;
  horno?: string;
  hora_vaciado?: string;
  sector_asignado?: string;
  supervisor_id?: string;
  notes?: string;
  created_at?: string;
  // Joins opcionales
  brick_type?: BrickType;
  operator?: Employee;
  crew_ids?: string[];
}

export interface InventoryStock {
  id: string;
  brick_type_id: string;
  location: InventoryLocation;
  quantity: number;
  brick_type?: BrickType;
}

export interface InventoryMovement {
  id: string;
  brick_type_id: string;
  movement_type: MovementType;
  quantity: number;
  from_location?: InventoryLocation | null;
  to_location?: InventoryLocation | null;
  reference_id?: string;
  reference_type?: string;
  created_by?: string;
  created_at: string;
  brick_type?: BrickType;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  brick_type_id: string;
  quantity: number;
  unit_price: number;
  brick_type?: BrickType;
}

export interface Order {
  id: string;
  customer_id?: string;
  status: OrderStatus;
  delivery_date?: string;
  notes?: string;
  created_at: string;
  customer?: Customer;
  items?: OrderItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  brick_type_id: string;
  quantity: number;
  unit_price: number;
  brick_type?: BrickType;
}

export interface Sale {
  id: string;
  order_id?: string;
  customer_id?: string;
  total_amount: number;
  payment_method: PaymentMethod;
  sold_by?: string;
  created_at: string;
  customer?: Customer;
  items?: SaleItem[];
}

export interface PayrollPeriod {
  id: string;
  frequency: PayFrequency;
  start_date: string;
  end_date: string;
  status: PayrollStatus;
  created_at?: string;
}

export interface PayrollDetail {
  id: string;
  period_id: string;
  employee_id: string;
  base_amount: number;
  antiquity_bonus: number;
  frontier_bonus: number;
  production_bonus: number;
  total_earned: number;
  deductions: number;
  mid_period_advance: number;
  personal_advances: number;
  net_pay: number;
  paid: boolean;
  signed: boolean;
  employee?: Employee;
  period?: PayrollPeriod;
}

export interface EmployeeAdvance {
  id: string;
  employee_id: string;
  period_id?: string;
  amount: number;
  advance_date: string;
  reason?: string;
  given_by?: string;
  created_at?: string;
  employee?: Employee;
}

export interface CashLedgerEntry {
  id: string;
  movement_date: string;
  description: string;
  amount: number; // positivo = ingreso, negativo = egreso
  category: CashCategory;
  reference_type?: string;
  reference_id?: string;
  created_by?: string;
  created_at?: string;
}

export type AttendanceStatus = 'presente' | 'falta' | 'permiso' | 'vacaciones';

export interface EmployeeAttendance {
  id: string;
  employee_id: string;
  date: string;
  status: AttendanceStatus;
  time_in?: string;
  time_out?: string;
  hours_worked: number;
  extra_hours: number;
  notes?: string;
  created_at?: string;
  employee?: Employee;
}

export type SettlementReason = 'renuncia' | 'despido' | 'fin_contrato' | 'otro';

export interface EmployeeSettlement {
  id: string;
  employee_id: string;
  settlement_date: string;
  reason: SettlementReason;
  base_salary: number;
  time_worked_months: number;
  severance_pay: number;
  vacation_pay: number;
  christmas_bonus_pay: number;
  other_deductions: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
  employee?: Employee;
}
