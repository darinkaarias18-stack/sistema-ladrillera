-- Migración 004: Tabla de observaciones del sistema (INCEGUA ERP)
-- Ejecutar en el SQL Editor de Supabase si se desea sincronización en la nube entre múltiples dispositivos

CREATE TABLE IF NOT EXISTS public.system_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'admin',
    route TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Sugerencia',
    priority TEXT NOT NULL DEFAULT 'media',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente',
    admin_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_system_observations_created_at ON public.system_observations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_observations_status ON public.system_observations (status);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.system_observations ENABLE ROW LEVEL SECURITY;

-- Política 1: Cualquier usuario autenticado puede enviar observaciones
CREATE POLICY "Permitir insertar observaciones a usuarios autenticados"
ON public.system_observations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política 2: Permitir lectura a usuarios autenticados
CREATE POLICY "Permitir lectura de observaciones"
ON public.system_observations FOR SELECT
TO authenticated
USING (true);

-- Política 3: Permitir actualización a usuarios autenticados
CREATE POLICY "Permitir actualizar observaciones"
ON public.system_observations FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política 4: Permitir eliminar observaciones
CREATE POLICY "Permitir eliminar observaciones"
ON public.system_observations FOR DELETE
TO authenticated
USING (true);
