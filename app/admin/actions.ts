"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/auth-server";
import { db } from "@/lib/creator-server";

async function guard() {
  if (!(await checkIsAdmin())) throw new Error("Acesso negado.");
}

function refresh(creatorId?: string) {
  revalidatePath("/admin", "layout");
  if (creatorId) revalidatePath(`/admin/criadores/${creatorId}`);
}

export async function setPublished(creatorId: string, published: boolean) {
  await guard();
  await db.from("creator_courses").update({ is_published: published }).eq("creator_id", creatorId);
  refresh(creatorId);
}

export async function setActivation(creatorId: string, paid: boolean) {
  await guard();
  await db
    .from("creator_profiles")
    .update({ platform_paid: paid, platform_paid_at: paid ? new Date().toISOString() : null })
    .eq("id", creatorId);
  await db.from("creator_courses").update({ is_published: paid }).eq("creator_id", creatorId);
  refresh(creatorId);
}

export async function setEnrollmentStatus(enrollmentId: string, status: "active" | "refunded" | "revoked") {
  await guard();
  const { data } = await db
    .from("creator_enrollments")
    .update({ status })
    .eq("id", enrollmentId)
    .select("creator_id")
    .maybeSingle();
  refresh(data?.creator_id);
}

export async function grantAccess(formData: FormData) {
  await guard();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const courseId = String(formData.get("course_id") || "");
  const name = String(formData.get("name") || "").trim() || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !courseId) return;

  const { data: course } = await db.from("creator_courses").select("id, creator_id").eq("id", courseId).maybeSingle();
  if (!course) return;

  await db.from("creator_enrollments").upsert(
    {
      course_id: course.id,
      creator_id: course.creator_id,
      student_email: email,
      student_name: name,
      amount_paid: 0,
      coupon_code: "MANUAL",
      status: "active",
    },
    { onConflict: "course_id,student_email" }
  );
  refresh(course.creator_id);
}
