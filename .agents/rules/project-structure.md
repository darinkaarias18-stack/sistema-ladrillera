# Estructura del Proyecto

Este proyecto sigue una estructura estricta basada en Next.js (App Router). Cuando crees, leas o modifiques archivos, debes seguir esta estructura:

- `src/app`: Rutas, páginas, layouts y componentes exclusivos de enrutamiento (Server Components por defecto).
- `src/actions`: Server Actions de Next.js. Toda mutación de datos desde el cliente hacia la base de datos debe hacerse a través de estas acciones, nunca directamente desde el cliente.
- `src/components`: Componentes reutilizables. Deben ser agnósticos de la base de datos siempre que sea posible.
- `src/lib`: Utilidades genéricas, configuración del cliente de Supabase (`supabase/server` o `supabase/client`), validadores (zod, etc.).
- `src/types`: Tipos e interfaces globales. Si usas Supabase, aquí se debe almacenar el archivo de tipos generados (`database.types.ts`).
- `supabase/`: Migraciones y configuraciones locales de Supabase CLI.

**Nota:** Nunca crees componentes de React directamente en la raíz de `src/`, usa `src/components`.
