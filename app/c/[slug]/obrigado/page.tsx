import Link from "next/link";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { CheckCircle2, Mail, ArrowRight, Clock } from "lucide-react";
import { db, recordCoursePurchase } from "@/lib/creator-server";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" as any });

export default async function ObrigadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id } = await searchParams;

  let email = "";
  let paid = false;
  let courseTitle = "";

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.metadata?.creator_slug === slug) {
        email = (session.customer_details?.email || "").toLowerCase();
        paid = session.payment_status === "paid";
        if (paid) await recordCoursePurchase(session);
        const { data } = await db
          .from("creator_courses")
          .select("title")
          .eq("id", session.metadata?.course_id)
          .maybeSingle();
        courseTitle = data?.title || "";
      }
    } catch (e) {
      console.error("[obrigado] sessão inválida", e);
    }
  }

  const { userId } = await auth();
  const accessHref = userId
    ? "/dashboard/courses"
    : `/entrar?modo=cadastro&redirect_url=${encodeURIComponent("/dashboard/courses")}`;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center glass rounded-3xl border border-white/10 p-10">
        {paid ? (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-5" />
            <h1 className="text-2xl font-black mb-2">Compra confirmada!</h1>
            <p className="text-muted-foreground mb-6">
              Seu acesso{courseTitle ? <> a <b className="text-white">{courseTitle}</b></> : ""} já está liberado.
            </p>
            {email && (
              <div className="flex items-start gap-3 text-left bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-white/80">
                  {userId ? "Entre" : "Crie sua conta"} na Blackbook com <b className="text-white">{email}</b> —
                  é por esse e-mail que reconhecemos sua compra.
                </p>
              </div>
            )}
            <Link
              href={accessHref}
              className="inline-flex items-center justify-center w-full h-12 rounded-xl metallic-gradient text-black font-bold uppercase tracking-widest text-[11px]"
            >
              Acessar meu curso <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </>
        ) : (
          <>
            <Clock className="w-14 h-14 text-yellow-400 mx-auto mb-5" />
            <h1 className="text-2xl font-black mb-2">Pagamento em processamento</h1>
            <p className="text-muted-foreground mb-6">
              Assim que o pagamento for confirmado, seu acesso é liberado automaticamente e você recebe um e-mail.
            </p>
            <Link href={`/c/${slug}`} className="text-sm text-primary hover:underline">
              Voltar para a página do curso
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
