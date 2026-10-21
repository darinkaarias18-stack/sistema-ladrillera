import { UserRole } from "@/types/database.types";

export interface SystemSubModule {
  id: string;
  name: string;
  href: string;
  description?: string;
}

export interface SystemModuleGroup {
  id: string;
  name: string;
  href?: string;
  description?: string;
  subModules?: SystemSubModule[];
}

export const SYSTEM_MODULES: SystemModuleGroup[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    href: "/",
    description: "Panel principal con indicadores y resumen general"
  },
  {
    id: "empleados",
    name: "Empleados",
    description: "Gestión de personal, asistencia y planillas",
    subModules: [
      { id: "empleados_nomina", name: "Nómina de Empleados", href: "/empleados", description: "Directorio y contratos" },
      { id: "empleados_asistencia", name: "Control de Asistencia", href: "/empleados/asistencia", description: "Marcado y horas trabajadas" },
      { id: "empleados_planillas", name: "Planillas Salriales", href: "/planillas", description: "Cálculo de sueldos y aportes" },
      { id: "empleados_finiquito", name: "Finiquito", href: "/empleados/finiquito", description: "Liquidaciones laborales" },
    ]
  },
  {
    id: "produccion",
    name: "Producción",
    description: "Operaciones de planta, hornos e inventarios",
    subModules: [
      { id: "produccion_vaciados", name: "Vaciados Diarios", href: "/produccion", description: "Registro de moldeo y cortado" },
      { id: "produccion_hornos", name: "Ingreso y Salida de Hornos", href: "/produccion/hornos", description: "Quema y enfriado de ladrillos" },
      { id: "produccion_patio", name: "Patio de Entregas", href: "/produccion/patio-entregas", description: "Control de stock diario y despachos" },
      { id: "produccion_inventario", name: "Inventario General", href: "/inventario", description: "Kardex y existencias físicas" },
      { id: "produccion_catalogo", name: "Catálogo de Productos", href: "/produccion/catalogo", description: "Modelos, precios y costos" },
    ]
  },
  {
    id: "pedidos_entregas",
    name: "Pedidos & Entregas",
    description: "Ventas comerciales, despachos y cartera de clientes",
    subModules: [
      { id: "pedidos_clientes", name: "Clientes", href: "/ventas/clientes", description: "Gestión de clientes y descuentos por ciudad" },
      { id: "pedidos_pedidos", name: "Pedidos", href: "/ventas/pedidos", description: "Emisión de órdenes y notas de venta" },
      { id: "pedidos_entregas", name: "Entregas", href: "/entregas", description: "Logística y confirmación de recepción" },
    ]
  },
  {
    id: "caja",
    name: "Libro de Compra y Venta",
    href: "/caja",
    description: "Arqueo de caja, ventas en efectivo y compras de insumos"
  },
  {
    id: "reportes",
    name: "Reportes",
    href: "/reportes",
    description: "Estadísticas ejecutivas de producción, finanzas y ventas"
  }
];

export function getAllModuleHrefs(): string[] {
  const hrefs: string[] = [];
  SYSTEM_MODULES.forEach(group => {
    if (group.href) hrefs.push(group.href);
    if (group.subModules) {
      group.subModules.forEach(sub => hrefs.push(sub.href));
    }
  });
  return hrefs;
}

export const DEFAULT_ROLE_MODULES: Record<UserRole, string[]> = {
  superadmin: getAllModuleHrefs(),
  admin: getAllModuleHrefs(),
  cajero: [
    "/",
    "/ventas/clientes",
    "/ventas/pedidos",
    "/entregas",
    "/caja",
    "/reportes"
  ],
  entrega_recepcion: [
    "/",
    "/produccion/patio-entregas",
    "/inventario",
    "/ventas/clientes",
    "/ventas/pedidos",
    "/entregas",
    "/reportes"
  ],
  ing_produccion: [
    "/",
    "/empleados",
    "/empleados/asistencia",
    "/produccion",
    "/produccion/hornos",
    "/produccion/patio-entregas",
    "/inventario",
    "/produccion/catalogo",
    "/reportes"
  ],
  produccion: [
    "/",
    "/produccion",
    "/produccion/hornos",
    "/produccion/patio-entregas",
    "/inventario"
  ],
  ventas: [
    "/",
    "/ventas/clientes",
    "/ventas/pedidos",
    "/entregas",
    "/caja"
  ]
};
