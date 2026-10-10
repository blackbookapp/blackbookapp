import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, priceToCents, appUrl } from "@/lib/creator-server";
import { platformFeeCents } from "@/lib/plans";
import { one } from "@/lib/one";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" as any });

async function findCoupon(courseId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  const { data } = await db
    .from("creator_coupons")
    .select("*")
    .eq("course_id", courseId)
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  if (data.max_uses && data.uses >= data.max_uses) return null;
  return data;
}

async function loadCourse(slug: string) {
  const { data: profile } = await db
    .from("creator_profiles")
    .select("id, name, stripe_account_id, stripe_onboarding_done, platform_paid, creator_courses(*)")
    .eq("slug", slug)
    .maybeSingle();
  return { profile, course: one((profile as any)?.creator_courses) as any };
}

// GET /api/stripe/checkout?slug=x&coupon=y — valida cupom e devolve o preço final
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  const code = req.nextUrl.searchParams.get("coupon") || "";
  const { course } = await loadCourse(slug);
  if (!course) return NextResponse.json({ valid: false }, { status: 404 });
  const coupon = await findCoupon(course.id, code);
  if (!coupon) return NextResponse.json({ valid: false });
  const base = priceToCents(course.price);
  const final = Math.round(base * (1 - coupon.percent_off / 100));
  return NextResponse.json({ valid: true, code: coupon.code, percent_off: coupon.percent_off, final_cents: final });
}

export async function POST(req: NextRequest) {
  const { slug, coupon: couponCode } = await req.json();
  const { profile, course } = await loadCourse(slug);

  if (!profile || !course) {
    return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });
  }
  if (!course.is_published) {
    return NextResponse.json({ error: "Este curso ainda não está à venda." }, { status: 400 });
  }
  if (!profile.stripe_account_id || !profile.stripe_onboarding_done) {
    return NextResponse.json(
      { error: "O criador ainda não ativou o recebimento de pagamentos. Tente novamente mais tarde." },
      { status: 400 }
    );
  }

  const baseCents = priceToCents(course.price);
  if (baseCents < 100) {
    return NextResponse.json({ error: "Preço do curso inválido." }, { status: 400 });
  }

  const coupon = couponCode ? await findCoupon(course.id, couponCode) : null;
  if (couponCode && !coupon) {
    return NextResponse.json({ error: "Cupom inválido ou expirado." }, { status: 400 });
  }
  const amount = coupon ? Math.round(baseCents * (1 - coupon.percent_off / 100)) : baseCents;
  // Plano Grátis: 5%; Plano Pro: 0%.
  const applicationFee = platformFeeCents(amount, profile.platform_paid);

  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const email = user?.primaryEmailAddress?.emailAddress;

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    ...(email ? { customer_email: email } : {}),
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: course.title,
            description: course.main_promise || `Curso de ${profile.name}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl()}/c/${slug}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/c/${slug}`,
    // Cobrança direta na conta do criador: a taxa do Stripe sai dele; a plataforma recebe só a comissão.
    ...(applicationFee > 0 ? { payment_intent_data: { application_fee_amount: applicationFee } } : {}),
    metadata: {
      type: "course_sale",
      creator_slug: slug,
      creator_id: profile.id,
      course_id: course.id,
      platform_fee: String(applicationFee),
      coupon: coupon?.code || "",
      user_id: userId || "",
    },
  };

  const onCreator = { stripeAccount: profile.stripe_account_id as string };

  // Parcelamento no cartão (contas Stripe do Brasil). Se o Stripe recusar, cobra à vista.
  let session: Stripe.Checkout.Session;
  if ((Number(course.price_installments) || 0) > 1) {
    try {
      session = await stripe.checkout.sessions.create({
        ...params,
        payment_method_options: { card: { installments: { enabled: true } } },
      }, onCreator);
    } catch (e: any) {
      console.warn("[checkout] parcelamento indisponível, seguindo à vista:", e?.message);
      session = await stripe.checkout.sessions.create(params, onCreator);
    }
  } else {
    session = await stripe.checkout.sessions.create(params, onCreator);
  }

  return NextResponse.json({ url: session.url });
}
