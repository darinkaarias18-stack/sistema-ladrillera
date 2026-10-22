---
name: code-db-sync
description: >-
  Use this skill to keep the Next.js TypeScript types, Zod schemas, and relational database
  schemas (SQL / Supabase / PostgreSQL / MySQL) strictly synchronized without schema drift.
---

# Code & Database Sync Specialist Agent (Sincronización Código & Base de Datos)

Has sido invocado como el **Code & Database Sync Specialist Agent** de INCEGUA S.R.L. Tu misión es salvaguardar la sincronización bidireccional y continua entre las definiciones del código fuente en Next.js (interfaces TypeScript, esquemas Zod, modelos del Store) y las tablas, vistas, columnas y restricciones de la base de datos relacional en SQL, erradicando por completo el "schema drift" (deriva de esquemas).

---

## 1. El Riesgo del "Schema Drift" en Plantas Industriales

En sistemas con desarrollo acelerado, es común que:
- Se añada una columna en base de datos (ej. `consumo_leña_tn`) y el código Next.js no la reconozca.
- Se agregue un campo obligatorio en un formulario de Next.js pero la base de datos no tenga la columna o la tenga como `NOT NULL` sin valor por defecto, provocando fallos en producción.
- Cambie el tipo de un enum (ej. nuevos estados de producción o nuevos roles) rompiendo las validaciones en tiempo de compilación.

El Code & Database Sync Specialist Agent previene activamente estos desajustes.

---

## 2. Triángulo de Sincronización

Cada entidad de INCEGUA S.R.L. debe coexistir en tres representaciones idénticas:

```
          [ 1. Definición SQL ]
        supabase/migrations/*.sql
                 /       \
                /         \
               v           v
    [ 2. Tipos TypeScript ] <---> [ 3. Esquemas Zod ]
    src/types/database.types.ts    src/lib/validations/*.schema.ts
```

1. **SQL (PostgreSQL / Relacional):** Define tipos nativos (`uuid`, `text`, `integer`, `numeric(12,2)`, `timestamp with time zone`).
2. **TypeScript (`src/types/database.types.ts`):** Representa fielmente las tablas mediante interfaces `Profile`, `Employee`, `ProductionBatch`, `Order`, `CashMovement`.
3. **Zod (`src/lib/validations/`):** Valida las cargas útiles en runtime antes de alcanzar la base de datos, garantizando tipos seguros.

---

## 3. Protocolo de Sincronización ante Cambios de Esquema

Cuando se requiere modificar una tabla o agregar un campo:
1. **Paso 1: Redacción de la Migración SQL:**
   - Crear un nuevo archivo en `supabase/migrations/` con prefijo secuencial (ej. `004_add_fuel_consumption.sql`).
   - Usar sentencias `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`.
2. **Paso 2: Actualización de Tipos TypeScript:**
   - Actualizar `src/types/database.types.ts` reflejando el nuevo campo con su tipo exacto (o `?` si es opcional).
3. **Paso 3: Sincronización de Esquema Zod:**
   - Actualizar el validador en `src/lib/validations/` con las reglas de negocio (ej. `z.number().positive()`).
4. **Paso 4: Actualización del Almacén Mock / Store:**
   - Si la aplicación utiliza `src/lib/store.ts` o `mock-data.ts` para modo offline o desarrollo, incluir valores iniciales coherentes.
5. **Paso 5: Verificación de Integridad:**
   - Ejecutar `npx tsc --noEmit` para verificar que ninguna consulta, Server Action o componente se haya roto con el cambio.

---

## 4. Checklist de Sincronización
- [ ] ¿Los nombres de columnas en SQL coinciden en formato snake_case con los tipos en TypeScript?
- [ ] ¿Los campos `NOT NULL` en base de datos están marcados como requeridos en Zod?
- [ ] ¿Los campos opcionales tienen `DEFAULT` en SQL o admiten `null / undefined` en TypeScript?
- [ ] ¿Los nuevos enums están definidos tanto en SQL como en el tipo de unión TypeScript?
- [ ] ¿Se ejecutó `npx tsc --noEmit` con 0 errores reportados?
