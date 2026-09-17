-- =================================================================
-- ERP FÁBRICA DE LADRILLOS - MIGRACIÓN COMPLETA DE BASE DE DATOS
-- PostgreSQL / Supabase SQL Schema
-- =================================================================

-- ========== 1. TIPOS Y ENUMS ==========
do $$ begin
  create type user_role as enum ('superadmin', 'admin', 'produccion', 'ventas');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type pay_frequency as enum ('semanal', 'quincenal', 'mensual');
exception
  when duplicate_object then null;
end $$;

-- ========== 2. TABLAS PRINCIPALES ==========

-- PERFILES DE USUARIOS (Vinculados a auth.users de Supabase)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'ventas',
  created_at timestamptz default now()
);

-- EMPLEADOS
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  document_id text unique not null,
  position text not null,               -- 'moldeador', 'quemador', 'chofer', 'gerente produccion', etc.
  hire_date date not null default current_date,
  contract_type text not null check (contract_type in ('fijo', 'destajo', 'temporal')),
  pay_frequency pay_frequency not null default 'mensual',
  base_salary numeric(10,2) default 0.00,            -- Haber Básico
  rate_per_thousand numeric(10,2) default 0.00,      -- Pago por millar producido (destajo)
  antiquity_bonus_pct numeric(5,2) default 0.00,     -- % sobre haber básico
  frontier_bonus numeric(10,2) default 0.00,         -- Bono Frontera (monto fijo o %)
  active boolean default true,
  created_at timestamptz default now()
);

-- TIPOS DE LADRILLO (Catálogo)
create table if not exists brick_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,                   -- 'Ladrillo King Kong 18 huecos', 'Pandereta', etc.
  dimensions text,                      -- '24x12x9 cm'
  weight_kg numeric(5,2),
  sale_price numeric(10,2) not null default 0.00,
  estimated_cost numeric(10,2) default 0.00,
  active boolean default true
);

-- PRODUCCIÓN / VACIADOS DIARIOS
create table if not exists production_batches (
  id uuid primary key default gen_random_uuid(),
  production_date date not null default current_date,
  brick_type_id uuid not null references brick_types(id) on delete restrict,
  operator_id uuid not null references employees(id) on delete restrict,
  shift text not null check (shift in ('mañana', 'tarde', 'extra')),
  quantity_produced integer not null check (quantity_produced >= 0),
  status text not null default 'verde'
    check (status in ('verde', 'secando', 'horno', 'terminado', 'descartado')),
  supervisor_id uuid references profiles(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  unique (production_date, brick_type_id, operator_id, shift)
);

-- CUADRILLA DE APOYO ASIGNADA AL VACIADO
create table if not exists production_batch_employees (
  batch_id uuid references production_batches(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  primary key (batch_id, employee_id)
);

-- INVENTARIO: STOCK POR UBICACIÓN
create table if not exists inventory_stock (
  id uuid primary key default gen_random_uuid(),
  brick_type_id uuid not null references brick_types(id) on delete cascade,
  location text not null check (location in ('patio_secado', 'horno', 'bodega_terminado')),
  quantity integer not null default 0 check (quantity >= 0),
  unique (brick_type_id, location)
);

-- INVENTARIO: MOVIMIENTOS HISTÓRICOS
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  brick_type_id uuid not null references brick_types(id) on delete restrict,
  movement_type text not null check (movement_type in ('entrada', 'salida', 'traslado', 'ajuste')),
  quantity integer not null,
  from_location text check (from_location in ('patio_secado', 'horno', 'bodega_terminado', null)),
  to_location text check (to_location in ('patio_secado', 'horno', 'bodega_terminado', null)),
  reference_id uuid,                    -- id de venta, pedido o batch relacionado
  reference_type text,                  -- 'sale' | 'order' | 'production_batch' | 'manual'
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- CLIENTES
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  created_at timestamptz default now()
);

-- PEDIDOS
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'en_produccion', 'listo', 'entregado', 'cancelado')),
  delivery_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  brick_type_id uuid references brick_types(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

-- VENTAS DIRECTAS O FACTURADAS
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  payment_method text check (payment_method in ('efectivo', 'transferencia', 'credito')),
  sold_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references sales(id) on delete cascade,
  brick_type_id uuid references brick_types(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

-- PLANILLAS (PERIODOS DE NÓMINA)
create table if not exists payroll_periods (
  id uuid primary key default gen_random_uuid(),
  frequency pay_frequency not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'abierto' check (status in ('abierto', 'cerrado', 'pagado')),
  created_at timestamptz default now(),
  unique (frequency, start_date, end_date)
);

-- DETALLE DE NÓMINA POR EMPLEADO
create table if not exists payroll_details (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references payroll_periods(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,

  base_amount numeric(10,2) default 0.00,
  antiquity_bonus numeric(10,2) default 0.00,
  frontier_bonus numeric(10,2) default 0.00,
  production_bonus numeric(10,2) default 0.00,

  total_earned numeric(10,2) generated always as
    (base_amount + antiquity_bonus + frontier_bonus + production_bonus) stored,

  deductions numeric(10,2) default 0.00,
  mid_period_advance numeric(10,2) default 0.00,
  personal_advances numeric(10,2) default 0.00,

  net_pay numeric(10,2) generated always as
    (base_amount + antiquity_bonus + frontier_bonus + production_bonus
     - deductions - mid_period_advance - personal_advances) stored,

  paid boolean default false,
  signed boolean default false,
  unique (period_id, employee_id)
);

-- REGISTRO DE ANTICIPOS SUELTOS
create table if not exists employee_advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  period_id uuid references payroll_periods(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  advance_date date not null default current_date,
  reason text,
  given_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- LIBRO DE CAJA GENERAL (FLUJO DE EFECTIVO INTEGRADO)
create table if not exists cash_ledger (
  id uuid primary key default gen_random_uuid(),
  movement_date date not null default current_date,
  description text not null,
  amount numeric(12,2) not null,           -- positivo = ingreso, negativo = egreso
  category text check (category in
    ('planilla', 'anticipo', 'compra_insumo', 'venta', 'combustible', 'mantenimiento', 'otro')),
  reference_type text,                      -- 'payroll_details' | 'employee_advances' | 'sale' | null
  reference_id uuid,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ========== 3. ÍNDICES DE RENDIMIENTO ==========
create index if not exists idx_production_date on production_batches(production_date);
create index if not exists idx_inventory_movements_type on inventory_movements(brick_type_id, movement_type);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_payroll_periods_dates on payroll_periods(frequency, start_date, end_date);
create index if not exists idx_cash_ledger_date on cash_ledger(movement_date);

-- ========== 4. VISTAS SQL (TOTALES AUTOMÁTICOS) ==========

-- Totales por operario, tipo de ladrillo y día
create or replace view production_daily_totals as
select
  operator_id,
  brick_type_id,
  production_date,
  sum(quantity_produced) as total_dia
from production_batches
group by operator_id, brick_type_id, production_date;

-- Totales por operario, tipo de ladrillo y semana
create or replace view production_weekly_totals as
select
  operator_id,
  brick_type_id,
  date_trunc('week', production_date)::date as week_start,
  sum(quantity_produced) as total_semana
from production_batches
group by operator_id, brick_type_id, week_start;

-- ========== 5. TRIGGERS DE INVENTARIO AUTOMÁTICO ==========

create or replace function apply_inventory_movement()
returns trigger as $$
begin
  if new.movement_type = 'entrada' then
    if new.to_location is not null then
      insert into inventory_stock (brick_type_id, location, quantity)
      values (new.brick_type_id, new.to_location, new.quantity)
      on conflict (brick_type_id, location)
      do update set quantity = inventory_stock.quantity + new.quantity;
    end if;
  elsif new.movement_type = 'salida' then
    if new.from_location is not null then
      update inventory_stock
      set quantity = greatest(0, quantity - new.quantity)
      where brick_type_id = new.brick_type_id and location = new.from_location;
    end if;
  elsif new.movement_type = 'traslado' then
    if new.from_location is not null and new.to_location is not null then
      -- Restar de origen
      update inventory_stock
      set quantity = greatest(0, quantity - new.quantity)
      where brick_type_id = new.brick_type_id and location = new.from_location;
      -- Sumar a destino
      insert into inventory_stock (brick_type_id, location, quantity)
      values (new.brick_type_id, new.to_location, new.quantity)
      on conflict (brick_type_id, location)
      do update set quantity = inventory_stock.quantity + new.quantity;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_inventory_movement on inventory_movements;
create trigger trg_inventory_movement
after insert on inventory_movements
for each row execute function apply_inventory_movement();

-- ========== 6. SEGURIDAD A NIVEL DE FILA (RLS) ==========

alter table profiles enable row level security;
alter table employees enable row level security;
alter table brick_types enable row level security;
alter table production_batches enable row level security;
alter table inventory_stock enable row level security;
alter table inventory_movements enable row level security;
alter table sales enable row level security;
alter table orders enable row level security;
alter table payroll_details enable row level security;
alter table cash_ledger enable row level security;

-- Políticas de lectura generales para usuarios autenticados
drop policy if exists "Auth read employees" on employees;
create policy "Auth read employees" on employees for select using (auth.role() = 'authenticated');

drop policy if exists "Auth read brick_types" on brick_types;
create policy "Auth read brick_types" on brick_types for select using (auth.role() = 'authenticated');

drop policy if exists "Auth read inventory_stock" on inventory_stock;
create policy "Auth read inventory_stock" on inventory_stock for select using (auth.role() = 'authenticated');

-- RLS por Rol
drop policy if exists "Admin payroll access" on payroll_details;
create policy "Admin payroll access" on payroll_details for select using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('superadmin', 'admin')
  )
);

drop policy if exists "Ventas insert sales" on sales;
create policy "Ventas insert sales" on sales for insert with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('superadmin', 'admin', 'ventas')
  )
);

drop policy if exists "Produccion manage batches" on production_batches;
create policy "Produccion manage batches" on production_batches for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('superadmin', 'admin', 'produccion')
  )
);

drop policy if exists "Superadmin manage profiles" on profiles;
create policy "Superadmin manage profiles" on profiles for update using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
    and p.role = 'superadmin'
  )
);
