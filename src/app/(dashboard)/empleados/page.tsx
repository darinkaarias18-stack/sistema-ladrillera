"use client";

import { Header } from "@/components/layout/header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { store } from "@/lib/store";
import { Employee, ContractType, PayFrequency } from "@/types/database.types";
import { useEffect, useState } from "react";
import { Plus, UserCheck, DollarSign, Calendar, FileText, CheckCircle2, X, Trash2 } from "lucide-react";
import { createEmployeeAction, deleteEmployeeAction } from "@/actions/employees";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, EmployeeInput } from "@/lib/validations/employee.schema";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: "",
      documentId: "",
      position: "Moldeador",
      hireDate: new Date().toISOString().split("T")[0],
      contractType: "destajo",
      payFrequency: "semanal",
      baseSalary: 0,
      ratePerThousand: 150,
      antiquityBonusPct: 0,
      frontierBonus: 0,
      active: true,
    },
  });

  const contractTypeWatch = watch("contractType");

  const loadData = () => {
    setEmployees(store.getEmployees(search));
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const onSubmit = async (data: EmployeeInput) => {
    store.addEmployee({
      full_name: data.fullName,
      document_id: data.documentId,
      position: data.position,
      hire_date: data.hireDate,
      contract_type: data.contractType,
      pay_frequency: data.payFrequency,
      base_salary: data.baseSalary,
      rate_per_thousand: data.ratePerThousand,
      antiquity_bonus_pct: data.antiquityBonusPct,
      frontier_bonus: data.frontierBonus,
      active: data.active,
    });
    try {
      await createEmployeeAction(data);
    } catch (e) {
      console.error(e);
    }
    setIsModalOpen(false);
    reset();
    loadData();
  };

  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    store.deleteEmployee(employeeToDelete.id);
    try {
      await deleteEmployeeAction(employeeToDelete.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
      setEmployeeToDelete(null);
      loadData();
    }
  };

  const pageSize = 10;
  const paginated = employees.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(employees.length / pageSize) || 1;

  const calculateAntiquity = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return formatDistanceToNowStrict(date, { locale: es, addSuffix: false });
    } catch (e) {
      return "Desconocido";
    }
  };

  return (
    <>
      <Header title="Gestión de Empleados & Operarios" />

      <div className="p-6 space-y-6">
        {/* Banner informativo de modalidades */}
        <div className="bg-gradient-to-r from-orange-900 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-orange-200">Modalidades de Trabajo en Fábrica</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              El personal a <span className="text-orange-400 font-bold">DESTAJO</span> (ej: Maestros Moldeadores) liquida su planilla semanalmente según los ladrillos producidos. El personal <span className="text-orange-400 font-bold">FIJO</span> cobra según Haber Básico mensual + bonos.
            </p>
          </div>
          <button
            id="btn-registrar-empleado"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition shadow-md whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Empleado</span>
          </button>
        </div>

        {/* Tabla Toolbar & Contenido */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <DataTableToolbar onSearch={setSearch} placeholder="Buscar por nombre, CI o cargo..." />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3.5">Empleado</th>
                  <th className="p-3.5">CI</th>
                  <th className="p-3.5">Cargo</th>
                  <th className="p-3.5">Ingreso & Antigüedad</th>
                  <th className="p-3.5">Tipo Contrato</th>
                  <th className="p-3.5">Frecuencia Pago</th>
                  <th className="p-3.5 text-right">Sueldo</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900 flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {emp.full_name.charAt(0)}
                      </div>
                      <span>{emp.full_name}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{emp.document_id}</td>
                    <td className="p-3.5 text-slate-700 font-medium">{emp.position}</td>
                    <td className="p-3.5">
                      <div className="text-slate-800 font-medium">
                        {new Date(emp.hire_date).toLocaleDateString("es-BO")}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {calculateAntiquity(emp.hire_date)} en la empresa
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          emp.contract_type === "destajo"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {emp.contract_type}
                      </span>
                    </td>
                    <td className="p-3.5 capitalize text-slate-600">{emp.pay_frequency}</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {emp.contract_type === "destajo" ? (
                        <span className="text-amber-700">
                          Bs. {emp.rate_per_thousand.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-800">
                          Bs. {emp.base_salary.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          emp.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {emp.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        id={`btn-delete-${emp.id}`}
                        type="button"
                        onClick={() => setEmployeeToDelete(emp)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer inline-flex items-center justify-center"
                        title={`Eliminar a ${emp.full_name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DataTablePagination
            page={page}
            totalPages={totalPages}
            totalItems={employees.length}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Modal para Crear Empleado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800">Registrar Nuevo Empleado</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                  <input
                    {...register("fullName")}
                    type="text"
                    placeholder="Ej. Angel M. Torres"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CI *</label>
                  <input
                    {...register("documentId")}
                    type="text"
                    placeholder="CI-4589211"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  {errors.documentId && <p className="text-red-500 text-xs mt-1">{errors.documentId.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo u Ocupación *</label>
                  <input
                    {...register("position")}
                    type="text"
                    placeholder="Ej: Maestro Moldeador"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Contrato</label>
                  <select
                    {...register("contractType")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="destajo">Destajo</option>
                    <option value="fijo">Fijo</option>
                    <option value="temporal">Temporal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frecuencia de Pago</label>
                  <select
                    {...register("payFrequency")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                  </select>
                </div>

                {contractTypeWatch === "destajo" ? (
                  <div className="col-span-2 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Sueldo (Bs.) *
                        </label>
                        <input
                          {...register("baseSalary", {
                            setValueAs: (v) => (v === "" || isNaN(v) ? 0 : Number(v)),
                          })}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-semibold focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-[10px] text-slate-500 block mt-0.5">Sueldo base fijo (opcional 0)</span>
                        {errors.baseSalary && <p className="text-red-500 text-xs mt-1">{errors.baseSalary.message}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">
                          Tarifa por Millar (Bs.) *
                        </label>
                        <input
                          {...register("ratePerThousand", {
                            setValueAs: (v) => (v === "" || isNaN(v) ? 0 : Number(v)),
                          })}
                          type="number"
                          step="0.01"
                          placeholder="150"
                          className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white font-bold text-amber-900 focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-[10px] text-amber-700 block mt-0.5">Pago por cada 1,000 ladrillos</span>
                        {errors.ratePerThousand && <p className="text-red-500 text-xs mt-1">{errors.ratePerThousand.message}</p>}
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                      ℹ️ El contrato al destajo computa el sueldo base más el total producido por millar en planta.
                    </p>
                  </div>
                ) : (
                  <div className="col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Sueldo (Bs.) *
                      </label>
                      <input
                        {...register("baseSalary", {
                          setValueAs: (v) => (v === "" || isNaN(v) ? 0 : Number(v)),
                        })}
                        type="number"
                        step="0.01"
                        placeholder="3800"
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white font-semibold focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">Sueldo mensual fijo</span>
                      {errors.baseSalary && <p className="text-red-500 text-xs mt-1">{errors.baseSalary.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bono Antigüedad (%)
                      </label>
                      <input
                        {...register("antiquityBonusPct", {
                          setValueAs: (v) => (v === "" || isNaN(v) ? 0 : Number(v)),
                        })}
                        type="number"
                        step="0.01"
                        placeholder="5"
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">% por antigüedad</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bono Frontera (Bs.)
                      </label>
                      <input
                        {...register("frontierBonus", {
                          setValueAs: (v) => (v === "" || isNaN(v) ? 0 : Number(v)),
                        })}
                        type="number"
                        step="0.01"
                        placeholder="200"
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">Monto fijo en Bs.</span>
                    </div>
                  </div>
                )}
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
                  Guardar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-red-50">
              <div className="flex items-center space-x-2 text-red-700 font-bold text-sm">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Eliminar Empleado de Nómina</span>
              </div>
              <button
                onClick={() => setEmployeeToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-700">
                ¿Estás seguro de que deseas eliminar a{" "}
                <span className="font-bold text-slate-900">{employeeToDelete.full_name}</span>{" "}
                ({employeeToDelete.position}) de la nómina?
              </p>
              <p className="text-xs text-slate-500">
                Esta acción removerá al empleado inmediatamente de la nómina y de las opciones de usuarios.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium text-xs hover:bg-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs shadow-sm transition cursor-pointer"
              >
                {isDeleting ? "Eliminando..." : "Eliminar Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
