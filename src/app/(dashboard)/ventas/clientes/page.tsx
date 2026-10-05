"use client";

import { Header } from "@/components/layout/header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { store } from "@/lib/store";
import { Customer } from "@/types/database.types";
import { useEffect, useState } from "react";
import { Plus, Users, X, Phone, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";

interface CustomerInput {
  name: string;
  phone: string;
  address: string;
  department: string;
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerInput>({
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      department: "Santa Cruz",
    },
  });

  const loadData = () => {
    let list = store.getCustomers();
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }
    // sort by creation date (newest first)
    list.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return b.created_at.localeCompare(a.created_at);
      }
      return 0;
    });
    setCustomers(list);
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const onSubmit = (data: CustomerInput) => {
    store.addCustomer({
      name: data.name,
      phone: data.phone,
      address: data.address,
      department: data.department,
    });
    setIsModalOpen(false);
    reset();
    loadData();
  };

  const pageSize = 10;
  const paginated = customers.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(customers.length / pageSize) || 1;

  return (
    <>
      <Header title="Gestión de Clientes" />

      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-orange-900 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-orange-200">Directorio de Clientes</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Administra la base de datos de clientes, empresas constructoras y ferreterías con las que trabaja la fábrica.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition shadow-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Cliente</span>
          </button>
        </div>

        {/* Tabla Toolbar & Contenido */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <DataTableToolbar onSearch={setSearch} placeholder="Buscar por nombre, teléfono o dirección..." />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3.5">Cliente / Razón Social</th>
                  <th className="p-3.5">Teléfono / Celular</th>
                  <th className="p-3.5">Dirección</th>
                  <th className="p-3.5">Depto.</th>
                  <th className="p-3.5">Fecha de Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No se encontraron clientes.
                    </td>
                  </tr>
                ) : (
                  paginated.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{cust.name}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {cust.phone ? (
                          <div className="flex items-center space-x-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cust.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No registrado</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">
                        {cust.address ? (
                          <div className="flex items-center space-x-1.5" title={cust.address}>
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{cust.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No registrada</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {cust.department ? (
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold">{cust.department}</span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {cust.created_at ? new Date(cust.created_at).toLocaleDateString("es-BO") : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DataTablePagination
            page={page}
            totalPages={totalPages}
            totalItems={customers.length}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Modal para Crear Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800">Registrar Nuevo Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo o Razón Social *</label>
                <input
                  {...register("name", { required: "El nombre es obligatorio" })}
                  type="text"
                  placeholder="Ej. Constructora Norte S.A."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / Celular</label>
                <input
                  {...register("phone")}
                  type="text"
                  placeholder="Ej. 78912345"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección</label>
                <input
                  {...register("address")}
                  type="text"
                  placeholder="Ej. Av. Panamericana #123"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Departamento</label>
                <select
                  {...register("department")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Santa Cruz">Santa Cruz</option>
                  <option value="La Paz">La Paz</option>
                  <option value="Cochabamba">Cochabamba</option>
                  <option value="Oruro">Oruro</option>
                  <option value="Potosí">Potosí</option>
                  <option value="Chuquisaca">Chuquisaca</option>
                  <option value="Tarija">Tarija</option>
                  <option value="Beni">Beni</option>
                  <option value="Pando">Pando</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
