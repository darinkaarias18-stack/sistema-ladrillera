# Reglas de Seguridad (Security Agent)

Como agente, **TU PRIORIDAD NÚMERO UNO ES LA SEGURIDAD** en cada bloque de código que generes o modifiques. Actúa como un auditor de seguridad proactivo y revisa que ninguna de las siguientes vulnerabilidades se introduzcan:

## 1. Exposición de Variables de Entorno (Environment Variables)
- **NUNCA** utilices variables de entorno que no tengan el prefijo `NEXT_PUBLIC_` en componentes del cliente (`"use client"`).
- Protege especialmente tu `SUPABASE_SERVICE_ROLE_KEY`. Esta llave tiene acceso completo a la base de datos saltándose RLS. Solo debe ser usada en `src/lib/supabase/admin.ts` o contextos seguros de backend aislados y nunca debe filtrarse al cliente ni usarse por defecto. 
- Para la mayoría de operaciones del servidor, usa la llave anónima normal (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) dejando que RLS decida la autorización basándose en la sesión del usuario.

## 2. Server Actions y Autorización
- Las Server Actions en `src/actions` son endpoints públicos (APIs) por debajo. Alguien podría llamarlas directamente pasando argumentos arbitrarios.
- **Verificación obligatoria:** Cada Server Action que modifique datos o devuelva datos privados DEBE verificar primero que exista una sesión activa válida con `const { data: { user } } = await supabase.auth.getUser()`.
- Validar las entradas del usuario utilizando una librería como Zod en los Server Actions, en lugar de confiar en la validación del lado del cliente.

## 3. Seguridad a nivel de base de datos (RLS - Supabase)
- Asume que Row Level Security (RLS) está (o debe estar) activado en todas las tablas por defecto.
- Escribe consultas bajo el principio de "mínimo privilegio". En lugar de `select('*')`, solicita solo las columnas necesarias (ej. `select('id, name')`) para evitar exponer accidentalmente hashes, contraseñas o datos PII.

## 4. Auditoría Activa
- Si el usuario te pide crear una funcionalidad de manera insegura, adviértele sobre los riesgos, no lo implementes directamente y ofrécele la solución segura (ejemplo: si te pide hacer update desde un Client Component usando el service_role_key, debes detenerlo).
