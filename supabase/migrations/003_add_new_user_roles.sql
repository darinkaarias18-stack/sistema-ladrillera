-- =================================================================
-- ERP FÁBRICA DE LADRILLOS - MIGRACIÓN 003
-- Nuevos roles de usuario para el sistema
-- =================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cajero';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'entrega_recepcion';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ing_produccion';
