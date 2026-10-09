import { db, getUserEmails, getEnrolledCourseIds } from "@/lib/creator-server";

/** Returns the user if they can watch the course (enrolled, or it's their own course). */
export async function canAccessCourse(courseId: string) {
  const me = await getUserEmails();
  if (!me) return null;

  const { data: course } = await db
    .from("creator_courses")
    .select("id, creator_profiles(user_id)")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return null;

  const isOwner = (course as any).creator_profiles?.user_id === me.userId;
  if (isOwner) return { ...me, isOwner: true };

  const enrolled = await getEnrolledCourseIds(me.userId, me.emails);
  if (!enrolled.includes(courseId)) return null;

  // Vincula a matrícula ao usuário na primeira vez que ele entra.
  if (me.emails.length) {
    await db
      .from("creator_enrollments")
      .update({ user_id: me.userId })
      .eq("course_id", courseId)
      .in("student_email", me.emails)
      .is("user_id", null);
  }
  return { ...me, isOwner: false };
}
