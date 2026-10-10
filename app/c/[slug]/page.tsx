import { one } from "@/lib/one";
import { notFound } from "next/navigation";
import CreatorLP from "./CreatorLP";
import { db } from "@/lib/creator-server";

export const dynamic = "force-dynamic";

const PUBLIC_PROFILE = "id, slug, name, bio, photo_url, specialty, instagram, theme_color";

async function getCreatorData(slug: string) {
  // "theme" (v4) e "page" (v5) só existem depois dos SQLs; sem elas, usa o layout padrão.
  let res: { data: any; error: any } = await queryCreator(slug, `${PUBLIC_PROFILE}, theme`, ", page");
  if (res.error) res = await queryCreator(slug, `${PUBLIC_PROFILE}, theme`, "");
  if (res.error) res = await queryCreator(slug, PUBLIC_PROFILE, "");
  const profile = res.data;

  if (!profile) return null;
  const course = one((profile as any).creator_courses) || null;
  if (!course) return null;
  return { profile: profile as any, course };
}

function queryCreator(slug: string, profileFields: string, extraCourseFields: string) {
  return db
    .from("creator_profiles")
    .select(`
      ${profileFields},
      creator_courses (
        id, title, subtitle, main_promise, description, target_audience,
        price, price_installments, price_installment_value, video_id, is_published${extraCourseFields},
        creator_modules ( title, order_index ),
        creator_testimonials ( name, role, text, stars, photo_url )
      )
    `)
    .eq("slug", slug)
    .eq("creator_courses.is_published", true)
    .maybeSingle();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCreatorData(slug);
  if (!data) return { title: "Não encontrado" };
  const { profile, course } = data;
  return {
    title: course?.title || `Curso de ${profile.name}`,
    description: course?.main_promise || profile.bio,
    openGraph: {
      title: course?.title,
      description: course?.main_promise || profile.bio,
      images: profile.photo_url ? [profile.photo_url] : undefined,
    },
  };
}

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCreatorData(slug);
  if (!data) notFound();
  return <CreatorLP profile={data.profile} course={data.course} />;
}
