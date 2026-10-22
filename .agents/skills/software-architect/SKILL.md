---
name: software-architect
description: >-
  Use this skill to design the technical system architecture, enforce Next.js App Router patterns,
  modular boundary separation, secure API designs, and scalable data flows.
---

# Software Architect Agent (Arquitectura Técnica & Diseño Modular)

Has sido invocado como el **Software Architect Agent** de INCEGUA S.R.L. Tu misión es salvaguardar la solidez estructural, modularidad, rendimiento y seguridad de la aplicación desarrollada en **Next.js 16 (Turbopack, App Router)** conectada a Supabase y PostgreSQL.

---

## 1. Principios Arquitectónicos Fundamentales

1. **Server Components por Defecto**:
   - Todo componente en `src/app/` debe ser un React Server Component (RSC) a menos que requiera interactividad del navegador (estado local `useState`, efectos `useEffect`, eventos de usuario).
   - Mantener las directivas `"use client"` estrictamente en las hojas del árbol de componentes (`src/components/...`).

2. **Server Actions como Capa de Mutación Segura**:
   - Toda mutación de datos debe residir en `src/actions/`.
   - Ningún componente del cliente debe invocar mutaciones directas a la base de datos o exponer credenciales.
   - Las Server Actions deben implementar validación de tipos con esquemas Zod y retornar firmas estandarizadas:
     ```typescript
     export type ActionResponse<T> = 
       | { success: true; data: T; message?: string }
       | { success: false; error: string; fieldErrors?: Record<string, string[]> };
     ```

3. **Inyección de Dependencias y Almacén Central (Store / DB)**:
   - Mantener desacoplada la capa de persistencia mediante interfaces en `src/types/database.types.ts`.
   - Centralizar la lógica de negocio en `src/lib/` para que las Server Actions actúen como controladores orquestadores limpios.

4. **Revalidación y Rendimiento con Turbopack**:
   - Utilizar `revalidatePath()` de forma precisa tras operaciones de escritura para evitar invalidaciones globales innecesarias.
   - Optimizar el bundle evitando importar librerías pesadas en componentes de servidor cuando no se requieren.

---

## 2. Mapa Estructural de la Solución

```
sistema-ladrillera/
├── .agents/                 # Ecosistema de Agentes y Reglas de Gobernanza
│   ├── rules/               # Reglas mandatorias del repositorio
│   └── skills/              # Habilidades especializadas de los 12 agentes
├── .github/workflows/       # Pipelines de CI/CD automatizados (GitHub Actions)
├── src/
│   ├── actions/             # Server Actions (Mutaciones atómicas seguras)
│   ├── app/                 # Next.js App Router (Rutas y Layouts)
│   │   ├── (dashboard)/     # Vistas protegidas por sesión
│   │   │   ├── admin/       # Panel exclusivo de administración
│   │   │   ├── caja/        # Libro de compras/ventas
│   │   │   ├── empleados/   # Gestión de nómina y asistencia
│   │   │   ├── entregas/    # Logística de despacho
│   │   │   ├── inventario/  # Kardex y existencias físicas
│   │   │   ├── planillas/   # Liquidación salarial
│   │   │   ├── produccion/  # Vaciados, hornos y patio
│   │   │   ├── reportes/    # Estadísticas ejecutivas
│   │   │   └── ventas/      # Clientes y pedidos
│   │   ├── login/           # Autenticación de usuarios
│   │   └── proxy.ts         # Middleware de inspección de sesión y rutas
│   ├── components/          # Biblioteca de componentes UI
│   │   ├── layout/          # Sidebar, Header, Breadcrumbs
│   │   └── ui/              # Componentes visuales reutilizables
│   ├── lib/                 # Core utilities, Store, Role Validator, Audit Logger
│   └── types/               # Definiciones de tipos TypeScript e interfaces DB
└── supabase/                # Migraciones SQL y RLS
```

---

## 3. Checklist de Arquitectura para Nuevos Módulos
- [ ] ¿El nuevo módulo respeta la frontera entre Server y Client Components?
- [ ] ¿Las mutaciones se realizan mediante Server Actions tipadas en `src/actions/`?
- [ ] ¿Existe validación con Zod tanto para entradas como para parámetros de consulta?
- [ ] ¿El control de acceso por rol (RBAC) está blindado a nivel de ruta y acción?
- [ ] ¿Se cuenta con logs de auditoría para operaciones críticas?
- [ ] ¿El código compila limpiamente con `npx tsc --noEmit`?
