import { notFound } from "next/navigation";
import CreatorLP from "../CreatorLP";
import { createClient } from "@supabase/supabase-js";

async function getCreatorDataDraft(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    .single();

  if (error || !profile) return null;
  const course = profile.creator_courses?.[0] || null;
  return { profile, course };
}

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCreatorDataDraft(slug);
  if (!data) notFound();
  return <CreatorLP profile={data.profile} course={data.course} isPreview />;
}
