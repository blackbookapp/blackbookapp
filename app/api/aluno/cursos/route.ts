import { NextResponse } from "next/server";
import { db, getUserEmails, getEnrolledCourseIds } from "@/lib/creator-server";

export async function GET() {
  const me = await getUserEmails();
  if (!me) return NextResponse.json({ courses: [] }, { status: 401 });

  const courseIds = await getEnrolledCourseIds(me.userId, me.emails);
  if (!courseIds.length) return NextResponse.json({ courses: [] });

  const { data: courses } = await db
    .from("creator_courses")
    .select("id, title, subtitle, main_promise, creator_profiles(name, photo_url, slug, theme_color)")
    .in("id", courseIds);

  const { data: lessons } = await db.from("creator_lessons").select("id, course_id").in("course_id", courseIds);
  const { data: done } = await db
    .from("creator_lesson_progress")
    .select("lesson_id, course_id")
    .eq("user_id", me.userId)
    .in("course_id", courseIds);

  const result = (courses ?? []).map((c: any) => {
    const total = (lessons ?? []).filter((l) => l.course_id === c.id).length;
    const completed = (done ?? []).filter((d) => d.course_id === c.id).length;
    return {
      id: c.id,
      title: c.title,
      subtitle: c.subtitle || c.main_promise,
      creator: c.creator_profiles,
      total_lessons: total,
      completed_lessons: completed,
      progress: total ? Math.round((completed / total) * 100) : 0,
    };
  });

  return NextResponse.json({ courses: result });
}
