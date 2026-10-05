"use client"

import { useState } from "react"
import { Profile } from "@/types/database.types"
import { createUserAction, deleteUserAction, updateUserAction } from "./actions"
import { Plus, Search, UserPlus, Mail, Briefcase, Shield, KeyRound, Loader2, X, MoreVertical, Pencil, Trash2, Edit } from "lucide-react"

interface UsersClientProps {
  initialProfiles: Profile[]
  currentUserRole: string
}

export function UsersClient({ initialProfiles, currentUserRole }: UsersClientProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState("")
  
  // Edit & Delete states
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Form states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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
    
    const formData = new FormData(e.currentTarget)
    
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

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario definitivamente?")) return;
    
    setIsDeleting(id)
    try {
      const result = await deleteUserAction(id)
      if (result.error) {
        alert(result.error)
      } else {
        window.location.reload()
      }
    } catch (err) {
      alert("Error al eliminar el usuario.")
    } finally {
      setIsDeleting(null)
    }
  }

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile)
    setError(null)
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingProfile(null)
    setError(null)
    setIsModalOpen(true)
  }

  const roleColors: Record<string, string> = {
    superadmin: "bg-slate-900 text-orange-400 border-slate-700",
    admin: "bg-slate-100 text-slate-700 border-slate-300",
    ventas: "bg-orange-50 text-orange-600 border-orange-200",
    produccion: "bg-blue-50 text-blue-600 border-blue-200",
  }

  const roleNames: Record<string, string> = {
    superadmin: "Super Admin",
    admin: "Administrador",
    ventas: "Vendedor",
    produccion: "Operador",
  }

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
            Refleja el personal con acceso al sistema ERP y sus roles.
          </p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-900/50 hover:shadow-orange-600/30 border border-orange-500/30"
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
                <th className="p-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors[profile.role] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {roleNames[profile.role] || profile.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(profile)}
                          disabled={profile.role === 'superadmin' && currentUserRole !== 'superadmin'}
                          className={`transition-colors p-1.5 rounded-md ${profile.role === 'superadmin' && currentUserRole !== 'superadmin' ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
                          title={profile.role === 'superadmin' && currentUserRole !== 'superadmin' ? "Solo los SuperAdmins pueden editar a otro SuperAdmin" : "Editar Usuario"}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(profile.id)}
                          disabled={isDeleting === profile.id || profile.role === 'superadmin'}
                          className={`transition-colors p-1.5 rounded-md ${profile.role === 'superadmin' ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50'}`}
                          title={profile.role === 'superadmin' ? "Nadie puede eliminar a un Super Administrador" : "Eliminar Usuario"}
                        >
                          {isDeleting === profile.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingProfile ? "Editar Usuario" : "Registrar Nuevo Empleado"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserPlus className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="full_name"
                    type="text"
                    defaultValue={editingProfile?.full_name || ""}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="position"
                    type="text"
                    defaultValue={editingProfile?.position || ""}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm"
                    placeholder="Ej. Supervisor de Planta"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingProfile?.email || ""}
                    required={!editingProfile}
                    disabled={!!editingProfile} // Email change is disabled for simplicity in edit mode
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="juan@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contraseña de Acceso {editingProfile && "(Opcional)"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="password"
                    type="text"
                    required={!editingProfile}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm"
                    placeholder={editingProfile ? "Dejar en blanco para no cambiar" : "De 8 a 12 caracteres"}
                    minLength={8}
                    maxLength={12}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol de Acceso</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    name="role"
                    required
                    defaultValue={editingProfile?.role || ""}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                  >
                    <option value="" disabled>Selecciona un rol...</option>
                    {editingProfile?.role === "superadmin" && (
                      <option value="superadmin">Super Administrador (Control Total)</option>
                    )}
                    <option value="admin">Administrador (Admin)</option>
                    <option value="ventas">Vendedor (Seller)</option>
                    <option value="produccion">Operador (Operator)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all text-sm font-bold disabled:opacity-50 shadow-md shadow-orange-900/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Guardar Usuario"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
