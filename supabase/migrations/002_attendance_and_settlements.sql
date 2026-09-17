-- =================================================================
-- ERP FÁBRICA DE LADRILLOS - MIGRACIÓN 002
-- Asistencia diaria y finiquitos
-- =================================================================

-- 1. TABLA DE ASISTENCIA DIARIA
create table if not exists employee_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null default current_date,
  status text not null check (status in ('presente', 'falta', 'permiso', 'vacaciones')),
  hours_worked numeric(5,2) default 8.00,
  extra_hours numeric(5,2) default 0.00,
  notes text,
  created_at timestamptz default now(),
  unique (employee_id, date)
);

-- 2. TABLA DE FINIQUITOS
create table if not exists employee_settlements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  settlement_date date not null default current_date,
  reason text not null check (reason in ('renuncia', 'despido', 'fin_contrato', 'otro')),
  base_salary numeric(10,2) not null,
  time_worked_months numeric(5,2) not null,
  severance_pay numeric(10,2) default 0.00,       -- Indemnización
  vacation_pay numeric(10,2) default 0.00,        -- Vacaciones no gozadas
  christmas_bonus_pay numeric(10,2) default 0.00, -- Aguinaldo proporcional
  other_deductions numeric(10,2) default 0.00,
  total_amount numeric(10,2) generated always as (severance_pay + vacation_pay + christmas_bonus_pay - other_deductions) stored,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Habilitar RLS
alter table employee_attendance enable row level security;
alter table employee_settlements enable row level security;

-- Políticas de RLS
create policy "Auth read attendance" on employee_attendance for select using (auth.role() = 'authenticated');
create policy "Auth insert attendance" on employee_attendance for insert with check (auth.role() = 'authenticated');
create policy "Auth update attendance" on employee_attendance for update using (auth.role() = 'authenticated');

create policy "Auth read settlements" on employee_settlements for select using (auth.role() = 'authenticated');
create policy "Auth insert settlements" on employee_settlements for insert with check (auth.role() = 'authenticated');

-- Índice
create index if not exists idx_attendance_date on employee_attendance(date);
