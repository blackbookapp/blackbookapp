-- ═══════════════════════════════════════════════════════════
--  BLACKBOOK — Schema v3 (aulas, matrículas, progresso, cupons, visitas)
--  Rode DEPOIS do v2, no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════════════════

-- ── Segurança: as policies "service_all_*" do v2 liberavam escrita para
--    qualquer um com a chave pública (anon). A service role ignora RLS,
--    então elas não são necessárias.
DROP POLICY IF EXISTS "service_all_profiles"     ON creator_profiles;
DROP POLICY IF EXISTS "service_all_courses"      ON creator_courses;
DROP POLICY IF EXISTS "service_all_modules"      ON creator_modules;
DROP POLICY IF EXISTS "service_all_testimonials" ON creator_testimonials;
DROP POLICY IF EXISTS "service_all_sales"        ON creator_sales;
DROP POLICY IF EXISTS "service_all_media"        ON creator_media;
DROP POLICY IF EXISTS "service_all_ai_edits"     ON creator_ai_edits;

-- ── Aulas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_lessons (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        uuid NOT NULL REFERENCES creator_courses(id) ON DELETE CASCADE,
  module_id        uuid NOT NULL REFERENCES creator_modules(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  video_id         text,                    -- Cloudflare Stream UID (privado)
  materials        jsonb DEFAULT '[]'::jsonb, -- [{ name, url }]
  order_index      integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_creator_lessons_module ON creator_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_creator_lessons_course ON creator_lessons(course_id);

-- ── Matrículas (acesso do aluno ao curso) ────────────────────
CREATE TABLE IF NOT EXISTS creator_enrollments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          uuid NOT NULL REFERENCES creator_courses(id) ON DELETE CASCADE,
  creator_id         uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  student_email      text NOT NULL,          -- sempre minúsculo
  student_name       text,
  user_id            text,                   -- Clerk user ID (quando conhecido)
  stripe_session_id  text,
  amount_paid        integer,                -- centavos
  coupon_code        text,
  status             text DEFAULT 'active',  -- active | refunded
  created_at         timestamptz DEFAULT now(),
  UNIQUE (course_id, student_email)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_email   ON creator_enrollments(student_email);
CREATE INDEX IF NOT EXISTS idx_enrollments_user    ON creator_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_creator ON creator_enrollments(creator_id);

-- ── Progresso por aula ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_lesson_progress (
  user_id       text NOT NULL,
  lesson_id     uuid NOT NULL REFERENCES creator_lessons(id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES creator_courses(id) ON DELETE CASCADE,
  completed_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_course ON creator_lesson_progress(course_id);

-- ── Cupons de desconto ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_coupons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid NOT NULL REFERENCES creator_courses(id) ON DELETE CASCADE,
  code         text NOT NULL,               -- sempre MAIÚSCULO
  percent_off  integer NOT NULL CHECK (percent_off BETWEEN 1 AND 90),
  max_uses     integer,                     -- null = ilimitado
  uses         integer DEFAULT 0,
  expires_at   timestamptz,
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (course_id, code)
);

-- ── Visitas da LP (para taxa de conversão) ───────────────────
CREATE TABLE IF NOT EXISTS creator_page_views (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  creator_id  uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_page_views_creator ON creator_page_views(creator_id, created_at);

-- ── Vendas: ligar ao curso e ao cupom ────────────────────────
ALTER TABLE creator_sales ADD COLUMN IF NOT EXISTS course_id   uuid REFERENCES creator_courses(id) ON DELETE SET NULL;
ALTER TABLE creator_sales ADD COLUMN IF NOT EXISTS coupon_code text;

-- ── Incremento atômico de uso do cupom ───────────────────────
CREATE OR REPLACE FUNCTION increment_coupon_use(p_course_id uuid, p_code text)
RETURNS void LANGUAGE sql AS $$
  UPDATE creator_coupons SET uses = uses + 1
  WHERE course_id = p_course_id AND code = p_code;
$$;

-- ── RLS: novas tabelas só acessíveis pelo servidor (service role) ──
ALTER TABLE creator_lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_coupons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_page_views      ENABLE ROW LEVEL SECURITY;
