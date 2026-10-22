# 🧱 Ecosistema de Agentes Especializados - INCEGUA S.R.L. (ERP Fábrica de Ladrillos)

Este documento describe la arquitectura, responsabilidades y orquestación del set completo de **12 Agentes Especializados** y sus habilidades (**Skills**) desplegados para gobernar, blindar, refactorizar y automatizar el ERP industrial de **INCEGUA S.R.L.**, disponible en producción en:
🔗 **[https://sistema-ladrillera.vercel.app](https://sistema-ladrillera.vercel.app)**

---

## 🗺️ Matriz del Ecosistema de los 12 Agentes

| # | Agente | Skill Identificador | Especialidad & Misión |
|---|---|---|---|
| **1** | **Product Manager** | `product-manager` | **Estrategia & Operaciones:** Traduce las necesidades de la fábrica (vaciados, quemas en hornos, patio de secado, destajo, caja) en especificaciones y User Stories. |
| **2** | **UX/UI Designer** | `ux-ui-designer` | **Diseño Industrial:** Diseña interfaces limpias, ergonómicas y de alto contraste (paleta pizarra/ladrillo terracota) optimizadas para planta y administración. |
| **3** | **Software Architect** | `software-architect` | **Arquitectura Técnica:** Estructura modular en Next.js 16 (App Router / Turbopack), Server Components, Server Actions seguras y separación de fronteras. |
| **4** | **Developer** | `developer` | **Desarrollo Full-Stack:** Codifica y refactoriza con TypeScript estricto (cero `any`), validaciones Zod, manejo integral de errores y componentes reactivos. |
| **5** | **Database Specialist** | `database-specialist` | **Datos & Esquemas:** Diseña, optimiza y audita esquemas relacionales (SQL / PostgreSQL / Supabase), garantiza transacciones ACID, índices e integridad referencial. |
| **6** | **Supabase / Backend Specialist** | `supabase-backend` | **Backend & Auth:** Gestiona autenticación SSR con cookies seguras, persistencia de sesiones, sincronización de roles y políticas Row Level Security (RLS). |
| **7** | **Security Agent** | `security-agent` | **Blindaje & Zero Trust [CRÍTICO]:** Barrera de autenticación extrema, detección de intrusiones, protección de rutas `/admin/...` y emisión de alertas de seguridad. |
| **8** | **QA Agent & Error Tracking** | `qa-reviewer` | **Calidad & Pen-Testing:** Auditoría estricta de código, pruebas de penetración en lógica de negocio y captura centralizada de errores (Error Boundaries). |
| **9** | **Data Seeding & Migration Specialist** | `data-seeder` | **Siembra & Migración:** Crea y custodia herramientas controladas de siembra de datos de prueba realistas para la ladrillera, con bloqueo total en producción. |
| **10** | **Audit & Activity Logs Manager** | `audit-logger` | **Trazabilidad & Auditoría:** Diseña y supervisa registros inmutables de auditoría de cada acción crítica (modificaciones en caja, salarios, inventario). |
| **11** | **Code & Database Sync Specialist** | `code-db-sync` | **Sincronización Código-BD:** Mantiene sincronía perfecta entre código TypeScript, esquemas Zod y migraciones SQL sin "schema drift". |
| **12** | **GitHub & CI/CD Specialist** | `github-devops` | **Automatización DevOps [NUEVO]:** Control bidireccional con GitHub, validación automatizada previa al merge (CI) y sincronización continua de despliegues a Vercel. |

---

## 🔄 Flujo de Trabajo y Orquestación

El ciclo de desarrollo y entrega continua sigue este conducto orquestado entre los agentes:

```
[ Planta Industrial ]
        │
        ▼
1. Product Manager ──────► 2. UX/UI Designer
        │                         │
        └──────────────┬──────────┘
                       ▼
              3. Software Architect
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
4. Developer ◄──────────────── 5. Database Specialist
       │                               │
       │                               ▼
       │                      6. Supabase / Backend
       │                               │
       ▼                               ▼
7. Security Agent ───────────► 8. QA & Error Tracking
       │                               │
       ▼                               ▼
9. Data Seeder & Migrations ──► 10. Audit & Activity Logs
       │                               │
       └──────────────┬────────────────┘
                      ▼
            11. Code & DB Sync
                      │
                      ▼
      12. GitHub & CI/CD Automation
         (GitHub Actions CI Gate)
                      │
                      ▼ [Auto-Deploy]
       Vercel (https://sistema-ladrillera.vercel.app)
```

---

## 🛠️ Cómo Invocar a Cada Agente

Puedes activar a cualquier agente directamente en tu consulta solicitando su rol o su habilidad:

* **Estrategia y requerimientos:** *"Actúa como Product Manager y redacta la historia de usuario para el control de quemas en hornos Hoffman."*
* **Diseño ergonómico:** *"Como UX/UI Designer, propón un componente de alta densidad para la vista de entregas en patio."*
* **Arquitectura de código:** *"Invoca al Software Architect para planificar la estructura de un nuevo submódulo."*
* **Desarrollo y refactorización:** *"Como Developer, construye la Server Action con validación Zod y tipado estricto."*
* **Esquemas y consultas:** *"Como Database Specialist, audita los índices de la tabla de movimientos de inventario."*
* **Supabase y RLS:** *"Como Supabase Specialist, define las políticas RLS para que solo cajeros registren ventas."*
* **Blindaje y seguridad:** *"Actúa como Security Agent y audita el acceso no autorizado a rutas /admin/... y Server Actions."*
* **Pruebas y QA:** *"Como QA Agent, realiza una revisión de código y prueba de penetración en la Server Action de empleados."*
* **Semillas de datos:** *"Como Data Seeder, genera un script de prueba con 50 lotes de ladrillos sin afectar producción."*
* **Logs y trazabilidad:** *"Como Audit Logger, audita la traza de eventos generados al anular un pedido."*
* **Sincronización:** *"Como Code & DB Sync Specialist, verifica que los tipos TypeScript coincidan con la migración SQL."*
* **DevOps y GitHub:** *"Como GitHub DevOps Specialist, valida el estado del commit, el pipeline de CI/CD y el despliegue en Vercel."*

---

## 🛡️ Reglas de Seguridad y Preservación del Sistema
1. **La estructura del sistema se preserva íntegramente:** Ninguna ruta, módulo ni lógica existente en `src/` ha sido alterada indebidamente.
2. **Ambiente de Producción Inviolable:** Todas las herramientas de pruebas o seeders cuentan con guardas estrictas `NODE_ENV !== 'production'`.
3. **Calidad Continua:** Cada cambio debe compilar con 0 errores vía `npx tsc --noEmit` y aprobar el pipeline de GitHub Actions antes de desplegarse en Vercel.
