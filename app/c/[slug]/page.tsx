import { notFound } from "next/navigation";
import CreatorLP from "./CreatorLP";
import { createClient } from "@supabase/supabase-js";

// ─── Fetch creator + course data ──────────────────────────────────────────────
async function getCreatorData(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: profile, error } = await supabase
    .from("creator_profiles")
    .select(`
      *,
      creator_courses (
        *,
        creator_modules ( title, order_index ),
        creator_testimonials ( name, role, text, stars, photo_url )
      )
    `)
    .eq("slug", slug)
    .eq("creator_courses.is_published", true)
    .single();

  if (error || !profile) return null;

  const course = profile.creator_courses?.[0] || null;
  return { profile, course };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCreatorData(slug);
  if (!data) return { title: "Não encontrado" };
  const { profile, course } = data;
  return {
    title: course?.title || `Curso de ${profile.name}`,
    description: course?.main_promise || profile.bio,
  };
}

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCreatorData(slug);
  if (!data) notFound();
  return <CreatorLP profile={data.profile} course={data.course} />;
}
