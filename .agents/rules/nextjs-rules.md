# Reglas para Next.js (App Router)

- **App Router:** Este proyecto usa Next.js App Router. Todo en `src/app/` son Server Components por defecto.
- **Client Components (`"use client"`):** Usa `"use client"` únicamente en componentes de la carpeta `src/components` que estrictamente necesiten estado de React (`useState`), hooks de ciclo de vida (`useEffect`), o manejar eventos del DOM (onClick, onChange). No uses `"use client"` en páginas completas (`page.tsx`) a menos que sea inevitable.
- **Server Actions:** Para formularios y mutaciones de datos, utiliza Server Actions ubicados en `src/actions`. Las Server Actions siempre deben tener la directiva `"use server"` al inicio del archivo.
- **Data Fetching:** Realiza el fetching de datos directamente en los Server Components (`page.tsx` o `layout.tsx`) usando `await`. Evita hacer fetch desde Client Components si puedes pasar los datos como props desde el servidor.
- **Estilos:** Utiliza las clases y el sistema de estilos establecido en el proyecto (por ejemplo, TailwindCSS, si está configurado).
