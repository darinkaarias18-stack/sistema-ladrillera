# Reglas para Supabase

- **Tipado Fuerte:** SIEMPRE debes utilizar los tipos generados para el cliente de Supabase. El cliente de supabase debe inicializarse con el tipo genérico de la base de datos (e.g. `createClient<Database>(...)`).
- **Separación de Entornos:**
  - **Desde Server Components o Server Actions:** Usa el cliente configurado para el servidor (generalmente `createServerClient` de `@supabase/ssr` o la utilidad exportada en `src/lib/supabase/server.ts`).
  - **Desde Client Components:** Si absolutamente necesitas acceder a Supabase desde el cliente (solo para lecturas públicas o suscripciones en tiempo real), usa el cliente configurado para el navegador (ej. exportado en `src/lib/supabase/client.ts`).
- **Seguridad (RLS):** Asume que Row Level Security (RLS) está habilitado. Las operaciones que modifican la base de datos o leen datos sensibles deben estar respaldadas por políticas (policies) en Supabase o bien usar Service Role Key en acciones de servidor seguras cuando sea indispensable saltarse RLS.
- **Manejo de Errores:** Siempre verifica la propiedad `error` en las respuestas de Supabase (`const { data, error } = await supabase.from...`). Nunca asumas que las consultas a la base de datos serán exitosas. Retorna el error de forma controlada hacia la UI.
