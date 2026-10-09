import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/creator-server";

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (typeof slug !== "string" || !slug) return NextResponse.json({ ok: false }, { status: 400 });
    const ua = req.headers.get("user-agent") || "";
    if (/bot|crawl|spider|preview|facebookexternalhit/i.test(ua)) return NextResponse.json({ ok: true });

    const { data: profile } = await db.from("creator_profiles").select("id").eq("slug", slug).maybeSingle();
    if (profile) await db.from("creator_page_views").insert({ creator_id: profile.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
