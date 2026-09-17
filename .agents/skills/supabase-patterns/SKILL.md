---
name: supabase-patterns
description: Muestra los patrones comunes, convenciones y mejores prácticas para utilizar Supabase en este proyecto Next.js.
---

# Supabase Patterns Cheatsheet

Esta habilidad proporciona patrones aprobados para usar el cliente de Supabase dentro del entorno Next.js App Router (Server y Client components).

## Inicialización (Server-side)

```typescript
// Ejemplo de uso en src/actions/example.ts
"use server"

import { createClient } from '@/lib/supabase/server'

export async function createItem(formData: FormData) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('items')
    .insert([{ name: formData.get('name') }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

## Data Fetching (Server Components)

```typescript
// Ejemplo en src/app/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient();
  const { data: items, error } = await supabase.from('items').select('*');

  if (error) {
    return <div>Error al cargar datos: {error.message}</div>;
  }

  return (
    <ul>
      {items?.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  )
}
```

## Obtener el Usuario Autenticado (Server)

```typescript
const supabase = await createClient();
// getUser() es más seguro que getSession() ya que verifica el token con el servidor
const { data: { user }, error } = await supabase.auth.getUser();

if (!user) {
  // Manejar caso no autenticado
}
```

## Real-time Suscriptions (Client Components)

Si es estrictamente necesario, puedes suscribirte a cambios desde el cliente:

```typescript
"use client"
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function RealTimeList() {
  const [items, setItems] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
        console.log('Change received!', payload);
        // Lógica para actualizar estado
      })
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [supabase]);

  return <div>Componente en tiempo real</div>;
}
```
