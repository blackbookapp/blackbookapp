import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, getCreatorByUser } from "@/lib/creator-server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ students: [] }, { status: 401 });
  const creator = await getCreatorByUser(userId);
  if (!creator?.course) return NextResponse.json({ students: [], total_lessons: 0 });
  const courseId = creator.course.id;

  const [{ data: enrollments }, { count: totalLessons }, { data: progress }] = await Promise.all([
    db.from("creator_enrollments")
      .select("id, student_email, student_name, user_id, amount_paid, coupon_code, status, created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false }),
    db.from("creator_lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    db.from("creator_lesson_progress").select("user_id").eq("course_id", courseId),
  ]);

  const doneByUser = new Map<string, number>();
  for (const p of progress ?? []) doneByUser.set(p.user_id, (doneByUser.get(p.user_id) ?? 0) + 1);

  const total = totalLessons ?? 0;
  const students = (enrollments ?? []).map((e) => {
    const done = e.user_id ? doneByUser.get(e.user_id) ?? 0 : 0;
    return {
      ...e,
      activated: !!e.user_id,
      completed_lessons: done,
      progress: total ? Math.round((done / total) * 100) : 0,
    };
  });

  return NextResponse.json({ students, total_lessons: total });
}
