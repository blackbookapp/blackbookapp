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

  const query = (fields: string, extraCourseFields = "") =>
    db
      .from("creator_profiles")
      .select(`
        ${fields},
        creator_courses (
          id, title, subtitle, main_promise, description, target_audience,
          price, price_installments, price_installment_value, video_id, is_published${extraCourseFields},
          creator_modules ( title, order_index ),
          creator_testimonials ( name, role, text, stars, photo_url )
        )
      `)
      .eq("slug", slug)
      .maybeSingle();
  const base = "id, user_id, slug, name, bio, photo_url, specialty, instagram, theme_color";
  let res: { data: any; error: any } = await query(`${base}, theme`, ", page");
  if (res.error) res = await query(`${base}, theme`);
  if (res.error) res = await query(base);
  const profile = res.data as any;

  if (!profile) notFound();
  if (profile.user_id !== userId && !(await checkIsAdmin())) notFound();

  const { user_id: _omit, ...publicProfile } = profile as any;
  return <CreatorLP profile={publicProfile} course={(profile as any).creator_courses?.[0] || null} isPreview />;
}
