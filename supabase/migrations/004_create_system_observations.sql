-- Migración 004: Tabla de observaciones del sistema (INCEGUA ERP)
-- Solo los campos del mensaje de observación: Tipo, Título, Detalle, Pantalla, Usuario y Fecha

CREATE TABLE IF NOT EXISTS public.system_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'admin',
    route TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Sugerencia',
    title TEXT NOT NULL,
    description TEXT NOT NULL
);

-- Índice para orden cronológico
CREATE INDEX IF NOT EXISTS idx_system_observations_created_at ON public.system_observations (created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.system_observations ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Permitir insertar observaciones a usuarios autenticados"
ON public.system_observations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir lectura de observaciones"
ON public.system_observations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir actualizar observaciones"
ON public.system_observations FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir eliminar observaciones"
ON public.system_observations FOR DELETE
TO authenticated
USING (true);
