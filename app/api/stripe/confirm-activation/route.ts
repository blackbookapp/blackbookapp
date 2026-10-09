import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/creator-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" as any });

// Publica a página no retorno do pagamento da ativação, sem depender só do webhook.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const { session_id } = await req.json();
  if (!session_id) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.metadata?.type !== "platform_access" || session.payment_status !== "paid") {
      return NextResponse.json({ ok: false, pending: true });
    }
    const { data: profile } = await db
      .from("creator_profiles")
      .select("id, user_id")
      .eq("slug", session.metadata.slug)
      .maybeSingle();
    if (!profile || profile.user_id !== userId) return NextResponse.json({ ok: false }, { status: 403 });

    await db
      .from("creator_profiles")
      .update({ platform_paid: true, platform_paid_at: new Date().toISOString() })
      .eq("id", profile.id);
    await db.from("creator_courses").update({ is_published: true }).eq("creator_id", profile.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[confirm-activation]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
