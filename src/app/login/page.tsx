"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset password state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)

    const targetEmail = customEmail ?? email
    const targetPassword = customPass ?? password

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      })

      if (error) {
        throw error
      }

      // Refresh router to apply middleware and redirect
      router.push("/")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión. Verifica tus credenciales.")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })

      if (error) {
        throw error
      }

      setResetSuccess(true)
    } catch (err: any) {
      setResetError(err.message || "Error al solicitar el restablecimiento.")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
      <div className="max-w-md w-full space-y-8 bg-zinc-900/50 p-8 sm:p-10 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative">
          <div className="text-center">
            <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">
              SISTEMA ERP INCEGUA S.R.L.
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Ingresa tus credenciales para acceder a tu cuenta
            </p>
          </div>

          <form className="mt-10 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                  Correo Electrónico
                </label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-zinc-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors sm:text-sm"
                    placeholder="ejemplo@empresa.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                    Contraseña
                  </label>
                  <div className="text-sm">
                    <span className="text-xs text-zinc-500">
                      ¿Problemas? Contacta al Administrador
                    </span>
                  </div>
                </div>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-zinc-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors sm:text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-500 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-zinc-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Acceso Rápido Local */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 text-center">
              Acceso Rápido Local (1 Clic)
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setEmail("darinka.arias18@gmail.com")
                  setPassword("superadmin1234*")
                  handleLogin(undefined, "darinka.arias18@gmail.com", "superadmin1234*")
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-orange-500/50 transition-all text-left text-xs group cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>👑 Superadmin: Darinka Arias</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30">
                      Acceso Total
                    </span>
                  </div>
                  <div className="text-zinc-400 mt-0.5 font-mono">darinka.arias18@gmail.com</div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setEmail("darinkaarias@gmail.com")
                  setPassword("TemporalPassword2026!")
                  handleLogin(undefined, "darinkaarias@gmail.com", "TemporalPassword2026!")
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-purple-500/50 transition-all text-left text-xs group cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>👔 Administrador: Fernando Espinoza</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 font-semibold border border-purple-500/30">
                      Gerencia
                    </span>
                  </div>
                  <div className="text-zinc-400 mt-0.5 font-mono">darinkaarias@gmail.com</div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de recuperar contraseña eliminado según políticas: solo los admins pueden restablecer claves */}
    </div>
  )
}
