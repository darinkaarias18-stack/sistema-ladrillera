"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmpleadosPlanillasRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/planillas");
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-500 font-medium">
      Redirigiendo a Planilla Oficial de Sueldos y Bonos...
    </div>
  );
}
