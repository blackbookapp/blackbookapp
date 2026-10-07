import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" });

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ error: "slug obrigatório" }, { status: 400 });

    const { userId } = await auth();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Check if already paid
    const supabase = getSupabase();
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("id, platform_paid")
      .eq("slug", slug)
      .single();

    if (profile?.platform_paid) {
      // Already paid — just publish the LP and redirect to painel
      await supabase.from("creator_profiles").update({ platform_paid: true }).eq("id", profile.id);
      await supabase.from("creator_courses").update({ is_published: true }).eq("creator_id", profile.id);
      return NextResponse.json({ url: `${appUrl}/painel?ativado=true` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: 99700, // R$ 997.00
            product_data: {
              name: "Blackbook — Ativação da Plataforma",
              description: "Acesso vitalício + publicação da sua landing page de cursos",
              images: [`${appUrl}/og-blackbook.png`],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "platform_access",
        slug,
        ...(userId ? { user_id: userId } : {}),
      },
      success_url: `${appUrl}/painel?ativado=true&slug=${slug}`,
      cancel_url: `${appUrl}/pagar?slug=${slug}&cancelado=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("[platform-checkout]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
