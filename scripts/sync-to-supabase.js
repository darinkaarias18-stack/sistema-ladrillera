const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Cargar variables de entorno desde .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const config = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) config[k.trim()] = v.join('=').trim();
});

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = config.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan las credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Catálogo de Tipos de Ladrillos
const BRICK_TYPES = [
  { name: "Ladrillo 6H Normal de 1ra", dimensions: "24x12x10 cm", weight_kg: 2.6, sale_price: 1.80, estimated_cost: 1.10, active: true },
  { name: "Ladrillo 6H Normal de 2da", dimensions: "24x12x10 cm", weight_kg: 2.5, sale_price: 1.50, estimated_cost: 0.90, active: true },
  { name: "Ladrillo 6H 25CM de 1ra", dimensions: "25x12x10 cm", weight_kg: 2.8, sale_price: 1.90, estimated_cost: 1.15, active: true },
  { name: "Ladrillo 6H 25CM de 2da", dimensions: "25x12x10 cm", weight_kg: 2.7, sale_price: 1.60, estimated_cost: 0.95, active: true },
  { name: "Ladrillo 6H Cuadrado de 1ra", dimensions: "20x20x10 cm", weight_kg: 3.2, sale_price: 2.10, estimated_cost: 1.30, active: true },
  { name: "Ladrillo 6H Cuadrado de 2da", dimensions: "20x20x10 cm", weight_kg: 3.1, sale_price: 1.75, estimated_cost: 1.05, active: true },
  { name: "Ladrillo 6H Cuadrado Partido", dimensions: "20x10x10 cm", weight_kg: 1.6, sale_price: 1.20, estimated_cost: 0.70, active: true },
  { name: "Ladrillo Grande Rep de Hornos", dimensions: "30x15x10 cm", weight_kg: 4.5, sale_price: 2.80, estimated_cost: 1.70, active: true },
  { name: "Ladrillo 2H de 1ra", dimensions: "24x12x6 cm", weight_kg: 1.8, sale_price: 1.40, estimated_cost: 0.85, active: true },
  { name: "Ladrillo 2H de 2da", dimensions: "24x12x6 cm", weight_kg: 1.7, sale_price: 1.15, estimated_cost: 0.70, active: true },
  { name: "Adobitos Maquina", dimensions: "22x10x5 cm", weight_kg: 1.5, sale_price: 0.90, estimated_cost: 0.50, active: true },
  { name: "Adobitos Manual", dimensions: "22x10x5 cm", weight_kg: 1.4, sale_price: 0.80, estimated_cost: 0.45, active: true },
  { name: "Piso o Tojo", dimensions: "20x20x3 cm", weight_kg: 1.9, sale_price: 2.20, estimated_cost: 1.35, active: true },
  { name: "Bota Agua Casa", dimensions: "24x12x8 cm", weight_kg: 2.2, sale_price: 1.70, estimated_cost: 1.00, active: true },
  { name: "Celosias Estrella", dimensions: "20x20x8 cm", weight_kg: 2.5, sale_price: 3.50, estimated_cost: 2.10, active: true },
  { name: "Trabas", dimensions: "24x12x5 cm", weight_kg: 1.6, sale_price: 1.30, estimated_cost: 0.75, active: true },
  { name: "Tejas", dimensions: "40x20 cm", weight_kg: 2.3, sale_price: 2.50, estimated_cost: 1.50, active: true }
];

// 3. Empleados de Nómina (13 empleados completos)
const EMPLOYEES = [
  {
    full_name: "Moises Chavez Da silva",
    document_id: "CI-7821900",
    position: "Oper. Maquinaria",
    hire_date: "2017-09-01",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5,
    frontier_bonus: 550,
    active: true,
    production_bonus: 1500, // Bono modificado y editable
    deductions: 80,
    personal_advances: 350
  },
  {
    full_name: "Kadir Salvatierra Gonzales",
    document_id: "CI-8192301",
    position: "Palero",
    hire_date: "2017-09-01",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5,
    frontier_bonus: 550,
    active: true,
    production_bonus: 562.50,
    deductions: 0,
    personal_advances: 0
  },
  {
    full_name: "Wilber David Vargas Quisbert",
    document_id: "CI-6291044",
    position: "Gerente Produccion",
    hire_date: "2021-02-10",
    contract_type: "fijo",
    pay_frequency: "mensual",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 15,
    frontier_bonus: 550,
    active: true,
    production_bonus: 2329.50,
    deductions: 0,
    personal_advances: 0
  },
  {
    full_name: "Carla Garcia Lomar",
    document_id: "CI-9102482",
    position: "Secretaria",
    hire_date: "2022-12-16",
    contract_type: "fijo",
    pay_frequency: "mensual",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5,
    frontier_bonus: 550,
    active: true,
    production_bonus: 0,
    deductions: 259.50,
    personal_advances: 0
  },
  {
    full_name: "Alexander Medina Made",
    document_id: "CI-5192837",
    position: "Quemador",
    hire_date: "2019-05-01",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5,
    frontier_bonus: 550,
    active: true,
    production_bonus: 462.50,
    deductions: 0,
    personal_advances: 0
  },
  {
    full_name: "Neftali Guzman Cayami",
    document_id: "CI-4920192",
    position: "Quemador",
    hire_date: "2021-03-13",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5,
    frontier_bonus: 550,
    active: true,
    production_bonus: 162.50,
    deductions: 0,
    personal_advances: 0
  },
  {
    full_name: "Angel Salvatierra Gutierrez",
    document_id: "CI-4589211",
    position: "Produccion",
    hire_date: "2022-05-10",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5,
    frontier_bonus: 550,
    active: true,
    production_bonus: 500,
    deductions: 637.50,
    personal_advances: 0
  },
  {
    full_name: "Sandro Arteaga Melgar",
    document_id: "CI-7182930",
    position: "Quemador",
    hire_date: "2023-12-16",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5,
    frontier_bonus: 550,
    active: true,
    production_bonus: 162.50,
    deductions: 0,
    personal_advances: 0
  },
  {
    full_name: "Wilber Da silva Noza",
    document_id: "CI-6102938",
    position: "Quemador",
    hire_date: "2022-09-19",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 5,
    frontier_bonus: 550,
    active: true,
    production_bonus: 0,
    deductions: 237.50,
    personal_advances: 0
  },
  {
    full_name: "Freddy Dumay Chamaro",
    document_id: "CI-8192039",
    position: "Quemador",
    hire_date: "2024-05-22",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 0,
    frontier_bonus: 550,
    active: true,
    production_bonus: 0,
    deductions: 100,
    personal_advances: 0
  },
  {
    full_name: "Fabiola Mendoza Dorado",
    document_id: "CI-7291028",
    position: "Almacen",
    hire_date: "2024-08-26",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 0,
    frontier_bonus: 550,
    active: true,
    production_bonus: 0,
    deductions: 550,
    personal_advances: 0
  },
  {
    full_name: "Darinka Arias",
    document_id: "6081611",
    position: "Sistemas",
    hire_date: "2026-10-21",
    contract_type: "fijo",
    pay_frequency: "mensual",
    base_salary: 2000,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 0,
    frontier_bonus: 0,
    active: true,
    production_bonus: 0,
    deductions: 0,
    personal_advances: 0
  },
  {
    full_name: "Carlos Montano Rios",
    document_id: "7829102",
    position: "Quemador",
    hire_date: "2026-10-21",
    contract_type: "fijo",
    pay_frequency: "quincenal",
    base_salary: 2750,
    rate_per_thousand: 0,
    antiquity_bonus_pct: 0,
    frontier_bonus: 0,
    active: true,
    production_bonus: 0,
    deductions: 0,
    personal_advances: 0
  }
];

async function syncAll() {
  console.log('--- INICIANDO SINCRONIZACIÓN CON SUPABASE ---');

  // 1. Sincronizar Catálogo de Ladrillos
  console.log('\n1. Sincronizando Catálogo de Ladrillos (brick_types)...');
  const brickTypeMap = new Map();
  for (const bt of BRICK_TYPES) {
    const { data: existing } = await supabase
      .from('brick_types')
      .select('id, name')
      .eq('name', bt.name)
      .maybeSingle();

    if (existing) {
      brickTypeMap.set(bt.name, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from('brick_types')
        .insert(bt)
        .select('id, name')
        .single();
      if (error) {
        console.error('Error insertando ladrillo ' + bt.name + ':', error.message);
      } else {
        brickTypeMap.set(bt.name, created.id);
      }
    }
  }
  console.log('✓ Catálogo de ladrillos sincronizado (' + brickTypeMap.size + ' tipos).');

  // 2. Sincronizar Empleados de Nómina
  console.log('\n2. Sincronizando Empleados de Nómina (employees)...');
  const employeeMap = new Map();
  for (const emp of EMPLOYEES) {
    const empData = {
      full_name: emp.full_name,
      document_id: emp.document_id,
      position: emp.position,
      hire_date: emp.hire_date,
      contract_type: emp.contract_type,
      pay_frequency: emp.pay_frequency,
      base_salary: emp.base_salary,
      rate_per_thousand: emp.rate_per_thousand,
      antiquity_bonus_pct: emp.antiquity_bonus_pct,
      frontier_bonus: emp.frontier_bonus,
      active: emp.active
    };

    const { data: existing } = await supabase
      .from('employees')
      .select('id, document_id')
      .eq('document_id', emp.document_id)
      .maybeSingle();

    if (existing) {
      await supabase.from('employees').update(empData).eq('id', existing.id);
      employeeMap.set(emp.document_id, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from('employees')
        .insert(empData)
        .select('id, document_id')
        .single();
      if (error) {
        console.error('Error insertando empleado ' + emp.full_name + ':', error.message);
      } else {
        employeeMap.set(emp.document_id, created.id);
      }
    }
  }
  console.log('✓ Empleados sincronizados (' + employeeMap.size + ' registros en Nómina).');

  // 3. Sincronizar Período Oficial de Planilla
  console.log('\n3. Sincronizando Período Oficial de Planilla (payroll_periods)...');
  const periodData = {
    frequency: 'quincenal',
    start_date: '2026-09-01',
    end_date: '2026-09-15',
    status: 'abierto'
  };

  let periodId = null;
  const { data: existingPeriod } = await supabase
    .from('payroll_periods')
    .select('id')
    .eq('frequency', periodData.frequency)
    .eq('start_date', periodData.start_date)
    .eq('end_date', periodData.end_date)
    .maybeSingle();

  if (existingPeriod) {
    periodId = existingPeriod.id;
  } else {
    const { data: newPeriod, error: pErr } = await supabase
      .from('payroll_periods')
      .insert(periodData)
      .select('id')
      .single();
    if (pErr) {
      console.error('Error creando periodo:', pErr.message);
    } else {
      periodId = newPeriod.id;
    }
  }
  console.log('✓ Período oficial ID: ' + periodId);

  // 4. Sincronizar Detalles de Planilla por Empleado
  if (periodId) {
    console.log('\n4. Sincronizando Detalles de Planilla (payroll_details)...');
    let syncedCount = 0;
    for (const emp of EMPLOYEES) {
      const empUuid = employeeMap.get(emp.document_id);
      if (!empUuid) continue;

      const baseAmount = emp.base_salary || 2750;
      const antBonus = Number(((baseAmount * (emp.antiquity_bonus_pct || 0)) / 100).toFixed(2));
      const frontBonus = emp.frontier_bonus ?? Number((baseAmount * 0.20).toFixed(2));
      const prodBonus = emp.production_bonus || 0;
      const deductions = emp.deductions || 0;
      const advances = emp.personal_advances || 0;

      const detailData = {
        period_id: periodId,
        employee_id: empUuid,
        base_amount: baseAmount,
        antiquity_bonus: antBonus,
        frontier_bonus: frontBonus,
        production_bonus: prodBonus,
        deductions: deductions,
        mid_period_advance: 0,
        personal_advances: advances,
        paid: false,
        signed: false
      };

      const { data: existingDetail } = await supabase
        .from('payroll_details')
        .select('id')
        .eq('period_id', periodId)
        .eq('employee_id', empUuid)
        .maybeSingle();

      if (existingDetail) {
        await supabase.from('payroll_details').update(detailData).eq('id', existingDetail.id);
      } else {
        const { error: insErr } = await supabase.from('payroll_details').insert(detailData);
        if (insErr) {
          console.error('Error insertando planilla de ' + emp.full_name + ':', insErr.message);
        }
      }
      syncedCount++;
    }
    console.log('✓ Detalles de planilla sincronizados para ' + syncedCount + ' empleados.');
  }

  // 5. Sincronizar Stock Inicial de Inventario
  console.log('\n5. Sincronizando Inventario (inventory_stock)...');
  const normal1raId = brickTypeMap.get("Ladrillo 6H Normal de 1ra");
  const cm25Id = brickTypeMap.get("Ladrillo 6H 25CM de 1ra");
  const cuadradoId = brickTypeMap.get("Ladrillo 6H Cuadrado de 1ra");

  const stockItems = [
    { brick_type_id: normal1raId, location: "patio_secado", quantity: 14500 },
    { brick_type_id: normal1raId, location: "horno", quantity: 9000 },
    { brick_type_id: normal1raId, location: "bodega_terminado", quantity: 28000 },
    { brick_type_id: cm25Id, location: "patio_secado", quantity: 8200 },
    { brick_type_id: cm25Id, location: "horno", quantity: 6000 },
    { brick_type_id: cm25Id, location: "bodega_terminado", quantity: 19500 },
    { brick_type_id: cuadradoId, location: "patio_secado", quantity: 3500 },
    { brick_type_id: cuadradoId, location: "horno", quantity: 2000 },
    { brick_type_id: cuadradoId, location: "bodega_terminado", quantity: 7400 }
  ].filter(s => Boolean(s.brick_type_id));

  for (const s of stockItems) {
    const { data: existing } = await supabase
      .from('inventory_stock')
      .select('id')
      .eq('brick_type_id', s.brick_type_id)
      .eq('location', s.location)
      .maybeSingle();

    if (existing) {
      await supabase.from('inventory_stock').update({ quantity: s.quantity }).eq('id', existing.id);
    } else {
      await supabase.from('inventory_stock').insert(s);
    }
  }
  console.log('✓ Stock de inventario sincronizado (' + stockItems.length + ' registros).');

  console.log('\n======================================================');
  console.log('✓ SINCRONIZACIÓN EXITOSA CON SUPABASE AL 100%');
  console.log('======================================================');
}

syncAll().catch(e => {
  console.error('Error fatal durante la sincronización:', e);
  process.exit(1);
});
