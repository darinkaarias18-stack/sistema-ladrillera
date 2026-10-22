"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AuditLogger } from "@/lib/audit-logger"
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck
} from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) {
        throw error
      }

      // Registro de inicio de sesión exitoso en la auditoría inmutable
      if (data?.user) {
        AuditLogger.log({
          user_id: data.user.id,
          user_name: data.user.user_metadata?.full_name || email,
          user_email: email,
          user_role: data.user.user_metadata?.role || "superadmin",
          action: "LOGIN_SUCCESS",
          severity: "low",
          module: "seguridad",
          description: `Inicio de sesión autenticado correctamente para ${email}`,
        })
      }

      // Refresh router to apply middleware and redirect
      router.push("/")
      router.refresh()
    } catch (err: any) {
      // Registro de alerta de seguridad ante fallos de login
      AuditLogger.logSecurityAlert(
        "medium",
        `Intento fallido de inicio de sesión para ${email || "correo no provisto"}`,
        { email, error: err.message }
      )
      setError(err.message || "Credenciales incorrectas. Verifica tu correo y contraseña.")
    } finally {
      setLoading(false)
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
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer"
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
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-500 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-zinc-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 cursor-pointer"
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

          {/* Pie de Seguridad Zero Trust */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
            <div className="inline-flex items-center justify-center gap-1.5 text-xs text-zinc-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Autenticación Cifrada • Enfoque Zero Trust</span>
            </div>
            <p className="text-[11px] text-zinc-600 mt-1">
              INCEGUA S.R.L. — Acceso Restringido y Auditado
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
