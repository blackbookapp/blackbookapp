import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/creator-server";
import { canAccessCourse } from "@/lib/student-access";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await canAccessCourse(id);
  if (!me) return NextResponse.json({ error: "Você não tem acesso a este curso." }, { status: 403 });

  const { data: course } = await db
    .from("creator_courses")
    .select("id, title, subtitle, description, creator_profiles(name, photo_url, slug, instagram, theme_color)")
    .eq("id", id)
    .single();

  const { data: modules } = await db
    .from("creator_modules")
    .select("id, title, order_index")
    .eq("course_id", id)
    .order("order_index");

  const { data: lessons } = await db
    .from("creator_lessons")
    .select("id, module_id, title, description, video_id, materials, order_index")
    .eq("course_id", id)
    .order("order_index");

  const { data: progress } = await db
    .from("creator_lesson_progress")
    .select("lesson_id")
    .eq("user_id", me.userId)
    .eq("course_id", id);

  return NextResponse.json({
    course: { ...course, creator: (course as any)?.creator_profiles },
    isOwner: me.isOwner,
    completed: (progress ?? []).map((p) => p.lesson_id),
    modules: (modules ?? []).map((m) => ({
      ...m,
      lessons: (lessons ?? [])
        .filter((l) => l.module_id === m.id)
        .map(({ video_id, ...l }) => ({ ...l, has_video: !!video_id })),
    })),
  });
}
