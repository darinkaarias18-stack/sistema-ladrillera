"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Factory,
  Boxes,
  ShoppingCart,
  Receipt,
  Wallet,
  BarChart3,
  ShieldCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  Flame,
  Layers,
  CalendarDays,
  FileText
} from "lucide-react";
import { UserRole } from "@/types/database.types";
import { useState, useEffect } from "react";
import { store } from "@/lib/store";

interface SubNavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  allowedRoles: UserRole[];
  subItems?: SubNavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    allowedRoles: ["superadmin", "admin", "produccion", "ventas"],
  },
  {
    name: "Empleados",
    icon: Users,
    allowedRoles: ["superadmin", "admin", "produccion"],
    subItems: [
      {
        name: "Nómina",
        href: "/empleados",
        icon: Users,
      },
      {
        name: "Asistencia",
        href: "/empleados/asistencia",
        icon: CalendarDays,
      },
      {
        name: "Planillas",
        href: "/planillas",
        icon: Receipt,
      },
      {
        name: "Finiquito",
        href: "/empleados/finiquito",
        icon: FileText,
      }
    ],
  },
  {
    name: "Producción",
    icon: Factory,
    allowedRoles: ["superadmin", "admin", "produccion", "ventas"],
    subItems: [
      {
        name: "Vaciados",
        href: "/produccion",
        icon: Flame,
      },
      {
        name: "Inventario",
        href: "/inventario",
        icon: Boxes,
      },
      {
        name: "Catálogo de Productos",
        href: "/produccion/catalogo",
        icon: Layers,
      },
    ],
  },
  {
    name: "Ventas & Pedidos",
    href: "/ventas",
    icon: ShoppingCart,
    allowedRoles: ["superadmin", "admin", "ventas"],
  },
  {
    name: "Caja General",
    href: "/caja",
    icon: Wallet,
    allowedRoles: ["superadmin", "admin", "ventas"],
  },
  {
    name: "Reportes",
    href: "/reportes",
    icon: BarChart3,
    allowedRoles: ["superadmin", "admin", "produccion", "ventas"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [currentRole, setCurrentRoleState] = useState<UserRole>(store.getCurrentRole());
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Producción: true,
    Empleados: true,
  });

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (item.subItems) {
        const isActive = item.subItems.some((sub) =>
          sub.href === "/produccion" || sub.href === "/empleados"
            ? pathname === sub.href
            : pathname.startsWith(sub.href)
        );
        if (isActive) {
          setOpenMenus((prev) => ({ ...prev, [item.name]: true }));
        }
      }
    });
  }, [pathname]);

  const handleRoleChange = (role: UserRole) => {
    store.setCurrentRole(role);
    setCurrentRoleState(role);
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shadow-xl min-h-screen print:hidden">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl brick-gradient flex items-center justify-center text-white shadow-lg shadow-orange-950/50">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">
              INCEGUA S.R.L.
            </h1>
            <p className="text-xs text-orange-400 font-medium">ERP de Operaciones</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isAllowed = item.allowedRoles.includes(currentRole);
            if (!isAllowed) return null;

            // Si es la sección desplegable
            if (item.subItems) {
              const isActive = item.subItems.some((sub) =>
                sub.href === "/produccion" || sub.href === "/empleados"
                  ? pathname === sub.href
                  : pathname.startsWith(sub.href)
              );
              const isOpen = openMenus[item.name];
              const Icon = item.icon;

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-orange-600/20 text-orange-400 font-bold border border-orange-500/30"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${isActive ? "text-orange-400" : "text-slate-400"}`} />
                      <span>{item.name}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Sub-items desplegables */}
                  {isOpen && (
                    <div className="pl-4 space-y-1 pt-0.5">
                      {item.subItems.map((sub) => {
                        const isSubActive =
                          sub.href === "/produccion" || sub.href === "/empleados"
                            ? pathname === sub.href
                            : pathname.startsWith(sub.href);
                        const SubIcon = sub.icon;

                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                              isSubActive
                                ? "bg-orange-600 text-white shadow-xs font-bold"
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                            }`}
                          >
                            <SubIcon className={`w-4 h-4 ${isSubActive ? "text-white" : "text-slate-400"}`} />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Para items normales (sin subItems)
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href!));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-orange-600 text-white shadow-md shadow-orange-950/40"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Role Switcher Sandbox footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-orange-400" />
          <span>Simulador de Rol (RLS)</span>
        </div>
        <select
          value={currentRole}
          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
        >
          <option value="superadmin">👑 SuperAdmin (Todo)</option>
          <option value="admin">🏢 Admin (Operativo)</option>
          <option value="produccion">🏗️ Producción</option>
          <option value="ventas">📈 Ventas</option>
        </select>
      </div>
    </aside>
  );
}
