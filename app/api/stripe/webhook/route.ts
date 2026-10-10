import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db, recordCoursePurchase } from "@/lib/creator-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" as any });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  // Dois destinos no Stripe: eventos da conta da plataforma (ativação Pro) e das contas
  // conectadas dos criadores (vendas de curso). Cada um tem seu segredo de assinatura.
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);
      break;
    } catch {}
  }
  if (!event) {
    console.error("[stripe webhook] assinatura inválida");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.type === "platform_access") {
        const slug = session.metadata?.slug;
        if (slug && session.payment_status === "paid") {
          const { data: profile } = await db.from("creator_profiles").select("id").eq("slug", slug).maybeSingle();
          if (profile) {
            await db
              .from("creator_profiles")
              .update({ platform_paid: true, platform_paid_at: new Date().toISOString() })
              .eq("id", profile.id);
            await db.from("creator_courses").update({ is_published: true }).eq("creator_id", profile.id);
          }
        }
        return NextResponse.json({ ok: true });
      }

      if (session.metadata?.course_id) {
        const result = await recordCoursePurchase(session);
        if (!result.ok) console.warn("[stripe webhook] compra não registrada:", result.reason, session.id);
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentId = charge.payment_intent as string;
      const { data: sale } = await db
        .from("creator_sales")
        .update({ status: "refunded" })
        .eq("stripe_payment_id", paymentId)
        .select("course_id, student_email")
        .maybeSingle();
      if (sale?.course_id && sale.student_email) {
        await db
          .from("creator_enrollments")
          .update({ status: "refunded" })
          .eq("course_id", sale.course_id)
          .eq("student_email", sale.student_email.toLowerCase());
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      if (account.charges_enabled) {
        await db
          .from("creator_profiles")
          .update({ stripe_onboarding_done: true })
          .eq("stripe_account_id", account.id);
      }
    }
  } catch (err) {
    console.error("[stripe webhook] erro ao processar", event.type, err);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
