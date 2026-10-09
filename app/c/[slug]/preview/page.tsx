export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import CreatorLP from "../CreatorLP";
import { db } from "@/lib/creator-server";
import { checkIsAdmin } from "@/lib/auth-server";

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { userId } = await auth();
  if (!userId) notFound();

  const { data: profile } = await db
    .from("creator_profiles")
    .select(`
      id, user_id, slug, name, bio, photo_url, specialty, instagram, theme_color,
      creator_courses (
        id, title, subtitle, main_promise, description, target_audience,
        price, price_installments, price_installment_value, video_id, is_published,
        creator_modules ( title, order_index ),
        creator_testimonials ( name, role, text, stars, photo_url )
      )
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (!profile) notFound();
  if (profile.user_id !== userId && !(await checkIsAdmin())) notFound();

  const { user_id: _omit, ...publicProfile } = profile as any;
  return <CreatorLP profile={publicProfile} course={(profile as any).creator_courses?.[0] || null} isPreview />;
}
