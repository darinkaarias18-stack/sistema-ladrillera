-- =================================================================
-- ERP PLANTA INDUSTRIAL INCEGUA S.R.L. - MIGRACIÓN 005
-- Esquema Industrial Completo, Auditoría Inmutable y Blindaje RLS
-- =================================================================

-- ========== 1. ACTUALIZACIÓN DE COLUMNAS EXISTENTES (ELIMINAR SCHEMA DRIFT) ==========

alter table public.profiles
  add column if not exists email text,
  add column if not exists position text,
  add column if not exists allowed_modules jsonb default '[]'::jsonb;

alter table public.customers
  add column if not exists city text,
  add column if not exists tax_id text;

alter table public.production_batches
  add column if not exists folio_number text,
  add column if not exists horno text,
  add column if not exists hora_vaciado text,
  add column if not exists sector_asignado text;

-- Ampliar constraint de status en production_batches para incluir 'en_proceso'
do $$ begin
  alter table public.production_batches drop constraint if exists production_batches_status_check;
  alter table public.production_batches
    add constraint production_batches_status_check
    check (status in ('verde', 'secando', 'horno', 'terminado', 'descartado', 'en_proceso'));
exception when others then null;
end $$;

alter table public.orders
  add column if not exists delivery_type text,
  add column if not exists delivery_status text default 'programado',
  add column if not exists delivery_address text,
  add column if not exists contact_phone text,
  add column if not exists driver_id uuid references public.employees(id) on delete set null,
  add column if not exists city text,
  add column if not exists city_discount_pct numeric(5,2) default 0.00,
  add column if not exists city_discount_amount numeric(10,2) default 0.00,
  add column if not exists subtotal numeric(12,2) default 0.00,
  add column if not exists total_amount numeric(12,2) default 0.00;

alter table public.brick_types
  add column if not exists image_url text;

alter table public.employee_attendance
  add column if not exists time_in text,
  add column if not exists time_out text;

alter table public.payroll_details
  add column if not exists quincena_amount numeric(10,2) default 0.00;

-- ========== 2. TABLAS INDUSTRIALES FALTANTES ==========

-- CICLOS DE QUEMA EN HORNOS (Enhorne, Quema y Deshorne)
create table if not exists public.horno_cycles (
  id uuid primary key default gen_random_uuid(),
  folio text not null,
  horno_number text not null,
  fecha_ingreso date not null default current_date,
  hora_ingreso text not null,
  brick_type_id uuid not null references public.brick_types(id) on delete restrict,
  cantidad_ingreso integer not null check (cantidad_ingreso > 0),
  quemador_id uuid not null references public.employees(id) on delete restrict,
  combustible text,
  temperatura_estimada numeric(6,2),
  status text not null default 'cargando'
    check (status in ('cargando', 'en_quema', 'enfriando', 'deshorne', 'finalizado', 'disponible')),
  fecha_salida date,
  hora_salida text,
  cantidad_salida_primera integer default 0 check (cantidad_salida_primera >= 0),
  cantidad_salida_segunda integer default 0 check (cantidad_salida_segunda >= 0),
  cantidad_merma integer default 0 check (cantidad_merma >= 0),
  total_salida integer default 0 check (total_salida >= 0),
  rendimiento_pct numeric(5,2),
  merma_pct numeric(5,2),
  supervisor text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_horno_cycles_fecha on public.horno_cycles(fecha_ingreso desc);
create index if not exists idx_horno_cycles_status on public.horno_cycles(status);

-- PATIO DE DESPACHOS Y CARGUÍO
create table if not exists public.patio_despachos (
  id uuid primary key default gen_random_uuid(),
  folio text not null,
  fecha date not null default current_date,
  hora_ingreso text not null,
  hora_salida text,
  cliente_id uuid references public.customers(id) on delete set null,
  cliente_nombre text not null,
  placa_camion text not null,
  chofer_nombre text not null,
  chofer_telefono text,
  tipo_retiro text not null check (tipo_retiro in ('cliente_recojo', 'transporte_planta')),
  bahia_carga text not null,
  items jsonb not null default '[]'::jsonb,
  total_unidades integer not null default 0 check (total_unidades >= 0),
  cuadrilla_estibadores text,
  estado text not null default 'en_carguio'
    check (estado in ('en_carguio', 'despachado', 'anulado')),
  order_id uuid references public.orders(id) on delete set null,
  encargado_patio text not null,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_patio_despachos_fecha on public.patio_despachos(fecha desc);
create index if not exists idx_patio_despachos_estado on public.patio_despachos(estado);

-- DESCUENTOS COMERCIALES POR CIUDAD
create table if not exists public.city_discounts (
  id uuid primary key default gen_random_uuid(),
  city text unique not null,
  discount_percentage numeric(5,2) not null default 0.00 check (discount_percentage >= 0 and discount_percentage <= 100),
  description text,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- ========== 3. TABLA DE AUDITORÍA INMUTABLE (APPEND-ONLY) ==========

create table if not exists public.system_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  user_name text not null,
  user_email text not null,
  user_role text not null,
  action text not null check (action in (
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN_SUCCESS', 'LOGIN_FAILED',
    'SECURITY_ALERT', 'EXPORT_DATA', 'STOCK_ADJUSTMENT', 'ROLE_CHANGE'
  )),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  module text not null,
  entity_id text,
  description text not null,
  details jsonb default '{}'::jsonb,
  ip_address text
);

create index if not exists idx_audit_logs_created_at on public.system_audit_logs(created_at desc);
create index if not exists idx_audit_logs_module_severity on public.system_audit_logs(module, severity);

-- Función y trigger para impedir UPDATE o DELETE en system_audit_logs (Inmutabilidad Forense)
create or replace function public.prevent_audit_log_mutation()
returns trigger as $$
begin
  raise exception 'Violación de seguridad: los registros de auditoría en system_audit_logs son inmutables (no se permite UPDATE ni DELETE).';
end;
$$ language plpgsql;

drop trigger if exists trg_immutable_audit_logs on public.system_audit_logs;
create trigger trg_immutable_audit_logs
before update or delete on public.system_audit_logs
for each row execute function public.prevent_audit_log_mutation();

-- ========== 4. HABILITAR RLS EN TODAS LAS TABLAS Y CORREGIR POLÍTICAS ==========

alter table public.customers enable row level security;
alter table public.order_items enable row level security;
alter table public.sale_items enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.employee_advances enable row level security;
alter table public.production_batch_employees enable row level security;
alter table public.horno_cycles enable row level security;
alter table public.patio_despachos enable row level security;
alter table public.city_discounts enable row level security;
alter table public.system_audit_logs enable row level security;

-- Helper function para verificar rol del usuario autenticado
create or replace function public.has_any_role(allowed_roles text[])
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role::text = any(allowed_roles)
  );
$$ language sql security definer stable;

-- Profiles: cada usuario puede leer su propio perfil; admin/superadmin pueden leer todos
drop policy if exists "Read own or admin profiles" on public.profiles;
create policy "Read own or admin profiles" on public.profiles
  for select using (
    id = auth.uid() or public.has_any_role(array['superadmin', 'admin'])
  );

-- Settlements (Finiquitos): restringir lectura e inserción estrictamente a superadmin y admin
drop policy if exists "Auth read settlements" on public.employee_settlements;
drop policy if exists "Auth insert settlements" on public.employee_settlements;
create policy "Admin read settlements" on public.employee_settlements
  for select using (public.has_any_role(array['superadmin', 'admin']));
create policy "Admin insert settlements" on public.employee_settlements
  for insert with check (public.has_any_role(array['superadmin', 'admin']));

-- Payroll Periods & Details & Advances: solo superadmin y admin
drop policy if exists "Admin payroll periods access" on public.payroll_periods;
create policy "Admin payroll periods access" on public.payroll_periods
  for all using (public.has_any_role(array['superadmin', 'admin']));

drop policy if exists "Admin advances access" on public.employee_advances;
create policy "Admin advances access" on public.employee_advances
  for all using (public.has_any_role(array['superadmin', 'admin']));

-- Cash Ledger: superadmin, admin, cajero, ventas
drop policy if exists "Cash ledger access" on public.cash_ledger;
create policy "Cash ledger access" on public.cash_ledger
  for all using (public.has_any_role(array['superadmin', 'admin', 'cajero', 'ventas']));

-- Customers, Orders, Order Items, Sales, Sale Items: roles comerciales y admin
drop policy if exists "Sales read customers" on public.customers;
create policy "Sales read customers" on public.customers
  for all using (public.has_any_role(array['superadmin', 'admin', 'cajero', 'ventas', 'entrega_recepcion']));

drop policy if exists "Orders access" on public.orders;
create policy "Orders access" on public.orders
  for all using (public.has_any_role(array['superadmin', 'admin', 'cajero', 'ventas', 'entrega_recepcion']));

drop policy if exists "Order items access" on public.order_items;
create policy "Order items access" on public.order_items
  for all using (public.has_any_role(array['superadmin', 'admin', 'cajero', 'ventas', 'entrega_recepcion']));

drop policy if exists "Sales read access" on public.sales;
create policy "Sales read access" on public.sales
  for select using (public.has_any_role(array['superadmin', 'admin', 'cajero', 'ventas', 'entrega_recepcion']));

drop policy if exists "Sale items access" on public.sale_items;
create policy "Sale items access" on public.sale_items
  for all using (public.has_any_role(array['superadmin', 'admin', 'cajero', 'ventas']));

-- City Discounts: lectura para autenticados, escritura solo admin/superadmin
drop policy if exists "Read city discounts" on public.city_discounts;
create policy "Read city discounts" on public.city_discounts
  for select using (auth.role() = 'authenticated');
drop policy if exists "Admin manage city discounts" on public.city_discounts;
create policy "Admin manage city discounts" on public.city_discounts
  for all using (public.has_any_role(array['superadmin', 'admin']));

-- Producción, Hornos, Patio, Inventario
drop policy if exists "Production batch employees access" on public.production_batch_employees;
create policy "Production batch employees access" on public.production_batch_employees
  for all using (public.has_any_role(array['superadmin', 'admin', 'ing_produccion', 'produccion']));

drop policy if exists "Horno cycles read" on public.horno_cycles;
create policy "Horno cycles read" on public.horno_cycles
  for select using (auth.role() = 'authenticated');
drop policy if exists "Horno cycles write" on public.horno_cycles;
create policy "Horno cycles write" on public.horno_cycles
  for all using (public.has_any_role(array['superadmin', 'admin', 'ing_produccion', 'produccion']));

drop policy if exists "Patio despachos read" on public.patio_despachos;
create policy "Patio despachos read" on public.patio_despachos
  for select using (auth.role() = 'authenticated');
drop policy if exists "Patio despachos write" on public.patio_despachos;
create policy "Patio despachos write" on public.patio_despachos
  for all using (public.has_any_role(array['superadmin', 'admin', 'entrega_recepcion', 'ing_produccion', 'cajero', 'ventas']));

drop policy if exists "Inventory movements read" on public.inventory_movements;
create policy "Inventory movements read" on public.inventory_movements
  for select using (auth.role() = 'authenticated');
drop policy if exists "Inventory movements insert" on public.inventory_movements;
create policy "Inventory movements insert" on public.inventory_movements
  for insert with check (public.has_any_role(array['superadmin', 'admin', 'ing_produccion', 'produccion', 'entrega_recepcion', 'cajero', 'ventas']));

-- System Observations: cualquier autenticado puede insertar/leer, SOLO superadmin puede actualizar/eliminar
drop policy if exists "Permitir actualizar observaciones" on public.system_observations;
drop policy if exists "Permitir eliminar observaciones" on public.system_observations;
create policy "Superadmin update observations" on public.system_observations
  for update using (public.has_any_role(array['superadmin']));
create policy "Superadmin delete observations" on public.system_observations
  for delete using (public.has_any_role(array['superadmin']));

-- System Audit Logs: inserción para autenticados, lectura exclusiva para superadmin, sin update/delete
drop policy if exists "Auth insert audit logs" on public.system_audit_logs;
create policy "Auth insert audit logs" on public.system_audit_logs
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "Superadmin read audit logs" on public.system_audit_logs;
create policy "Superadmin read audit logs" on public.system_audit_logs
  for select using (public.has_any_role(array['superadmin']));
