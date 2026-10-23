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
  console.error('Error: Faltan credenciales en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Importar datos de mock-data.ts extrayendo los objetos
const mockDataContent = fs.readFileSync('src/lib/mock-data.ts', 'utf8');

async function seedDatabase() {
  console.log('================================================================');
  console.log('--- INICIANDO POBLACIÓN INTEGRAL DE TABLAS EN SUPABASE ---');
  console.log('================================================================\n');

  // 1. OBTENER PERFILES DE USUARIOS (SUPERADMIN, ADMIN, VENTAS)
  console.log('1. Verificando Perfiles de Usuario en Supabase...');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr) throw new Error('Error al consultar profiles: ' + profErr.message);

  const superAdmin = profiles.find(p => p.role === 'superadmin') || profiles[0];
  const ventasUser = profiles.find(p => p.role === 'ventas') || superAdmin;
  console.log(`✓ SuperAdmin: ${superAdmin.full_name} (${superAdmin.id})`);
  console.log(`✓ Ventas: ${ventasUser.full_name} (${ventasUser.id})`);

  // 2. OBTENER MAPA DE TIPOS DE LADRILLO
  console.log('\n2. Mapeando Catálogo de Ladrillos (brick_types)...');
  const { data: brickTypes, error: btErr } = await supabase.from('brick_types').select('*');
  if (btErr) throw new Error('Error al consultar brick_types: ' + btErr.message);

  const brickMapByName = new Map();
  brickTypes.forEach(bt => brickMapByName.set(bt.name, bt.id));

  // Mapa por id legacy (brick-1, brick-2, ...)
  const legacyBrickMap = {
    'brick-1': brickMapByName.get('Ladrillo 6H Normal de 1ra'),
    'brick-2': brickMapByName.get('Ladrillo 6H Normal de 2da'),
    'brick-3': brickMapByName.get('Ladrillo 6H 25CM de 1ra'),
    'brick-4': brickMapByName.get('Ladrillo 6H 25CM de 2da'),
    'brick-5': brickMapByName.get('Ladrillo 6H Cuadrado de 1ra'),
    'brick-6': brickMapByName.get('Ladrillo 6H Cuadrado de 2da'),
    'brick-7': brickMapByName.get('Ladrillo 6H Cuadrado Partido'),
    'brick-8': brickMapByName.get('Ladrillo Grande Rep de Hornos'),
    'brick-9': brickMapByName.get('Ladrillo 2H de 1ra'),
    'brick-10': brickMapByName.get('Ladrillo 2H de 2da'),
    'brick-11': brickMapByName.get('Adobitos Maquina'),
    'brick-12': brickMapByName.get('Adobitos Manual'),
    'brick-13': brickMapByName.get('Piso o Tojo'),
    'brick-14': brickMapByName.get('Bota Agua Casa'),
    'brick-15': brickMapByName.get('Celosias Estrella'),
    'brick-16': brickMapByName.get('Trabas'),
    'brick-17': brickMapByName.get('Tejas')
  };
  console.log(`✓ ${brickTypes.length} tipos de ladrillos listos para vinculación.`);

  // 3. OBTENER MAPA DE EMPLEADOS
  console.log('\n3. Mapeando Empleados de Planta (employees)...');
  const { data: employees, error: empErr } = await supabase.from('employees').select('*');
  if (empErr) throw new Error('Error al consultar employees: ' + empErr.message);

  const empMapByDoc = new Map();
  const empMapByName = new Map();
  employees.forEach(e => {
    empMapByDoc.set(e.document_id, e.id);
    empMapByName.set(e.full_name.toLowerCase(), e.id);
  });

  // Operadores clave de planta
  const angelEmpId = employees.find(e => e.full_name.includes('Angel'))?.id || employees[0].id;
  const moisesEmpId = employees.find(e => e.full_name.includes('Moises'))?.id || employees[1].id;
  const alexanderEmpId = employees.find(e => e.full_name.includes('Alexander'))?.id || employees[2].id;
  console.log(`✓ ${employees.length} empleados mapeados.`);

  // 4. POBLAR CLIENTES (customers)
  console.log('\n4. Poblando Clientes (customers)...');
  const CUSTOMERS_DATA = [
    { key: "cust-1", name: "Constructora Norte S.A.", phone: "712-34567", address: "Av. Las Américas #450, Montero" },
    { key: "cust-2", name: "Feria de Materiales San José", phone: "689-11223", address: "Calle Industrial #12, Santa Cruz" },
    { key: "cust-3", name: "Ing. Juan Pablo Morales", phone: "700-98765", address: "Urb. Los Pinos Mz B, Warnes" },
    { key: "cust-4", name: "Consorcio Constructor del Oriente", phone: "755-43210", address: "Av. Banzer 4to Anillo, Santa Cruz" },
    { key: "cust-5", name: "Constructora Los Tajibos", phone: "780-99881", address: "Km 9 Carretera al Norte, Cotoca" },
    { key: "cust-6", name: "Distribuidora Warnes Materiales", phone: "763-12456", address: "Av. Principal Warnes #88, Warnes" },
    { key: "cust-7", name: "Urbanización Las Palmas S.R.L.", phone: "721-66778", address: "Radial 19 Doble Vía, La Paz" }
  ];

  const customerMap = new Map();
  for (const c of CUSTOMERS_DATA) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id, name')
      .eq('name', c.name)
      .maybeSingle();

    if (existing) {
      customerMap.set(c.key, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from('customers')
        .insert({
          name: c.name,
          phone: c.phone,
          address: c.address
        })
        .select('id, name')
        .single();

      if (error) {
        console.error(`Error insertando cliente ${c.name}:`, error.message);
      } else {
        customerMap.set(c.key, created.id);
      }
    }
  }
  console.log(`✓ ${customerMap.size} clientes registrados y mapeados.`);

  // 5. POBLAR PEDIDOS Y DETALLES (orders, order_items)
  console.log('\n5. Poblando Pedidos y Detalles (orders, order_items)...');
  const ORDERS_DATA = [
    {
      custKey: "cust-2",
      delivery_date: "2026-10-14",
      status: "pendiente",
      notes: "Entregar en obra en horario de la mañana | Calle Industrial #12, Zona Norte",
      items: [{ legacyBrick: "brick-1", quantity: 3000, unit_price: 1.80 }]
    },
    {
      custKey: "cust-1",
      delivery_date: "2026-10-15",
      status: "pendiente",
      notes: "Descargar con cuidado cerca al depósito | Av. Las Américas #450 (Despacho Frontera)",
      items: [{ legacyBrick: "brick-3", quantity: 5000, unit_price: 1.90 }]
    },
    {
      custKey: "cust-3",
      delivery_date: "2026-10-13",
      status: "entregado",
      notes: "Camión del cliente recogió el lote completo | Retiro en Planta Principal",
      items: [{ legacyBrick: "brick-5", quantity: 2000, unit_price: 2.10 }]
    }
  ];

  for (const ord of ORDERS_DATA) {
    const custId = customerMap.get(ord.custKey);
    if (!custId) continue;

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', custId)
      .eq('delivery_date', ord.delivery_date)
      .maybeSingle();

    let orderId = existingOrder?.id;
    if (!orderId) {
      const { data: newOrder, error: ordErr } = await supabase
        .from('orders')
        .insert({
          customer_id: custId,
          delivery_date: ord.delivery_date,
          status: ord.status,
          notes: ord.notes
        })
        .select('id')
        .single();

      if (ordErr) {
        console.error('Error insertando pedido:', ordErr.message);
        continue;
      }
      orderId = newOrder.id;

      for (const item of ord.items) {
        const brickId = legacyBrickMap[item.legacyBrick];
        if (brickId) {
          await supabase.from('order_items').insert({
            order_id: orderId,
            brick_type_id: brickId,
            quantity: item.quantity,
            unit_price: item.unit_price
          });
        }
      }
    }
  }
  console.log('✓ Pedidos y sus ítems sincronizados correctamente.');

  // 6. POBLAR VENTAS Y DETALLES (sales, sale_items)
  console.log('\n6. Poblando Ventas Directas y Facturadas (sales, sale_items)...');
  const SALES_DATA = [
    {
      key: "sale-1",
      custKey: "cust-1",
      total_amount: 9000,
      payment_method: "transferencia",
      created_at: "2026-09-25T10:30:00Z",
      items: [{ legacyBrick: "brick-1", quantity: 5000, unit_price: 1.80 }]
    },
    {
      key: "sale-2",
      custKey: "cust-2",
      total_amount: 4200,
      payment_method: "efectivo",
      created_at: "2026-09-28T14:15:00Z",
      items: [{ legacyBrick: "brick-2", quantity: 3000, unit_price: 1.40 }]
    },
    {
      key: "sale-3",
      custKey: "cust-5",
      total_amount: 12600,
      payment_method: "transferencia",
      created_at: "2026-10-02T11:00:00Z",
      items: [{ legacyBrick: "brick-1", quantity: 7000, unit_price: 1.80 }]
    },
    {
      key: "sale-4",
      custKey: "cust-6",
      total_amount: 15200,
      payment_method: "transferencia",
      created_at: "2026-10-05T16:20:00Z",
      items: [{ legacyBrick: "brick-3", quantity: 8000, unit_price: 1.90 }]
    },
    {
      key: "sale-5",
      custKey: "cust-3",
      total_amount: 9450,
      payment_method: "efectivo",
      created_at: "2026-10-08T09:45:00Z",
      items: [{ legacyBrick: "brick-5", quantity: 4500, unit_price: 2.10 }]
    },
    {
      key: "sale-6",
      custKey: "cust-4",
      total_amount: 27600,
      payment_method: "transferencia",
      created_at: "2026-10-10T15:30:00Z",
      items: [
        { legacyBrick: "brick-1", quantity: 12000, unit_price: 1.80 },
        { legacyBrick: "brick-5", quantity: 2857, unit_price: 2.10 }
      ]
    },
    {
      key: "sale-7",
      custKey: "cust-7",
      total_amount: 18500,
      payment_method: "transferencia",
      created_at: "2026-10-13T12:15:00Z",
      items: [
        { legacyBrick: "brick-17", quantity: 5000, unit_price: 2.50 },
        { legacyBrick: "brick-13", quantity: 2727, unit_price: 2.20 }
      ]
    },
    {
      key: "sale-8",
      custKey: "cust-1",
      total_amount: 14400,
      payment_method: "credito",
      created_at: "2026-10-15T10:00:00Z",
      items: [{ legacyBrick: "brick-1", quantity: 8000, unit_price: 1.80 }]
    },
    {
      key: "sale-9",
      custKey: "cust-2",
      total_amount: 11200,
      payment_method: "efectivo",
      created_at: "2026-10-17T14:40:00Z",
      items: [{ legacyBrick: "brick-9", quantity: 8000, unit_price: 1.40 }]
    }
  ];

  const salesMap = new Map();
  for (const s of SALES_DATA) {
    const custId = customerMap.get(s.custKey);
    const { data: existingSale } = await supabase
      .from('sales')
      .select('id')
      .eq('total_amount', s.total_amount)
      .eq('created_at', s.created_at)
      .maybeSingle();

    let saleId = existingSale?.id;
    if (!saleId) {
      const { data: newSale, error: sErr } = await supabase
        .from('sales')
        .insert({
          customer_id: custId,
          total_amount: s.total_amount,
          payment_method: s.payment_method,
          sold_by: ventasUser.id,
          created_at: s.created_at
        })
        .select('id')
        .single();

      if (sErr) {
        console.error(`Error insertando venta ${s.key}:`, sErr.message);
        continue;
      }
      saleId = newSale.id;

      for (const item of s.items) {
        const brickId = legacyBrickMap[item.legacyBrick];
        if (brickId) {
          await supabase.from('sale_items').insert({
            sale_id: saleId,
            brick_type_id: brickId,
            quantity: item.quantity,
            unit_price: item.unit_price
          });
        }
      }
    }
    salesMap.set(s.key, saleId);
  }
  console.log(`✓ ${salesMap.size} ventas y sus ítems sincronizados con éxito.`);

  // 7. POBLAR VACIADOS DE PRODUCCIÓN (production_batches)
  console.log('\n7. Poblando Vaciados de Producción (production_batches)...');
  const BATCHES_DATA = [
    { date: "2026-10-17", legacyBrick: "brick-1", opId: angelEmpId, shift: "mañana", qty: 3500, status: "verde", notes: "Moldeo en patio nuevo | Folio: FOL-00134" },
    { date: "2026-10-17", legacyBrick: "brick-9", opId: moisesEmpId, shift: "mañana", qty: 2600, status: "verde", notes: "Ladrillo 2H de 1ra | Folio: FOL-00133" },
    { date: "2026-10-16", legacyBrick: "brick-1", opId: angelEmpId, shift: "mañana", qty: 3800, status: "secando", notes: "En patio secando bajo sombra | Folio: FOL-00132" },
    { date: "2026-10-15", legacyBrick: "brick-3", opId: moisesEmpId, shift: "tarde", qty: 3100, status: "secando", notes: "Deshidratación óptima | Folio: FOL-00131" },
    { date: "2026-10-14", legacyBrick: "brick-1", opId: angelEmpId, shift: "mañana", qty: 4200, status: "horno", notes: "En quema continua 980°C | Folio: FOL-00130" },
    { date: "2026-10-13", legacyBrick: "brick-5", opId: moisesEmpId, shift: "mañana", qty: 3300, status: "horno", notes: "Cocción ladrillo 6H cuadrado | Folio: FOL-00129" },
    { date: "2026-10-12", legacyBrick: "brick-17", opId: angelEmpId, shift: "tarde", qty: 2900, status: "horno", notes: "Cocción lenta de tejas | Folio: FOL-00128" },
    { date: "2026-10-10", legacyBrick: "brick-1", opId: angelEmpId, shift: "mañana", qty: 4500, status: "terminado", notes: "Deshorneado seleccionado 1ra | Folio: FOL-00127" },
    { date: "2026-10-09", legacyBrick: "brick-3", opId: moisesEmpId, shift: "mañana", qty: 3200, status: "terminado", notes: "Listo en bodega para despacho | Folio: FOL-00126" },
    { date: "2026-10-08", legacyBrick: "brick-5", opId: angelEmpId, shift: "mañana", qty: 4100, status: "terminado", notes: "Estiba de bodega terminado | Folio: FOL-00125" },
    { date: "2026-10-06", legacyBrick: "brick-1", opId: moisesEmpId, shift: "tarde", qty: 3700, status: "terminado", notes: "Totalmente enfriado y clasificado | Folio: FOL-00124" },
    { date: "2026-10-05", legacyBrick: "brick-9", opId: angelEmpId, shift: "mañana", qty: 4800, status: "terminado", notes: "Despachado parcialmente | Folio: FOL-00123" },
    { date: "2026-10-03", legacyBrick: "brick-3", opId: moisesEmpId, shift: "mañana", qty: 3600, status: "terminado", notes: "Producción estándar quincenal | Folio: FOL-00122" },
    { date: "2026-10-01", legacyBrick: "brick-1", opId: angelEmpId, shift: "mañana", qty: 4000, status: "terminado", notes: "Lote inaugural del mes | Folio: FOL-00121" }
  ];

  let batchCount = 0;
  for (const b of BATCHES_DATA) {
    const brickId = legacyBrickMap[b.legacyBrick];
    if (!brickId || !b.opId) continue;

    const { data: existingBatch } = await supabase
      .from('production_batches')
      .select('id')
      .eq('production_date', b.date)
      .eq('brick_type_id', brickId)
      .eq('operator_id', b.opId)
      .eq('shift', b.shift)
      .maybeSingle();

    if (!existingBatch) {
      const { error: bErr } = await supabase
        .from('production_batches')
        .insert({
          production_date: b.date,
          brick_type_id: brickId,
          operator_id: b.opId,
          shift: b.shift,
          quantity_produced: b.qty,
          status: b.status,
          supervisor_id: superAdmin.id,
          notes: b.notes
        });

      if (bErr) {
        console.error(`Error insertando lote ${b.date}:`, bErr.message);
      } else {
        batchCount++;
      }
    } else {
      batchCount++;
    }
  }
  console.log(`✓ ${batchCount} lotes de vaciado registrados en la base de datos.`);

  // 8. POBLAR MOVIMIENTOS HISTÓRICOS DE INVENTARIO (inventory_movements)
  console.log('\n8. Poblando Movimientos Históricos de Inventario (inventory_movements)...');
  const normal1raId = legacyBrickMap['brick-1'];
  const cm25Id = legacyBrickMap['brick-3'];
  const cuadradoId = legacyBrickMap['brick-5'];

  const MOVEMENTS_DATA = [
    { brick_type_id: normal1raId, movement_type: "entrada", quantity: 4500, to_location: "bodega_terminado", from_location: "horno" },
    { brick_type_id: cm25Id, movement_type: "entrada", quantity: 3200, to_location: "bodega_terminado", from_location: "horno" },
    { brick_type_id: cuadradoId, movement_type: "entrada", quantity: 4100, to_location: "bodega_terminado", from_location: "horno" },
    { brick_type_id: normal1raId, movement_type: "salida", quantity: 12000, from_location: "bodega_terminado", to_location: null },
    { brick_type_id: normal1raId, movement_type: "salida", quantity: 5000, from_location: "bodega_terminado", to_location: null },
    { brick_type_id: cm25Id, movement_type: "salida", quantity: 8000, from_location: "bodega_terminado", to_location: null }
  ];

  for (const m of MOVEMENTS_DATA) {
    if (!m.brick_type_id) continue;
    await supabase.from('inventory_movements').insert({
      brick_type_id: m.brick_type_id,
      movement_type: m.movement_type,
      quantity: m.quantity,
      from_location: m.from_location,
      to_location: m.to_location,
      reference_type: "manual",
      created_by: superAdmin.id
    });
  }
  console.log('✓ Movimientos de inventario registrados con éxito.');

  // 9. POBLAR ANTICIPOS DE EMPLEADOS (employee_advances)
  console.log('\n9. Poblando Anticipos de Empleados (employee_advances)...');
  const ADVANCES_DATA = [
    { empId: moisesEmpId, amount: 350.00, date: "2026-09-08", reason: "Anticipo de quincena operario Moises" },
    { empId: angelEmpId, amount: 250.00, date: "2026-09-10", reason: "Anticipo quincenal Angel Salvatierra" },
    { empId: alexanderEmpId, amount: 200.00, date: "2026-09-12", reason: "Anticipo de emergencia personal Alexander" }
  ];

  // Obtener periodo de planilla existente
  const { data: pPeriod } = await supabase.from('payroll_periods').select('id').limit(1).single();
  const activePeriodId = pPeriod ? pPeriod.id : null;

  for (const adv of ADVANCES_DATA) {
    await supabase.from('employee_advances').insert({
      employee_id: adv.empId,
      period_id: activePeriodId,
      amount: adv.amount,
      advance_date: adv.date,
      reason: adv.reason,
      given_by: superAdmin.id
    });
  }
  console.log('✓ Anticipos de personal registrados.');

  // 10. POBLAR LIBRO DE CAJA GENERAL (cash_ledger)
  console.log('\n10. Poblando Libro de Caja General (cash_ledger)...');
  const CASH_DATA = [
    // Ventas
    { date: "2026-09-25", desc: "Venta directa de ladrillo King Kong (Contado)", amount: 9000, cat: "venta" },
    { date: "2026-09-28", desc: "Cobro venta ladrillo Pandereta - Constructora Norte", amount: 4200, cat: "venta" },
    { date: "2026-10-02", desc: "Cobro Venta Ladrillo 6H 1ra - Constructora Los Tajibos", amount: 12600, cat: "venta" },
    { date: "2026-10-05", desc: "Cobro Venta Ladrillo 25CM - Distribuidora Warnes", amount: 15200, cat: "venta" },
    { date: "2026-10-08", desc: "Cobro Venta Ladrillo Cuadrado - Ing. Juan Pablo Morales", amount: 9450, cat: "venta" },
    { date: "2026-10-10", desc: "Venta Mayorista Gran Escala - Consorcio del Oriente", amount: 27600, cat: "venta" },
    { date: "2026-10-13", desc: "Cobro Venta Tejas y Pisos - Urbanización Las Palmas", amount: 18500, cat: "venta" },
    { date: "2026-10-15", desc: "Venta Ladrillo 6H 1ra - Constructora Norte S.A.", amount: 14400, cat: "venta" },
    { date: "2026-10-17", desc: "Cobro Venta Ladrillo 2H - Feria de Materiales San José", amount: 11200, cat: "venta" },

    // Insumos y Leña
    { date: "2026-09-26", desc: "Compra de Leña dura tajibo para quema de hornos (Lote 1)", amount: -5200, cat: "compra_insumo" },
    { date: "2026-09-29", desc: "Compra de Arcilla greda seleccionada (4 volquetas de 12m3)", amount: -3800, cat: "compra_insumo" },
    { date: "2026-10-03", desc: "Compra de Leña seca de curupaú para Horno 2 (Lote 2)", amount: -4600, cat: "compra_insumo" },
    { date: "2026-10-06", desc: "Compra de Tierra arenosa para mezcla de moldeado (3 viajes)", amount: -2100, cat: "compra_insumo" },
    { date: "2026-10-09", desc: "Compra de Leña trozada para encendido rápido de hornos", amount: -3400, cat: "compra_insumo" },
    { date: "2026-10-11", desc: "Compra de Arcilla roja fina para acabado de tejas (3 volquetas)", amount: -3100, cat: "compra_insumo" },
    { date: "2026-10-14", desc: "Compra de Leña dura de cencerro para cámara principal", amount: -4100, cat: "compra_insumo" },
    { date: "2026-10-16", desc: "Compra de Aditivo ligante y desmoldante para extrusora", amount: -1150, cat: "compra_insumo" },

    // Combustibles y Mantenimiento
    { date: "2026-09-27", desc: "Combustible Diesel para pala cargadora frontal y tractor", amount: -2400, cat: "combustible" },
    { date: "2026-10-04", desc: "Carga de Gasolina para camioneta de supervisión de hornos", amount: -450, cat: "combustible" },
    { date: "2026-10-10", desc: "Diesel B-S50 para camión volquete de traslado interno", amount: -1850, cat: "combustible" },
    { date: "2026-09-30", desc: "Cambio de rodamientos y engrase de molino triturador", amount: -1200, cat: "mantenimiento" },
    { date: "2026-10-07", desc: "Reparación de mangueras hidráulicas de prensa extrusora", amount: -950, cat: "mantenimiento" },
    { date: "2026-10-11", desc: "Repuestos cuchillas de corte para ladrillo 6H", amount: -1450, cat: "mantenimiento" },
    { date: "2026-10-15", desc: "Mantenimiento preventivo eléctrico panel hornos", amount: -780, cat: "mantenimiento" },

    // Planillas y Anticipos
    { date: "2026-09-26", desc: "Anticipo de quincena operario Angel", amount: -150, cat: "anticipo" },
    { date: "2026-10-06", desc: "Anticipo de quincena moldeador Moisés", amount: -200, cat: "anticipo" },
    { date: "2026-10-12", desc: "Anticipo quincenal operario Angel", amount: -250, cat: "anticipo" },
    { date: "2026-10-15", desc: "Pago de quincena personal operativo fijo", amount: -3400, cat: "planilla" },

    // Servicios
    { date: "2026-10-05", desc: "Servicio de energía eléctrica trifásica planta (CRE)", amount: -3100, cat: "otro" },
    { date: "2026-10-10", desc: "Suministro de agua industrial para preparación de lodo", amount: -650, cat: "otro" },
    { date: "2026-10-14", desc: "Flete de transporte pesado de carga externa", amount: -1200, cat: "otro" }
  ];

  for (const c of CASH_DATA) {
    const { data: existingCash } = await supabase
      .from('cash_ledger')
      .select('id')
      .eq('description', c.desc)
      .eq('movement_date', c.date)
      .maybeSingle();

    if (!existingCash) {
      await supabase.from('cash_ledger').insert({
        movement_date: c.date,
        description: c.desc,
        amount: c.amount,
        category: c.cat,
        created_by: superAdmin.id
      });
    }
  }
  console.log(`✓ ${CASH_DATA.length} asientos del Libro de Caja sincronizados.`);

  // 11. POBLAR ASISTENCIA DE EMPLEADOS (employee_attendance)
  console.log('\n11. Poblando Asistencia Laboral (employee_attendance)...');
  const workDates = [
    "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15",
    "2026-10-16", "2026-10-17", "2026-10-19", "2026-10-20",
    "2026-10-21", "2026-10-22"
  ];

  let attCount = 0;
  for (const emp of employees) {
    for (const dt of workDates) {
      const { data: existingAtt } = await supabase
        .from('employee_attendance')
        .select('id')
        .eq('employee_id', emp.id)
        .eq('date', dt)
        .maybeSingle();

      if (!existingAtt) {
        await supabase.from('employee_attendance').insert({
          employee_id: emp.id,
          date: dt,
          status: "presente",
          hours_worked: 8.00,
          extra_hours: dt === "2026-10-17" ? 2.00 : 0.00,
          notes: "Jornada regular en planta"
        });
        attCount++;
      }
    }
  }
  console.log(`✓ ${attCount} registros de asistencia diaria cargados con éxito.`);

  console.log('\n================================================================');
  console.log('✓ POBLACIÓN COMPLETA Y SINCRONIZADA CON SUPABASE EXITOSAMENTE');
  console.log('================================================================\n');
}

seedDatabase().catch(err => {
  console.error('\n❌ ERROR EN EL SEEDER:', err);
  process.exit(1);
});
