import { db } from "@/lib/creator-server";

export async function loadSales({ q = "", status = "todos", creator = "" }: { q?: string; status?: string; creator?: string }) {
  let query = db
    .from("creator_sales")
    .select("*, creator_profiles(id, name, slug), creator_courses(title)")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (status === "pagas") query = query.eq("status", "paid");
  if (status === "estornadas") query = query.eq("status", "refunded");
  if (creator) query = query.eq("creator_id", creator);
  const { data } = await query;

  const term = q.toLowerCase();
  return (data ?? []).filter(
    (s: any) =>
      !term ||
      [s.student_email, s.student_name, s.creator_profiles?.name, s.coupon_code, s.stripe_payment_id].some((v) =>
        (v || "").toLowerCase().includes(term)
      )
  );
}
