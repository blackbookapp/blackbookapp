-- ═══════════════════════════════════════════════════════════
--  BLACKBOOK — Schema completo v2
--  Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════

-- ── 1. Perfis dos criadores ──────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_profiles (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   text UNIQUE,           -- Clerk user ID
  slug                      text UNIQUE NOT NULL,
  name                      text NOT NULL,
  bio                       text,
  photo_url                 text,
  specialty                 text,
  instagram                 text,
  -- Stripe Connect
  stripe_account_id         text UNIQUE,           -- acct_xxx do criador
  stripe_onboarding_done    boolean DEFAULT false,
  -- Platform access
  platform_paid             boolean DEFAULT false, -- pagou R$ 997 de ativação
  platform_paid_at          timestamptz,
  theme_color               text DEFAULT '#A3A3A3', -- cor de destaque da LP
  -- Meta
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- ── 2. Cursos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_courses (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id                uuid REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title                     text NOT NULL,
  subtitle                  text,
  main_promise              text,
  description               text,
  target_audience           text,
  price                     text,
  price_installments        text,
  price_installment_value   text,
  checkout_url              text,
  video_id                  text,            -- Cloudflare Stream ID (trailer)
  is_published              boolean DEFAULT false,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),
  UNIQUE(creator_id)
);

-- ── 3. Módulos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid REFERENCES creator_courses(id) ON DELETE CASCADE,
  title       text NOT NULL,
  order_index integer DEFAULT 0
);

-- ── 4. Depoimentos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_testimonials (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES creator_courses(id) ON DELETE CASCADE,
  name      text NOT NULL,
  role      text,
  text      text NOT NULL,
  stars     integer DEFAULT 5,
  photo_url text
);

-- ── 5. Vendas (registradas via webhook Stripe) ───────────────
CREATE TABLE IF NOT EXISTS creator_sales (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          uuid REFERENCES creator_profiles(id) ON DELETE CASCADE,
  stripe_payment_id   text UNIQUE,
  amount_total        integer NOT NULL,   -- em centavos
  platform_fee        integer NOT NULL,   -- comissão em centavos
  creator_amount      integer NOT NULL,   -- líquido do criador
  currency            text DEFAULT 'brl',
  student_email       text,
  student_name        text,
  status              text DEFAULT 'paid', -- paid | refunded
  created_at          timestamptz DEFAULT now()
);

-- ── 6. Mídias (vídeos e fotos do criador) ────────────────────
CREATE TABLE IF NOT EXISTS creator_media (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          uuid REFERENCES creator_profiles(id) ON DELETE CASCADE,
  type                text NOT NULL,      -- 'video' | 'image'
  cloudflare_id       text,               -- Cloudflare Stream UID (vídeos)
  url                 text,               -- URL pública
  thumbnail_url       text,
  title               text,
  size_bytes          bigint,
  duration_seconds    integer,            -- só para vídeos
  created_at          timestamptz DEFAULT now()
);

-- ── 7. Log de edições via IA ─────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_ai_edits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  uuid REFERENCES creator_profiles(id) ON DELETE CASCADE,
  prompt      text NOT NULL,
  action      text,       -- ex: 'update_title', 'add_module', etc.
  result      text,
  created_at  timestamptz DEFAULT now()
);

-- ── RLS (Row Level Security) ─────────────────────────────────
ALTER TABLE creator_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_courses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_sales       ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_media       ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_ai_edits    ENABLE ROW LEVEL SECURITY;

-- Leitura pública (LP pública)
CREATE POLICY "public_read_profiles"     ON creator_profiles     FOR SELECT USING (true);
CREATE POLICY "public_read_courses"      ON creator_courses      FOR SELECT USING (is_published = true);
CREATE POLICY "public_read_modules"      ON creator_modules      FOR SELECT USING (true);
CREATE POLICY "public_read_testimonials" ON creator_testimonials FOR SELECT USING (true);

-- Service role tem acesso total (APIs do servidor)
CREATE POLICY "service_all_profiles"     ON creator_profiles     FOR ALL USING (true);
CREATE POLICY "service_all_courses"      ON creator_courses      FOR ALL USING (true);
CREATE POLICY "service_all_modules"      ON creator_modules      FOR ALL USING (true);
CREATE POLICY "service_all_testimonials" ON creator_testimonials FOR ALL USING (true);
CREATE POLICY "service_all_sales"        ON creator_sales        FOR ALL USING (true);
CREATE POLICY "service_all_media"        ON creator_media        FOR ALL USING (true);
CREATE POLICY "service_all_ai_edits"     ON creator_ai_edits     FOR ALL USING (true);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_creator_profiles_slug    ON creator_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_courses_creator  ON creator_courses(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_sales_creator    ON creator_sales(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_media_creator    ON creator_media(creator_id);
