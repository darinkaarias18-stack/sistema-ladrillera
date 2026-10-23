"use client"

import { useState, useEffect } from "react"
import { Profile, UserRole, Employee } from "@/types/database.types"
import { store } from "@/lib/store"
import { createUserAction, deleteUserAction, updateUserAction } from "./actions"
import { AuditLogger } from "@/lib/audit-logger"
import {
  Plus,
  Search,
  UserPlus,
  Mail,
  Briefcase,
  Shield,
  KeyRound,
  Loader2,
  X,
  Pencil,
  Trash2,
  RotateCcw,
  CheckSquare,
  Square,
  ShieldAlert,
  ShieldCheck
} from "lucide-react"
import { getCurrentUserSession } from "@/actions/auth"
import {
  SYSTEM_MODULES,
  DEFAULT_ROLE_MODULES,
  getAllModuleHrefs
} from "@/lib/modules-config"

interface UsersClientProps {
  initialProfiles: Profile[]
  currentUserRole: string
  employees?: Employee[]
}

export function UsersClient({ initialProfiles, currentUserRole, employees: propEmployees }: UsersClientProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [employeeList, setEmployeeList] = useState<Employee[]>(
    propEmployees && propEmployees.length > 0 ? propEmployees : store.getEmployees().filter(e => e.active)
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState("")
  
  // Edit & Delete states
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Form states for employee, full name & position
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
  const [fullNameValue, setFullNameValue] = useState<string>("")
  const [positionValue, setPositionValue] = useState<string>("")
  const [emailValue, setEmailValue] = useState<string>("")
  const [passwordValue, setPasswordValue] = useState<string>("")

  // Form states for modules & role
  const [selectedRole, setSelectedRole] = useState<string>("cajero")
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeRole, setActiveRole] = useState<string>(
    currentUserRole?.toLowerCase() === "superadmin" ? "superadmin" : (currentUserRole || store.getCurrentRole())
  )

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const session = await getCurrentUserSession();
        if (session && session.role) {
          setActiveRole(session.role);
        }
      } catch (err) {
        console.error("Error fetching session role:", err);
      }
    };
    fetchUserRole();

    const handleRoleUpdate = (e: any) => {
      const newRole = e?.detail || store.getCurrentRole();
      setActiveRole(newRole);
    };
    window.addEventListener("erp_role_changed", handleRoleUpdate);
    return () => {
      window.removeEventListener("erp_role_changed", handleRoleUpdate);
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setEmployeeList(store.getEmployees().filter((e) => e.active))
    }
    refresh()
    window.addEventListener("erp_employees_updated", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("erp_employees_updated", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])
  
  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.position?.toLowerCase().includes(search.toLowerCase()) ||
    p.role?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const finalFullName = fullNameValue.trim()
    const finalPosition = positionValue.trim()

    if (!finalFullName) {
      setError("Debes seleccionar un empleado de la nómina de empleados.")
      setLoading(false)
      return
    }
    
    const formData = new FormData(e.currentTarget)
    formData.set("allowed_modules", JSON.stringify(selectedModules))
    formData.set("full_name", finalFullName)
    formData.set("position", finalPosition)
    formData.set("email", emailValue.trim())
    if (passwordValue.trim()) {
      formData.set("password", passwordValue.trim())
    }
    
    try {
      let result;
      if (editingProfile) {
        formData.append("id", editingProfile.id)
        result = await updateUserAction(formData)
      } else {
        result = await createUserAction(formData)
      }

      if (result.error) {
        setError(result.error)
      } else {
        if (editingProfile) {
          const prevRole = editingProfile.role;
          const newRole = formData.get("role") as string;
          const hasNewPassword = !!passwordValue.trim();
          AuditLogger.log({
            action: prevRole !== newRole ? "ROLE_CHANGE" : "UPDATE",
            severity: prevRole !== newRole ? "critical" : "high",
            module: "usuarios",
            description: `Modificación de usuario: ${finalFullName} (${emailValue.trim() || editingProfile.email}). ${hasNewPassword ? "Contraseña restablecida. " : ""}Rol: "${newRole}"`,
            entity_id: editingProfile.id,
            details: { previous_role: prevRole, new_role: newRole, full_name: finalFullName, position: finalPosition, email: emailValue.trim(), password_changed: hasNewPassword }
          });
        } else {
          AuditLogger.log({
            action: "CREATE",
            severity: "high",
            module: "usuarios",
            description: `Creación de nuevo usuario: ${finalFullName} (${emailValue.trim()}) con rol "${formData.get("role")}"`,
            entity_id: emailValue.trim(),
            details: { full_name: finalFullName, email: emailValue.trim(), role: formData.get("role"), position: finalPosition }
          });
        }

        setIsModalOpen(false)
        setEditingProfile(null)
        window.location.reload()
      }
    } catch (err: any) {
      setError("Error inesperado al guardar el usuario.")
    } finally {
      setLoading(false)
    }
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    const id = userToDelete.id
    const name = userToDelete.full_name || userToDelete.email

    const isTargetSuper = userToDelete.role === "superadmin" || userToDelete.email?.toLowerCase() === "darinka.arias18@gmail.com"
    if (isTargetSuper) {
      alert("La cuenta de Super Administrador está protegida y jamás puede ser eliminada.")
      setUserToDelete(null)
      return
    }

    setIsDeleting(id)
    try {
      const result = await deleteUserAction(id)
      if (result.error) {
        alert(result.error)
      } else {
        AuditLogger.log({
          action: "DELETE",
          severity: "critical",
          module: "usuarios",
          description: `Eliminación permanente de usuario "${name || id}"`,
          entity_id: id,
        })
        setProfiles((prev) => prev.filter((p) => p.id !== id))
        setUserToDelete(null)
        window.location.reload()
      }
    } catch (err) {
      alert("Error al eliminar el usuario.")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDelete = (profile: Profile) => {
    const isTargetSuper = profile.role === "superadmin" || profile.email?.toLowerCase() === "darinka.arias18@gmail.com"
    if (isTargetSuper) {
      alert("La cuenta de Super Administrador está protegida y jamás puede ser eliminada.")
      return
    }
    setUserToDelete(profile)
  }

  const openEditModal = (profile: Profile) => {
    const isSuper = profile.role === "superadmin" || profile.email?.toLowerCase() === "darinka.arias18@gmail.com"
    if (isSuper) {
      alert("La cuenta de Super Administrador está protegida y no permite edición.")
      return
    }
    const currentEmployees = store.getEmployees().filter((e) => e.active)
    setEmployeeList(currentEmployees)
    setEditingProfile(profile)
    setSelectedRole(profile.role)
    const initialMods = profile.allowed_modules && profile.allowed_modules.length > 0
      ? profile.allowed_modules
      : (DEFAULT_ROLE_MODULES[profile.role as UserRole] || getAllModuleHrefs())
    setSelectedModules(initialMods)

    const matchedEmp = currentEmployees.find(
      (e) => e.full_name.toLowerCase() === (profile.full_name || "").toLowerCase()
    )
    if (matchedEmp) {
      setSelectedEmployeeId(matchedEmp.id)
      setFullNameValue(matchedEmp.full_name)
      setPositionValue(matchedEmp.position || profile.position || "")
    } else {
      setSelectedEmployeeId("")
      setFullNameValue(profile.full_name || "")
      setPositionValue(profile.position || "")
    }

    setEmailValue(profile.email || "")
    setPasswordValue("")

    setError(null)
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    const currentEmployees = store.getEmployees().filter((e) => e.active)
    setEmployeeList(currentEmployees)
    setEditingProfile(null)
    const initialRole = "cajero"
    setSelectedRole(initialRole)
    setSelectedModules(DEFAULT_ROLE_MODULES[initialRole] || [])
    setSelectedEmployeeId("")
    setFullNameValue("")
    setPositionValue("")
    setEmailValue("")
    setPasswordValue("")
    setError(null)
    setIsModalOpen(true)
  }

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedEmployeeId(val)
    if (val) {
      const emp = employeeList.find((e) => e.id === val)
      if (emp) {
        setFullNameValue(emp.full_name)
        setPositionValue(emp.position)

        // Preseleccionar rol recomendado según cargo al crear un usuario nuevo
        if (!editingProfile) {
          const pos = emp.position.toLowerCase()
          let suggestedRole: UserRole | null = null
          if (pos.includes("moldeador") || pos.includes("operador") || pos.includes("carga")) {
            suggestedRole = "produccion"
          } else if (pos.includes("chofer") || pos.includes("despacho") || pos.includes("entrega")) {
            suggestedRole = "entrega_recepcion"
          } else if (pos.includes("quemador") || pos.includes("horno") || pos.includes("ingeniero")) {
            suggestedRole = "ing_produccion"
          } else if (pos.includes("cajer") || pos.includes("caja")) {
            suggestedRole = "cajero"
          } else if (pos.includes("venta")) {
            suggestedRole = "ventas"
          }
          if (suggestedRole && DEFAULT_ROLE_MODULES[suggestedRole]) {
            setSelectedRole(suggestedRole)
            setSelectedModules(DEFAULT_ROLE_MODULES[suggestedRole])
          }
        }
      }
    } else {
      setFullNameValue("")
      setPositionValue("")
    }
  }

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value
    setSelectedRole(newRole)
    // Update default allowed modules to match newly selected role
    if (DEFAULT_ROLE_MODULES[newRole as UserRole]) {
      setSelectedModules(DEFAULT_ROLE_MODULES[newRole as UserRole])
    }
  }

  const handleToggleModule = (href: string) => {
    setSelectedModules(prev => 
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    )
  }

  const handleToggleGroup = (groupHrefs: string[]) => {
    const allSelected = groupHrefs.every(h => selectedModules.includes(h))
    if (allSelected) {
      setSelectedModules(prev => prev.filter(h => !groupHrefs.includes(h)))
    } else {
      setSelectedModules(prev => Array.from(new Set([...prev, ...groupHrefs])))
    }
  }

  const handleSelectAll = () => {
    setSelectedModules(getAllModuleHrefs())
  }

  const handleDeselectAll = () => {
    setSelectedModules([])
  }

  const handleResetToRoleDefault = () => {
    if (DEFAULT_ROLE_MODULES[selectedRole as UserRole]) {
      setSelectedModules(DEFAULT_ROLE_MODULES[selectedRole as UserRole])
    }
  }

  const roleColors: Record<string, string> = {
    superadmin: "bg-slate-900 text-orange-400 border-slate-700",
    admin: "bg-slate-100 text-slate-700 border-slate-300",
    cajero: "bg-emerald-100 text-emerald-800 border-emerald-300",
    entrega_recepcion: "bg-indigo-100 text-indigo-800 border-indigo-300",
    ing_produccion: "bg-amber-100 text-amber-800 border-amber-300",
    ventas: "bg-orange-50 text-orange-600 border-orange-200",
    produccion: "bg-blue-50 text-blue-600 border-blue-200",
  }

  const roleNames: Record<string, string> = {
    superadmin: "Super Admin",
    admin: "Administrador",
    cajero: "Cajero/Cajera",
    entrega_recepcion: "Entrega y Recepción",
    ing_produccion: "Ing. de Producción",
    ventas: "Vendedor",
    produccion: "Operador",
  }

  const totalPossibleModules = getAllModuleHrefs().length

  if (activeRole !== "superadmin" && activeRole !== "admin") {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center max-w-lg mx-auto my-12 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-sm text-slate-600 mb-6">
          El módulo de <strong>Gestión de Usuarios</strong> está habilitado exclusivamente para 
          el <span className="font-semibold text-red-600">Super Administrador</span> y el <span className="font-semibold text-orange-600">Administrador de Planta</span>.
          Tu rol activo actual es <span className="font-mono uppercase bg-slate-100 px-2.5 py-1 rounded text-xs font-bold text-slate-800">{activeRole}</span>.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition shadow-sm cursor-pointer"
        >
          Volver al Dashboard
        </a>
      </div>
    );
  }

  const isSuperAdmin = activeRole === "superadmin" || currentUserRole === "superadmin";

  const canSelectSuperAdmin = isSuperAdmin;
  const canSelectAdmin = isSuperAdmin || activeRole === "admin";

  return (
    <div className="space-y-6">
      {/* Resumen Dark Card */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-2">
            Total de Usuarios Registrados
          </h2>
          <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            {profiles.length}
          </div>
          <p className="text-slate-400 mt-2 text-sm">
            Refleja el personal con acceso al sistema ERP, sus roles y módulos personalizados.
          </p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-900/50 hover:shadow-orange-600/30 border border-orange-500/30 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Crear Usuario
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="font-bold text-slate-700">Lista de Usuarios</div>
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="p-4 py-3">Nombre Completo</th>
                <th className="p-4 py-3">Cargo</th>
                <th className="p-4 py-3">Correo Electrónico</th>
                <th className="p-4 py-3">Rol</th>
                <th className="p-4 py-3">Módulos Habilitados</th>
                <th className="p-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => {
                  const isSuper = profile.role === "superadmin";
                  const activeModulesCount = profile.allowed_modules && profile.allowed_modules.length > 0
                    ? profile.allowed_modules.length
                    : (DEFAULT_ROLE_MODULES[profile.role as UserRole] || []).length;

                  return (
                    <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center text-white font-bold shadow-sm">
                            {profile.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-medium text-slate-900">{profile.full_name}</div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">
                        {profile.position || <span className="text-slate-400 italic">No definido</span>}
                      </td>
                      <td className="p-4 text-slate-600">
                        {profile.email || <span className="text-slate-400 italic">Sin correo</span>}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleColors[profile.role] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {roleNames[profile.role] || profile.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <Shield className="w-3.5 h-3.5 text-purple-600" />
                            Acceso Total (Todos)
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 cursor-help"
                            title={
                              profile.allowed_modules && profile.allowed_modules.length > 0
                                ? `Rutas activas: ${profile.allowed_modules.join(', ')}`
                                : "Configurado con los accesos por defecto del rol"
                            }
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                            {activeModulesCount} / {totalPossibleModules} módulos activos
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {(() => {
                          const isSuperAdminAccount = 
                            profile.role === "superadmin" || 
                            profile.email?.toLowerCase() === "darinka.arias18@gmail.com" || 
                            profile.id === "83ea7d79-d6d7-4d73-b9ee-5304497df779";

                          // SuperAdmin y Admin pueden editar y eliminar a cualquier usuario EXCEPTO a la cuenta de SuperAdmin
                          const canEditThisUser = !isSuperAdminAccount && (isSuperAdmin || activeRole === "admin");
                          const canDeleteThisUser = !isSuperAdminAccount && (isSuperAdmin || activeRole === "admin");

                          return (
                            <div className="flex items-center justify-end gap-2">
                              {/* Para el caso del usuario SuperAdmin: NO hay opción de eliminar ni editar */}
                              {isSuperAdminAccount ? (
                                <span
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg shadow-xs select-none"
                                  title="Cuenta principal de Super Administrador: Protegida contra edición y eliminación"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Cuenta Protegida</span>
                                </span>
                              ) : (
                                <>
                                  {/* Botón EDITAR: habilitado para SuperAdmin en todos los demás usuarios */}
                                  {canEditThisUser && (
                                    <button 
                                      onClick={() => openEditModal(profile)}
                                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 rounded-lg transition-all shadow-xs cursor-pointer"
                                      title={`Editar datos, rol y módulos de ${profile.full_name || profile.email}`}
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-orange-600" />
                                      <span>Editar</span>
                                    </button>
                                  )}

                                  {/* Botón ELIMINAR: habilitado para SuperAdmin en todos los demás usuarios */}
                                  {canDeleteThisUser && (
                                    <button 
                                      onClick={() => handleDelete(profile)}
                                      disabled={isDeleting === profile.id}
                                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-300 hover:border-rose-600 rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                      title={`Eliminar usuario ${profile.full_name || profile.email}`}
                                    >
                                      {isDeleting === profile.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                      <span>Eliminar</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Usuario con Selección de Módulos */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 z-10 my-8">
            {/* Header Fijo */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingProfile ? "Editar Usuario y Permisos" : "Registrar Nuevo Usuario"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define el rol del usuario y activa los módulos que podrá visualizar en el sistema.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre Completo *
                    </label>

                    <div className="space-y-1.5">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserPlus className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          name="full_name"
                          type="text"
                          value={fullNameValue}
                          onChange={(e) => setFullNameValue(e.target.value)}
                          required
                          className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                          placeholder="Nombre y Apellidos"
                        />
                      </div>
                      {employeeList.length > 0 && (
                        <select
                          id="select-nomina-empleados"
                          value={selectedEmployeeId}
                          onChange={handleEmployeeChange}
                          className="block w-full py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 cursor-pointer"
                        >
                          <option value="">-- O seleccionar de Nómina de Empleados --</option>
                          {employeeList.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name} — {emp.position}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        name="position"
                        type="text"
                        value={positionValue}
                        onChange={(e) => setPositionValue(e.target.value)}
                        required
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                        placeholder="Ej. Cajero Turno Mañana"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Correo Electrónico *
                      {editingProfile && (isSuperAdmin || activeRole === "admin") && (
                        <span className="ml-1.5 text-[10px] text-orange-600 font-semibold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                          Editable
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        name="email"
                        type="email"
                        value={emailValue}
                        onChange={(e) => setEmailValue(e.target.value)}
                        required
                        disabled={editingProfile ? (!isSuperAdmin && activeRole !== "admin") : false}
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm disabled:bg-slate-100 disabled:text-slate-500 bg-white"
                        placeholder="usuario@empresa.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        {editingProfile ? "Asignar Nueva Contraseña" : "Contraseña *"}
                      </label>
                      {editingProfile && (
                        <span className="text-[11px] text-slate-400">
                          (Dejar en blanco para no cambiar)
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        name="password"
                        type="text"
                        value={passwordValue}
                        onChange={(e) => setPasswordValue(e.target.value)}
                        required={!editingProfile}
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                        placeholder={editingProfile ? "Escribir nueva contraseña aquí..." : "Mínimo 8 caracteres"}
                      />
                    </div>
                    {editingProfile && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Puedes escribir una nueva contraseña para actualizar las credenciales de este usuario.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rol de Acceso *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Shield className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                      name="role"
                      required
                      value={selectedRole}
                      onChange={handleRoleChange}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm bg-white cursor-pointer"
                    >
                      {/* El rol de SuperAdmin SOLO se muestra si quien está logueado es SuperAdmin y no existe otro */}
                      {canSelectSuperAdmin && (
                        <option value="superadmin">Super Administrador (Control Total)</option>
                      )}
                      {/* El rol de Admin SOLO se muestra si quien está logueado es SuperAdmin y no existe otro Admin */}
                      {canSelectAdmin && (
                        <option value="admin">Administrador (Admin)</option>
                      )}
                      <option value="cajero">Cajero/Cajera</option>
                      <option value="entrega_recepcion">Entrega y Recepción</option>
                      <option value="ing_produccion">Ing. de Producción</option>
                      <option value="ventas">Vendedor (Ventas)</option>
                      <option value="produccion">Operador (Producción)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {activeRole === "admin"
                      ? "⚠️ Como Administrador de Planta puedes crear y asignar roles operativos (Cajero, Ventas, Producción, etc.). Por directriz de seguridad estricta, estos roles tendrán acceso a sus módulos pero NO dispondrán de opciones para editar ni eliminar registros."
                      : "SuperAdmin y Admin poseen facultades plenas de edición y eliminación en todos los módulos; los demás roles operativos creados operan en modo registro y consulta, sin permisos para editar ni eliminar."}
                  </p>
                </div>

                {/* SECCIÓN: MÓDULOS HABILITADOS */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Módulos Habilitados para este Usuario
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Selecciona qué módulos y vistas se mostrarán en su menú lateral.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[10px] font-bold text-slate-700 hover:text-orange-600 px-2 py-1 bg-slate-100 hover:bg-orange-50 rounded border border-slate-200 transition cursor-pointer"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-[10px] font-bold text-slate-700 hover:text-red-600 px-2 py-1 bg-slate-100 hover:bg-red-50 rounded border border-slate-200 transition cursor-pointer"
                      >
                        Ninguno
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToRoleDefault}
                        className="text-[10px] font-bold text-slate-700 hover:text-blue-600 px-2 py-1 bg-slate-100 hover:bg-blue-50 rounded border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="Restablecer a los módulos recomendados según el rol seleccionado"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Por Defecto Rol
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    {SYSTEM_MODULES.map((group) => {
                      // Grupo sin submódulos (ej. Dashboard, Caja, Reportes, Usuarios)
                      if (!group.subModules && group.href) {
                        const isChecked = selectedModules.includes(group.href);
                        return (
                          <label
                            key={group.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                              isChecked ? 'bg-orange-50/70 border-orange-300 text-slate-900 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleModule(group.href!)}
                              className="mt-0.5 w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block">{group.name}</span>
                              {group.description && <span className="text-[10px] text-slate-500">{group.description}</span>}
                            </div>
                          </label>
                        );
                      }

                      // Grupo con submódulos (Empleados, Producción, Pedidos & Entregas)
                      const subHrefs = group.subModules?.map(s => s.href) || [];
                      const checkedCount = subHrefs.filter(h => selectedModules.includes(h)).length;
                      const allChecked = checkedCount === subHrefs.length && subHrefs.length > 0;
                      const someChecked = checkedCount > 0 && !allChecked;

                      return (
                        <div key={group.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          {/* Cabecera del grupo */}
                          <div className="p-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={el => {
                                  if (el) el.indeterminate = someChecked;
                                }}
                                onChange={() => handleToggleGroup(subHrefs)}
                                className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                              />
                              <span className="font-bold text-slate-800 text-xs">{group.name}</span>
                            </label>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              {checkedCount} / {subHrefs.length} activos
                            </span>
                          </div>

                          {/* Submódulos del grupo */}
                          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {group.subModules?.map((sub) => {
                              const isChecked = selectedModules.includes(sub.href);
                              return (
                                <label
                                  key={sub.id}
                                  className={`flex items-start gap-2 p-1.5 rounded-md border cursor-pointer transition select-none ${
                                    isChecked ? 'bg-orange-50/60 border-orange-200 text-slate-900 font-medium' : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleModule(sub.href)}
                                    className="mt-0.5 w-3.5 h-3.5 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                                  />
                                  <div>
                                    <span className="font-semibold text-slate-800 block text-xs">{sub.name}</span>
                                    {sub.description && <span className="text-[10px] text-slate-400 leading-tight block">{sub.description}</span>}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 px-1">
                    <span>Módulos seleccionados:</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {selectedModules.length} de {totalPossibleModules} habilitados
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Fijo */}
              <div className="p-4 border-t border-slate-200 flex gap-3 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all text-sm font-bold disabled:opacity-50 shadow-md shadow-orange-900/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    editingProfile ? "Guardar Cambios" : "Crear Usuario"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Usuario */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => !isDeleting && setUserToDelete(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 z-10 p-6">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                ¿Eliminar permanentemente a este usuario?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Esta acción es irreversible y revocará de inmediato todas las credenciales y accesos al sistema ERP.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center text-white font-bold text-sm">
                  {userToDelete.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {userToDelete.full_name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {userToDelete.email}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Cargo: {userToDelete.position || "No asignado"}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleColors[userToDelete.role] || "bg-slate-100 text-slate-700"}`}>
                  {roleNames[userToDelete.role] || userToDelete.role}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeleting === userToDelete.id}
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting === userToDelete.id}
                onClick={confirmDeleteUser}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all text-sm font-bold shadow-md shadow-rose-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting === userToDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
