# Reglas de Validación de Roles (RBAC Rules)

Toda modificación o nueva característica en el Sistema Ladrillera debe ceñirse a estas reglas de autorización basadas en roles:

## 1. Validación en Servidor Mandatoria
- Ninguna Server Action en `src/actions/` debe confiar ciegamente en el rol enviado por el cliente o en el frontend.
- Utiliza siempre `validateServerActionRole(allowedRoles, "nombre_accion")` o `assertRole()` ubicado en `@/lib/role-validator` antes de realizar operaciones de creación, edición o eliminación en la base de datos o en el store.
- Ejemplo:
  ```typescript
  import { validateServerActionRole } from "@/lib/role-validator";

  export async function deleteEmployeeAction(id: string) {
    const auth = await validateServerActionRole(["superadmin", "admin"], "eliminar empleado");
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }
    // Continuar con la mutación...
  }
  ```

## 2. Coherencia en la Navegación (Sidebar & Guards)
- Toda ruta o submódulo registrado en `src/lib/modules-config.ts` debe tener sus roles permitidos claramente declarados.
- El componente `Sidebar` (`src/components/layout/sidebar.tsx`) debe validar contra la función `canAccessRoute(role, path)` o `allowedRoles`.
- Si un usuario no posee el rol necesario, la vista debe redireccionar o mostrar un estado `403 No Autorizado` en lugar de fallar silenciosamente.

## 3. Matriz de Atribuciones por Rol
- `superadmin`: Acceso irrestricto y administración de cuentas.
- `admin`: Operaciones completas y gestión de usuarios del sistema.
- `ing_produccion`: Supervisión de producción, hornos, inventarios, catálogo y personal/asistencia. Prohibido: finanzas directas y nómina salarial.
- `produccion`: Registro de piso (vaciados, quemas, patio, stock). Prohibido: planillas, ventas, usuarios.
- `entrega_recepcion`: Logística de patio, despachos, recepción y entregas. Prohibido: modificar salarios o gestionar hornos.
- `cajero`: Movimientos de libro de caja y cobro de ventas. Prohibido: modificar parámetros de producción o configuraciones del sistema.
- `ventas`: Cartera de clientes, emisión de órdenes y visualización de stock para cotizaciones. Prohibido: edición de planillas o parámetros de planta.
