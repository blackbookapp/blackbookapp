-- ═══════════════════════════════════════════════════════════
--  BLACKBOOK — Schema v4: tema completo da LP (fundo, texto, destaque, botões)
--  Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════════════════
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{}'::jsonb;
