import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, getCreatorByUser } from "@/lib/creator-server";

const DAYS = 30;

function dayKey(d: Date) {
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const creator = await getCreatorByUser(userId);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const [{ count: views }, { data: sales }, { count: students }] = await Promise.all([
    db.from("creator_page_views").select("id", { count: "exact", head: true })
      .eq("creator_id", creator.profile.id).gte("created_at", since.toISOString()),
    db.from("creator_sales").select("amount_total, creator_amount, status, created_at")
      .eq("creator_id", creator.profile.id).gte("created_at", since.toISOString()),
    db.from("creator_enrollments").select("id", { count: "exact", head: true })
      .eq("creator_id", creator.profile.id).eq("status", "active"),
  ]);

  const paid = (sales ?? []).filter((s) => s.status === "paid");
  const series: { day: string; revenue: number; sales: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    series.push({ day: dayKey(new Date(Date.now() - i * 86400000)), revenue: 0, sales: 0 });
  }
  const byDay = new Map(series.map((s) => [s.day, s]));
  for (const s of paid) {
    const bucket = byDay.get(dayKey(new Date(s.created_at)));
    if (bucket) {
      bucket.revenue += s.creator_amount;
      bucket.sales += 1;
    }
  }

  const v = views ?? 0;
  return NextResponse.json({
    views_30d: v,
    sales_30d: paid.length,
    revenue_30d: paid.reduce((a, s) => a + s.creator_amount, 0),
    conversion_30d: v ? Math.round((paid.length / v) * 1000) / 10 : 0,
    active_students: students ?? 0,
    series,
  });
}
