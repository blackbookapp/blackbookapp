import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-06-30.basil" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;
    const type = session.metadata?.type;

    // ── Platform access payment ─────────────────────────────────────────────
    if (type === "platform_access") {
      const slug = session.metadata?.slug;
      if (!slug) return NextResponse.json({ ok: true });

      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("id")
        .eq("slug", slug)
        .single();

      if (profile) {
        // Mark platform as paid and publish the LP
        await supabase
          .from("creator_profiles")
          .update({ platform_paid: true, platform_paid_at: new Date().toISOString() })
          .eq("id", profile.id);

        await supabase
          .from("creator_courses")
          .update({ is_published: true })
          .eq("creator_id", profile.id);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Course sale payment ─────────────────────────────────────────────────
    const slug = session.metadata?.creator_slug;
    if (!slug) return NextResponse.json({ ok: true });

    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("slug", slug)
      .single();

    if (profile) {
      const total = session.amount_total ?? 0;
      const feePct = Number(process.env.PLATFORM_FEE_PERCENT ?? 1) / 100;
      const fee = Math.round(total * feePct);
      await supabase.from("creator_sales").insert({
        creator_id: profile.id,
        stripe_payment_id: session.payment_intent as string,
        amount_total: total,
        platform_fee: fee,
        creator_amount: total - fee,
        student_email: session.customer_details?.email,
        student_name: session.customer_details?.name,
      });
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    await supabase
      .from("creator_sales")
      .update({ status: "refunded" })
      .eq("stripe_payment_id", charge.payment_intent as string);
  }

  return NextResponse.json({ ok: true });
}
