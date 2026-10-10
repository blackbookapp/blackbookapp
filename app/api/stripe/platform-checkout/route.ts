import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { checkIsAdmin } from "@/lib/auth-server";

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
    if (!userId) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const supabase = getSupabase();
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("id, platform_paid, user_id")
      .eq("slug", slug)
      .maybeSingle();

    if (!profile || profile.user_id !== userId) {
      return NextResponse.json({ error: "Página não encontrada." }, { status: 404 });
    }

    const { data: course } = await supabase.from("creator_courses").select("id").eq("creator_id", profile.id).maybeSingle();
    if (!course) {
      return NextResponse.json({ error: "Seu curso ainda não foi salvo. Volte ao passo anterior e salve a página antes de publicar." }, { status: 400 });
    }

    if (profile.platform_paid || (await checkIsAdmin())) {
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
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "platform_access",
        slug,
        user_id: userId,
      },
      success_url: `${appUrl}/painel?ativado=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pagar?slug=${slug}&cancelado=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("[platform-checkout]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
