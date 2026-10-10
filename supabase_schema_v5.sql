-- ═══════════════════════════════════════════════════════════
--  BLACKBOOK — Schema v5: layout da LP em seções (editado pela IA)
--  Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════════════════
ALTER TABLE creator_courses ADD COLUMN IF NOT EXISTS page jsonb;

-- Garante a coluna de tema do v4, caso ainda não tenha rodado.
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{}'::jsonb;
