import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" as any });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { slug } = await req.json();

  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("*, creator_courses(*)")
    .eq("slug", slug)
    .single();

  if (!profile || !profile.stripe_account_id) {
    return NextResponse.json({ error: "Creator not found or Stripe not connected" }, { status: 404 });
  }

  const course = profile.creator_courses?.[0];
  if (!course) return NextResponse.json({ error: "No course found" }, { status: 404 });

  const priceInCents = Math.round(parseFloat(course.price.replace(/[^0-9,]/g, "").replace(",", ".")) * 100);
  const feePct = Number(process.env.PLATFORM_FEE_PERCENT ?? 8) / 100;
  const applicationFee = Math.round(priceInCents * feePct);

  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: { name: course.title, description: course.main_promise || undefined },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/c/${slug}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/c/${slug}`,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: profile.stripe_account_id },
      },
      metadata: { creator_slug: slug, course_id: course.id },
    }
  );

  return NextResponse.json({ url: session.url });
}
