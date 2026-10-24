"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuditLogger } from "@/lib/audit-logger";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";

// Tiempo por defecto: 15 minutos de inactividad (en milisegundos)
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos = 900,000 ms
// Tiempo de advertencia previo: 60 segundos antes del cierre
const WARNING_TIME_MS = 60 * 1000; // 60 segundos

export function InactivityGuard() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const lastActivityRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);

  // Restablece el contador de actividad cuando el usuario interactúa
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setSecondsRemaining(60);
    }
  }, [showWarning]);

  // Cierre de sesión formal y seguro
  const executeLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      let userName = "Usuario";
      let userRole = "operario";
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("erp_current_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            userName = parsed.name || userName;
            userRole = parsed.role || userRole;
          } catch {}
        }
      }

      AuditLogger.logSecurityAlert(
        "medium",
        `Cierre de sesión automático por inactividad prolongada (15 minutos) para ${userName} (${userRole})`
      );

      const supabase = createClient();
      await supabase.auth.signOut();

      if (typeof window !== "undefined") {
        localStorage.removeItem("erp_current_user");
        window.location.href = "/login?reason=inactivity";
      } else {
        router.push("/login?reason=inactivity");
      }
    } catch (e) {
      console.warn("Error durante el cierre automático por inactividad:", e);
      if (typeof window !== "undefined") {
        window.location.href = "/login?reason=inactivity";
      }
    }
  }, [router]);

  useEffect(() => {
    // Eventos del usuario que indican actividad
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    let lastThrottleTime = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      // Limitar a máximo 1 actualización por segundo para alto rendimiento
      if (now - lastThrottleTime > 1000) {
        lastThrottleTime = now;
        lastActivityRef.current = now;
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Verificador periódico de inactividad (cada segundo)
    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const elapsed = Date.now() - lastActivityRef.current;
      const timeLeft = DEFAULT_TIMEOUT_MS - elapsed;

      if (timeLeft <= 0) {
        // Tiempo agotado: ejecutar cierre de sesión
        clearInterval(interval);
        executeLogout();
      } else if (timeLeft <= WARNING_TIME_MS) {
        // Últimos 60 segundos: mostrar ventana de advertencia con cuenta regresiva
        const remaining = Math.max(1, Math.ceil(timeLeft / 1000));
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [executeLogout, showWarning]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden">
      <div className="bg-white rounded-2xl border border-amber-200 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 animate-pulse text-amber-600" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            ¿Sigues ahí? Tu sesión está por caducar
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Por directriz de seguridad del sistema industrial, la sesión se cerrará
            automáticamente al cumplirse <strong>15 minutos</strong> de inactividad.
          </p>
        </div>

        {/* Contador regresivo grande */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
            Tiempo restante antes de cerrar sesión:
          </span>
          <div className="text-3xl font-black font-mono text-amber-600">
            00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            onClick={executeLogout}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión Ahora</span>
          </button>

          <button
            onClick={resetTimer}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-950/20 hover:shadow-orange-600/30 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Permanecer Conectado</span>
          </button>
        </div>
      </div>
    </div>
  );
}
