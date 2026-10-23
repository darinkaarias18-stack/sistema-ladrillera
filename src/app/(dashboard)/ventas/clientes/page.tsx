"use client";

import { Header } from "@/components/layout/header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { store } from "@/lib/store";
import { Customer, CityDiscount } from "@/types/database.types";
import { useEffect, useState } from "react";
import { Plus, Users, X, Phone, MapPin, Percent, Settings2, CheckCircle2, Tag, Building2, Trash2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { canEditOrDelete } from "@/lib/role-validator";
import { getCurrentUserSession } from "@/actions/auth";

interface CustomerInput {
  name: string;
  phone: string;
  address: string;
  city: string;
  department: string;
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cityDiscounts, setCityDiscounts] = useState<CityDiscount[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("superadmin");

  // Formulario de nuevo/editar descuento por ciudad
  const [discountForm, setDiscountForm] = useState({
    city: "",
    discount_percentage: 5,
    description: "",
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerInput>({
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      city: "Santa Cruz",
      department: "Santa Cruz",
    },
  });

  const selectedCity = watch("city");

  const loadData = () => {
    let list = store.getCustomers();
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return b.created_at.localeCompare(a.created_at);
      }
      return 0;
    });
    setCustomers(list);
    setCityDiscounts(store.getCityDiscounts());
  };

  useEffect(() => {
    loadData();

    const fetchRole = async () => {
      try {
        const session = await getCurrentUserSession();
        if (session && session.role) {
          setCurrentUserRole(session.role);
        } else {
          setCurrentUserRole(store.getCurrentRole());
        }
      } catch (e) {
        setCurrentUserRole(store.getCurrentRole());
      }
    };
    fetchRole();

    const handleRoleChanged = (e: any) => {
      const newRole = e?.detail || store.getCurrentRole();
      setCurrentUserRole(newRole);
    };

    window.addEventListener("erp_role_changed", handleRoleChanged);
    return () => {
      window.removeEventListener("erp_role_changed", handleRoleChanged);
    };
  }, [search]);

  const allowEditOrDelete = canEditOrDelete(currentUserRole);

  const openCreateModal = () => {
    setEditingCustomer(null);
    reset({
      name: "",
      phone: "",
      address: "",
      city: "Santa Cruz",
      department: "Santa Cruz",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    if (!allowEditOrDelete) return;
    setEditingCustomer(cust);
    setValue("name", cust.name);
    setValue("phone", cust.phone || "");
    setValue("address", cust.address || "");
    setValue("city", cust.city || "Santa Cruz");
    setValue("department", cust.department || "Santa Cruz");
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    if (!allowEditOrDelete) return;
    if (window.confirm(`¿Estás seguro de eliminar al cliente "${cust.name}"? Esta acción no se puede deshacer.`)) {
      store.deleteCustomer(cust.id);
      try {
        const supabase = createClient();
        await supabase.from("customers").delete().or(`name.eq.${cust.name},id.eq.${cust.id}`);
      } catch (err) {
        console.error("Error al sincronizar eliminación con Supabase:", err);
      }
      loadData();
    }
  };

  const onSubmit = async (data: CustomerInput) => {
    if (editingCustomer) {
      store.updateCustomer(editingCustomer.id, {
        name: data.name,
        phone: data.phone,
        address: data.address,
        city: data.city || "Santa Cruz",
        department: data.department || "Santa Cruz",
      });
      try {
        const supabase = createClient();
        await supabase.from("customers").update({
          name: data.name,
          phone: data.phone,
          address: `${data.address || ""}${data.city ? `, ${data.city}` : ""}`.trim()
        }).or(`name.eq.${editingCustomer.name},id.eq.${editingCustomer.id}`);
      } catch (err) {
        console.error("Error al actualizar cliente en Supabase:", err);
      }
    } else {
      store.addCustomer({
        name: data.name,
        phone: data.phone,
        address: data.address,
        city: data.city || "Santa Cruz",
        department: data.department || "Santa Cruz",
      });
      try {
        const supabase = createClient();
        await supabase.from("customers").insert({
          name: data.name,
          phone: data.phone,
          address: `${data.address || ""}${data.city ? `, ${data.city}` : ""}`.trim()
        });
      } catch (err) {
        console.error("Error al insertar cliente en Supabase:", err);
      }
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
    reset({
      name: "",
      phone: "",
      address: "",
      city: "Santa Cruz",
      department: "Santa Cruz",
    });
    loadData();
  };

  // Guardar descuento por ciudad
  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.city.trim()) {
      alert("Por favor ingresa el nombre de la ciudad.");
      return;
    }
    store.saveCityDiscount(
      discountForm.city.trim(),
      Number(discountForm.discount_percentage),
      discountForm.description.trim()
    );
    setDiscountForm({ city: "", discount_percentage: 5, description: "" });
    loadData();
  };

  const handleDeleteDiscount = (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este descuento regional?")) {
      store.deleteCityDiscount(id);
      loadData();
    }
  };

  const pageSize = 10;
  const paginated = customers.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(customers.length / pageSize) || 1;

  // Descuento aplicable a la ciudad actualmente seleccionada en el formulario de cliente
  const currentCityDiscount = store.getDiscountForCity(selectedCity);

  return (
    <>
      <Header title="Gestión de Clientes" />

      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-orange-900 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-orange-200">Directorio de Clientes</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Administra la base de datos de clientes, empresas constructoras y ferreterías con asignación de ciudad y descuentos comerciales regionales aplicados al generar pedidos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsDiscountModalOpen(true)}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg font-semibold text-xs transition shadow-md border border-slate-700 cursor-pointer"
            >
              <Percent className="w-4 h-4 text-emerald-400" />
              <span>Configurar Descuentos por Ciudad</span>
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg font-semibold text-xs transition shadow-md whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Cliente</span>
            </button>
          </div>
        </div>

        {/* Tabla Toolbar & Contenido */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <DataTableToolbar onSearch={setSearch} placeholder="Buscar por nombre, ciudad, teléfono o dirección..." />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3.5">Cliente / Razón Social</th>
                  <th className="p-3.5">Teléfono / Celular</th>
                  <th className="p-3.5">Dirección</th>
                  <th className="p-3.5">Ciudad</th>
                  {allowEditOrDelete && (
                    <th className="p-3.5 text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={allowEditOrDelete ? 5 : 4} className="p-8 text-center text-slate-400">
                      No se encontraron clientes.
                    </td>
                  </tr>
                ) : (
                  paginated.map((cust) => {
                    const cityName = cust.city || "Santa Cruz";
                    const discountPct = store.getDiscountForCity(cityName);

                    return (
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
                        {/* COLUMNA CIUDAD (CON DESCUENTO REGIONAL ASOCIADO) */}
                        <td className="p-3.5 text-slate-700">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{cityName}</span>
                            {discountPct > 0 ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300"
                                title={`Descuento automático del ${discountPct}% en pedidos`}
                              >
                                <Tag className="w-3 h-3 mr-1 text-emerald-600" />
                                -{discountPct}% desc.
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400 bg-slate-100">
                                Tarifa base
                              </span>
                            )}
                          </div>
                        </td>
                        {allowEditOrDelete && (
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => openEditModal(cust)}
                                className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar Cliente"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(cust)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar Cliente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
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

      {/* MODAL 1: REGISTRAR NUEVO CLIENTE (CON CAMPO CIUDAD) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-slate-800">
                  {editingCustomer ? "Editar Datos del Cliente" : "Registrar Nuevo Cliente"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo o Razón Social *</label>
                <input
                  {...register("name", { required: "El nombre es obligatorio" })}
                  type="text"
                  placeholder="Ej. Constructora Norte S.A."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teléfono / Celular</label>
                <input
                  {...register("phone")}
                  type="text"
                  placeholder="Ej. 78912345"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección</label>
                <input
                  {...register("address")}
                  type="text"
                  placeholder="Ej. Av. Panamericana #123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* SELECCIÓN DE CIUDAD CON DESCUENTO AUTOMÁTICO */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Ciudad de Entrega / Despacho *</label>
                  <button
                    type="button"
                    onClick={() => setIsDiscountModalOpen(true)}
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    + Gestionar Descuentos
                  </button>
                </div>
                <select
                  {...register("city", { required: "La ciudad es obligatoria" })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {cityDiscounts.map((cd) => (
                    <option key={cd.id} value={cd.city}>
                      {cd.city} {cd.discount_percentage > 0 ? `(${cd.discount_percentage}% de descuento)` : "(Tarifa base)"}
                    </option>
                  ))}
                  <option value="Otra Ciudad">Otra Ciudad...</option>
                </select>

                {currentCityDiscount > 0 ? (
                  <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Esta ciudad cuenta con un <strong>{currentCityDiscount}% de descuento automático</strong> que se aplicará en sus pedidos.
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">Tarifa base estándar sin descuento regional.</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Departamento</label>
                <select
                  {...register("department")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white"
                >
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
                  className="px-5 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingCustomer ? "Guardar Cambios" : "Guardar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURACIÓN DE DESCUENTOS POR CIUDAD */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
              <div className="flex items-center space-x-2">
                <Percent className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">Descuentos Comerciales por Ciudad</h3>
                  <p className="text-[11px] text-slate-300">
                    Define el % de descuento por flete/zona que se aplicará automáticamente al generar pedidos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDiscountModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              {/* Formulario rápido para agregar o actualizar descuento */}
              <form onSubmit={handleSaveDiscount} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Plus className="w-4 h-4 text-orange-600" />
                  <span>Agregar o Actualizar Descuento de Ciudad</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nombre de la Ciudad *</label>
                    <input
                      type="text"
                      placeholder="Ej. Montero, Warnes..."
                      value={discountForm.city}
                      onChange={(e) => setDiscountForm({ ...discountForm, city: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Porcentaje de Descuento (%) *</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={discountForm.discount_percentage}
                      onChange={(e) => setDiscountForm({ ...discountForm, discount_percentage: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Descripción / Motivo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Descuento regional por volumen de transporte"
                    value={discountForm.description}
                    onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Guardar Descuento</span>
                  </button>
                </div>
              </form>

              {/* Lista actual de descuentos configurados */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  Ciudades con Descuento Configurado ({cityDiscounts.length})
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {cityDiscounts.map((cd) => (
                    <div key={cd.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800 text-xs">{cd.city}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            cd.discount_percentage > 0
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            {cd.discount_percentage > 0 ? `${cd.discount_percentage}% de descuento` : "Tarifa base (0%)"}
                          </span>
                        </div>
                        {cd.description && (
                          <p className="text-[10px] text-slate-400 mt-0.5 ml-5">{cd.description}</p>
                        )}
                      </div>

                      {allowEditOrDelete && (
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDiscountForm({
                                city: cd.city,
                                discount_percentage: cd.discount_percentage,
                                description: cd.description || "",
                              });
                            }}
                            className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-[11px] font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDiscount(cd.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 cursor-pointer"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
