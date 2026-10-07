-- ─── Ink Authority: Tabelas para criadores de curso ──────────────────────────
-- Execute este SQL no painel do Supabase: SQL Editor → New Query

-- 1. Perfil do criador
CREATE TABLE IF NOT EXISTS creator_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,                             -- clerk user id (opcional)
  slug text UNIQUE NOT NULL,               -- URL: /c/[slug]
  name text NOT NULL,
  bio text,
  photo_url text,
  specialty text,
  instagram text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Curso do criador
CREATE TABLE IF NOT EXISTS creator_courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  main_promise text,
  description text,
  target_audience text,
  price numeric(10,2),
  price_installments integer DEFAULT 1,
  price_installment_value numeric(10,2),
  checkout_url text,
  video_id text,                            -- Cloudflare Stream ID
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(creator_id)                        -- um curso por criador (MVP)
);

-- 3. Módulos / conteúdo do curso
CREATE TABLE IF NOT EXISTS creator_modules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES creator_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer DEFAULT 0
);

-- 4. Depoimentos
CREATE TABLE IF NOT EXISTS creator_testimonials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES creator_courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  text text NOT NULL,
  stars integer DEFAULT 5 CHECK (stars BETWEEN 1 AND 5),
  photo_url text
);

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────
-- Leitura pública (LP é acessível por qualquer um)
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_testimonials ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública
CREATE POLICY "public_read_profiles" ON creator_profiles FOR SELECT USING (true);
CREATE POLICY "public_read_courses" ON creator_courses FOR SELECT USING (is_published = true);
CREATE POLICY "public_read_modules" ON creator_modules FOR SELECT USING (true);
CREATE POLICY "public_read_testimonials" ON creator_testimonials FOR SELECT USING (true);

-- Escrita via service role key (API route usa service role)
CREATE POLICY "service_write_profiles" ON creator_profiles FOR ALL USING (true);
CREATE POLICY "service_write_courses" ON creator_courses FOR ALL USING (true);
CREATE POLICY "service_write_modules" ON creator_modules FOR ALL USING (true);
CREATE POLICY "service_write_testimonials" ON creator_testimonials FOR ALL USING (true);
