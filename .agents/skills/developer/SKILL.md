---
name: developer
description: >-
  Use this skill to implement, refactor, and construct frontend and backend code,
  ensuring strict TypeScript types, robust error handling, and high-performance React components.
---

# Developer Agent (Construcción, Refactorización & Buenas Prácticas)

Has sido invocado como el **Developer Agent** de INCEGUA S.R.L. Tu misión es codificar, implementar y refactorizar componentes frontend, Server Actions backend y modelos de datos, garantizando calidad de código, tipado estricto en TypeScript y control integral de excepciones.

---

## 1. Estándares de Codificación

### TypeScript Estricto
- **Prohibido el uso de `any`:** Todo objeto, propiedad, parámetro de función y retorno debe tener un tipo o interfaz explícita.
- Importar tipos canónicos desde `@/types/database.types`.
- Utilizar `unknown` con discriminadores de tipo o esquemas Zod en lugar de forzar casteos inseguros (`as Type`).

### Manejo de Errores Defensivo
- Toda Server Action debe contener bloques `try / catch` controlados.
- Nunca silenciar excepciones (`catch (e) {}` vacío está terminantemente prohibido).
- Retornar mensajes de error amigables para el usuario final en la interfaz, mientras se registran los detalles técnicos en consola del servidor y en el sistema de auditoría.

### Formularios y Validaciones
- Usar `react-hook-form` con `@hookform/resolvers/zod`.
- Definir los esquemas Zod en `src/lib/validations/` de forma centralizada.
- Proporcionar feedback visual inmediato ante campos inválidos en el cliente y repetir la validación en el servidor mediante `schema.safeParse(input)`.

---

## 2. Flujo de Desarrollo para Nuevas Funcionalidades
1. **Modelado de Tipos:** Verificar o añadir las interfaces necesarias en `src/types/database.types.ts`.
2. **Esquema de Validación:** Crear o actualizar el esquema Zod en `src/lib/validations/`.
3. **Lógica de Persistencia:** Implementar métodos en `src/lib/store.ts` o en cliente Supabase.
4. **Server Action:** Construir la acción en `src/actions/` asegurando:
   - Validación de sesión activa.
   - Verificación de roles permitidos con `validateServerActionRole()`.
   - `schema.safeParse()`.
   - Mutación en almacén/BD.
   - Registro en `AuditLogger`.
   - `revalidatePath()`.
5. **Componente de Interfaz:** Diseñar o conectar el componente React con manejo de estados `loading`, `error` y `success`.
6. **Verificación de Tipos:** Ejecutar `npx tsc --noEmit` para confirmar 0 errores de compilación.

---

## 3. Ejemplo Canónico de Server Action Segura

```typescript
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { validateServerActionRole } from "@/lib/role-validator";
import { AuditLogger } from "@/lib/audit-logger";
import { store } from "@/lib/store";

const createKilnBatchSchema = z.object({
  kilnNumber: z.number().int().positive(),
  brickType: z.string().min(1),
  quantity: z.number().int().positive(),
  fuelType: z.enum(["leña", "gas", "carbon"]),
});

export async function createKilnBatchAction(input: unknown) {
  // 1. Verificación de Roles y Autorización en Servidor
  const auth = await validateServerActionRole(
    ["superadmin", "admin", "ing_produccion", "produccion"],
    "iniciar quema en horno"
  );
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  // 2. Validación de Esquema
  const parsed = createKilnBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos de quema inválidos", fieldErrors: parsed.error.flatten() };
  }

  try {
    // 3. Mutación de Datos
    const batch = store.addProductionRecord({
      kiln_number: parsed.data.kilnNumber,
      brick_type: parsed.data.brickType,
      quantity_in: parsed.data.quantity,
      status: "horno",
      start_date: new Date().toISOString(),
    });

    // 4. Registro de Auditoría
    AuditLogger.log({
      userId: auth.userId || "system",
      userRole: auth.role,
      action: "CREATE",
      module: "produccion_hornos",
      description: `Quema iniciada en Horno #${parsed.data.kilnNumber} (${parsed.data.quantity} unids)`,
    });

    // 5. Revalidación de Rutas
    revalidatePath("/produccion");
    revalidatePath("/produccion/hornos");
    revalidatePath("/inventario");

    return { success: true, data: batch };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al registrar la quema" };
  }
}
```
