import { one } from "@/lib/one";
import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import type Stripe from "stripe";
import { sendEmail } from "@/lib/email";

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 1);

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://blackbookapp.com.br").replace(/\/$/, "");
}

/** "297", "297,90", "R$ 1.297,90", 297.9 → centavos */
export function priceToCents(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Math.round(value * 100);
  let s = String(value).replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function getCreatorByUser(userId: string) {
  const { data } = await db
    .from("creator_profiles")
    .select("*, creator_courses(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { profile: data, course: one(data.creator_courses) ?? null };
}

/** Updates module titles in place by position so lessons attached to them survive. */
export async function syncModules(courseId: string, titles: string[]) {
  const clean = titles.map((t) => t.trim()).filter(Boolean);
  const { data: existing } = await db
    .from("creator_modules")
    .select("id, order_index")
    .eq("course_id", courseId)
    .order("order_index");
  const current = existing ?? [];

  for (let i = 0; i < clean.length; i++) {
    if (current[i]) {
      await db.from("creator_modules").update({ title: clean[i], order_index: i }).eq("id", current[i].id);
    } else {
      await db.from("creator_modules").insert({ course_id: courseId, title: clean[i], order_index: i });
    }
  }
  const extra = current.slice(clean.length).map((m) => m.id);
  if (extra.length) await db.from("creator_modules").delete().in("id", extra);
}

/** Verified e-mails of the signed-in user, lowercase. */
export async function getUserEmails(): Promise<{ userId: string; emails: string[]; name: string } | null> {
  const user = await currentUser();
  if (!user) return null;
  const emails = user.emailAddresses
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());
  return { userId: user.id, emails, name: user.fullName || user.firstName || "" };
}

/** Course IDs the signed-in user can access as a student. */
export async function getEnrolledCourseIds(userId: string, emails: string[]) {
  const filters = [`user_id.eq.${userId}`];
  if (emails.length) filters.push(`student_email.in.(${emails.map((e) => `"${e}"`).join(",")})`);
  const { data } = await db
    .from("creator_enrollments")
    .select("course_id")
    .eq("status", "active")
    .or(filters.join(","));
  return Array.from(new Set((data ?? []).map((r) => r.course_id as string)));
}

/**
 * Grants access + records the sale for a paid course checkout. Safe to call
 * more than once for the same session (webhook and thank-you page both call it).
 */
export async function recordCoursePurchase(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return { ok: false as const, reason: "not_paid" };
  const courseId = session.metadata?.course_id;
  const creatorId = session.metadata?.creator_id;
  const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
  if (!courseId || !creatorId || !email) return { ok: false as const, reason: "missing_data" };

  const total = session.amount_total ?? 0;
  const fee = Number(session.metadata?.platform_fee ?? Math.round(total * (PLATFORM_FEE_PERCENT / 100)));
  const coupon = session.metadata?.coupon || null;
  const paymentId = (session.payment_intent as string) || session.id;
  const name = session.customer_details?.name || null;

  const { data: existingSale } = await db
    .from("creator_sales")
    .select("id")
    .eq("stripe_payment_id", paymentId)
    .maybeSingle();
  const isNew = !existingSale;

  if (isNew) {
    await db.from("creator_sales").insert({
      creator_id: creatorId,
      course_id: courseId,
      stripe_payment_id: paymentId,
      amount_total: total,
      platform_fee: fee,
      creator_amount: total - fee,
      student_email: email,
      student_name: name,
      coupon_code: coupon,
    });
    if (coupon) await db.rpc("increment_coupon_use", { p_course_id: courseId, p_code: coupon });
  }

  await db.from("creator_enrollments").upsert(
    {
      course_id: courseId,
      creator_id: creatorId,
      student_email: email,
      student_name: name,
      user_id: session.metadata?.user_id || null,
      stripe_session_id: session.id,
      amount_paid: total,
      coupon_code: coupon,
      status: "active",
    },
    { onConflict: "course_id,student_email" }
  );

  if (isNew) {
    const { data: course } = await db
      .from("creator_courses")
      .select("title, creator_profiles(name)")
      .eq("id", courseId)
      .single();
    const courseTitle = course?.title || "seu curso";
    const creatorName = (course as any)?.creator_profiles?.name || "";
    const link = `${appUrl()}/entrar?modo=cadastro&redirect_url=${encodeURIComponent("/dashboard/courses")}`;
    await sendEmail({
      to: email,
      subject: `Seu acesso a "${courseTitle}" está liberado`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">
          <h2>Compra confirmada! 🎉</h2>
          <p>Olá${name ? `, ${name.split(" ")[0]}` : ""}! Seu acesso ao curso <b>${courseTitle}</b>${creatorName ? ` de ${creatorName}` : ""} já está liberado.</p>
          <p>Para assistir, crie sua conta (ou entre) na Blackbook usando <b>este mesmo e-mail: ${email}</b>.</p>
          <p style="margin:28px 0"><a href="${link}" style="background:#111;color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Acessar meu curso</a></p>
          <p style="color:#666;font-size:12px">Blackbook — plataforma de cursos de tatuagem.</p>
        </div>`,
    });
  }

  return { ok: true as const, email, courseId };
}

/** Signed playback token for a private Cloudflare Stream video. Falls back to the raw UID. */
export async function streamPlaybackId(videoId: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token || !videoId) return videoId;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/token`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 6 * 60 * 60 }),
      }
    );
    const json = await res.json();
    return json?.result?.token || videoId;
  } catch {
    return videoId;
  }
}
