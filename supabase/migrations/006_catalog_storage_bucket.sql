-- Bucket de Supabase Storage para imágenes del Catálogo de Productos
-- Límite máximo estricto de 250 KB (256000 bytes) por archivo

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalog-images',
  'catalog-images',
  true,
  256000,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = 256000,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];
